import { appConfig } from "@/config/app";
import type { Json } from "@/types/database";
import type { ClinicEngagementJobRow, ClinicNotificationDeliveryRow } from "./types";

type NotificationPatient = {
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
};

type NotificationAppointment = {
  scheduled_start?: string | null;
  status?: string | null;
};

type NotificationContext = {
  job: Pick<
    ClinicEngagementJobRow,
    "id" | "organization_id" | "patient_id" | "channel" | "job_type" | "payload" | "scheduled_for"
  >;
  patient?: NotificationPatient | null;
  appointment?: NotificationAppointment | null;
  treatmentRecord?: { follow_up_plan?: string | null } | null;
};

export type NotificationDeliveryStatus = "succeeded" | "failed";
export type NotificationRetryDecision = {
  shouldRetry: boolean;
  nextScheduledFor: string | null;
  maxAttemptsReached: boolean;
};

export const CLINIC_NOTIFICATION_MAX_ATTEMPTS = 3;

export type NotificationDeliveryPlan = {
  provider: string;
  recipient: string | null;
  subject: string | null;
  message: string;
  requestPayload: Record<string, Json>;
};

export type NotificationDeliveryResult = {
  status: NotificationDeliveryStatus;
  provider: string;
  recipient: string | null;
  subject: string | null;
  message: string;
  providerMessageId?: string | null;
  requestPayload: Record<string, Json>;
  responsePayload: Record<string, Json>;
  errorMessage?: string | null;
};

type DeliveryEnv = {
  smsWebhookUrl?: string;
  smsBearerToken?: string;
  emailWebhookUrl?: string;
  emailBearerToken?: string;
  callTaskWebhookUrl?: string;
  callTaskBearerToken?: string;
  fromEmail: string;
};

const RETRIABLE_ERROR_PATTERNS = [
  "http_429",
  "http_500",
  "http_502",
  "http_503",
  "http_504",
  "timeout",
  "network",
  "temporarily_unavailable",
  "rate_limit"
];

function getNotificationEnv(): DeliveryEnv {
  return {
    smsWebhookUrl: process.env.CLINIC_SMS_WEBHOOK_URL,
    smsBearerToken: process.env.CLINIC_SMS_WEBHOOK_BEARER_TOKEN,
    emailWebhookUrl: process.env.CLINIC_EMAIL_WEBHOOK_URL,
    emailBearerToken: process.env.CLINIC_EMAIL_WEBHOOK_BEARER_TOKEN,
    callTaskWebhookUrl: process.env.CLINIC_CALL_TASK_WEBHOOK_URL,
    callTaskBearerToken: process.env.CLINIC_CALL_TASK_WEBHOOK_BEARER_TOKEN,
    fromEmail: process.env.CLINIC_NOTIFICATION_FROM_EMAIL || appConfig.supportEmail
  };
}

function formatScheduledAt(iso: string | null | undefined) {
  if (!iso) return "Тов тодорхойгүй";
  return new Date(iso).toLocaleString("mn-MN");
}

function getJobLabel(jobType: string) {
  switch (jobType) {
    case "appointment_reminder_24h":
      return "appointment reminder 24h";
    case "appointment_reminder_2h":
      return "appointment reminder 2h";
    case "no_show_recovery_24h":
      return "no-show recovery";
    case "follow_up_24h":
      return "follow-up 24h";
    case "follow_up_7d":
      return "follow-up 7d";
    default:
      return jobType;
  }
}

export function buildNotificationDeliveryPlan(
  context: NotificationContext
): NotificationDeliveryPlan {
  const patientName = context.patient?.full_name ?? "Patient";
  const scheduledAt = formatScheduledAt(context.appointment?.scheduled_start ?? context.job.scheduled_for);
  const followUpPlan = context.treatmentRecord?.follow_up_plan ?? "Follow-up task";

  switch (context.job.channel) {
    case "sms":
      return {
        provider: "sms_webhook",
        recipient: context.patient?.phone ?? null,
        subject: null,
        message:
          context.job.job_type === "appointment_reminder_24h"
            ? `${patientName}, таны цаг ${scheduledAt}-д товлогдсон байна. UbBeauty-аас reminder.`
            : `${patientName}, UbBeauty reminder: ${getJobLabel(context.job.job_type)}.`,
        requestPayload: {
          channel: "sms",
          patientName,
          phone: context.patient?.phone ?? null,
          jobType: context.job.job_type,
          scheduledAt
        }
      };
    case "email":
      return {
        provider: "email_webhook",
        recipient: context.patient?.email ?? null,
        subject: "UbBeauty appointment reminder",
        message: `${patientName}, таны цаг ${scheduledAt}-д товлогдсон байна. Хэрэв цаг өөрчлөх бол clinic-тэй холбогдоно уу.`,
        requestPayload: {
          channel: "email",
          patientName,
          email: context.patient?.email ?? null,
          fromEmail: getNotificationEnv().fromEmail,
          jobType: context.job.job_type,
          scheduledAt
        }
      };
    case "call_task":
      return {
        provider: "call_task",
        recipient: context.patient?.phone ?? context.patient?.email ?? patientName,
        subject: "Front desk call task",
        message:
          context.job.job_type === "no_show_recovery_24h"
            ? `${patientName}-тай холбогдож no-show recovery хийнэ.`
            : `${patientName}-тай follow-up call хийнэ. ${followUpPlan}`,
        requestPayload: {
          channel: "call_task",
          patientName,
          phone: context.patient?.phone ?? null,
          email: context.patient?.email ?? null,
          jobType: context.job.job_type,
          scheduledAt,
          followUpPlan
        }
      };
    default:
      return {
        provider: "manual_queue",
        recipient: context.patient?.phone ?? context.patient?.email ?? patientName,
        subject: "Manual queue task",
        message: `${patientName}-тай ${getJobLabel(context.job.job_type)} ажлыг гараар гүйцэтгэнэ.`,
        requestPayload: {
          channel: context.job.channel,
          patientName,
          jobType: context.job.job_type,
          scheduledAt
        }
      };
  }
}

async function postNotificationWebhook(params: {
  url: string;
  bearerToken?: string;
  payload: Record<string, Json>;
}) {
  const response = await fetch(params.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(params.bearerToken ? { authorization: `Bearer ${params.bearerToken}` } : {})
    },
    body: JSON.stringify(params.payload)
  });

  let body: Record<string, Json> = {};
  try {
    body = (await response.json()) as Record<string, Json>;
  } catch {
    body = {};
  }

  return { ok: response.ok, status: response.status, body };
}

function getProviderMessageId(responsePayload: Record<string, Json>) {
  const value =
    responsePayload.messageId ??
    responsePayload.message_id ??
    responsePayload.id ??
    null;
  return typeof value === "string" ? value : null;
}

export function normalizeNotificationDeliveryStatus(status: string | null | undefined): NotificationDeliveryStatus | null {
  if (!status) return null;

  const normalized = status.trim().toLowerCase();
  if (["succeeded", "success", "delivered", "sent", "completed"].includes(normalized)) {
    return "succeeded";
  }

  if (["failed", "failure", "undelivered", "bounced", "rejected", "errored"].includes(normalized)) {
    return "failed";
  }

  return null;
}

export function isRetriableNotificationFailure(errorMessage: string | null | undefined) {
  if (!errorMessage) return false;

  const normalized = errorMessage.trim().toLowerCase();
  if (
    normalized.includes("recipient_missing") ||
    normalized.includes("provider_unconfigured") ||
    normalized.includes("mailbox unavailable") ||
    normalized.includes("invalid_recipient") ||
    normalized.includes("rejected")
  ) {
    return false;
  }

  return RETRIABLE_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function getNotificationRetryDecision(params: {
  attemptCount: number;
  nowIso: string;
  errorMessage?: string | null;
}): NotificationRetryDecision {
  if (!isRetriableNotificationFailure(params.errorMessage)) {
    return {
      shouldRetry: false,
      nextScheduledFor: null,
      maxAttemptsReached: params.attemptCount >= CLINIC_NOTIFICATION_MAX_ATTEMPTS
    };
  }

  if (params.attemptCount >= CLINIC_NOTIFICATION_MAX_ATTEMPTS) {
    return {
      shouldRetry: false,
      nextScheduledFor: null,
      maxAttemptsReached: true
    };
  }

  const retryDelays = [5, 15, 60];
  const delayMinutes = retryDelays[Math.max(0, params.attemptCount - 1)] ?? 60;
  const scheduled = new Date(new Date(params.nowIso).getTime() + delayMinutes * 60 * 1000).toISOString();

  return {
    shouldRetry: true,
    nextScheduledFor: scheduled,
    maxAttemptsReached: false
  };
}

export async function sendClinicNotification(
  context: NotificationContext
): Promise<NotificationDeliveryResult> {
  const env = getNotificationEnv();
  const plan = buildNotificationDeliveryPlan(context);

  if (!plan.recipient) {
    return {
      status: "failed",
      provider: plan.provider,
      recipient: null,
      subject: plan.subject,
      message: plan.message,
      requestPayload: plan.requestPayload,
      responsePayload: {},
      errorMessage: "recipient_missing"
    };
  }

  if (context.job.channel === "call_task" || context.job.channel === "manual_queue") {
    if (context.job.channel === "call_task" && env.callTaskWebhookUrl) {
      const webhook = await postNotificationWebhook({
        url: env.callTaskWebhookUrl,
        bearerToken: env.callTaskBearerToken,
        payload: plan.requestPayload
      });

      return webhook.ok
        ? {
            status: "succeeded",
            provider: "call_task_webhook",
            recipient: plan.recipient,
            subject: plan.subject,
            message: plan.message,
            providerMessageId: getProviderMessageId(webhook.body),
            requestPayload: plan.requestPayload,
            responsePayload: webhook.body
          }
        : {
            status: "failed",
            provider: "call_task_webhook",
            recipient: plan.recipient,
            subject: plan.subject,
            message: plan.message,
            requestPayload: plan.requestPayload,
            responsePayload: webhook.body,
            errorMessage: `call_task_http_${webhook.status}`
          };
    }

    return {
      status: "succeeded",
      provider: plan.provider,
      recipient: plan.recipient,
      subject: plan.subject,
      message: plan.message,
      requestPayload: plan.requestPayload,
      responsePayload: { queued: true }
    };
  }

  if (context.job.channel === "sms") {
    if (!env.smsWebhookUrl) {
      return {
        status: "failed",
        provider: "sms_webhook",
        recipient: plan.recipient,
        subject: plan.subject,
        message: plan.message,
        requestPayload: plan.requestPayload,
        responsePayload: {},
        errorMessage: "sms_provider_unconfigured"
      };
    }

    const webhook = await postNotificationWebhook({
      url: env.smsWebhookUrl,
      bearerToken: env.smsBearerToken,
      payload: plan.requestPayload
    });

    return webhook.ok
      ? {
          status: "succeeded",
          provider: "sms_webhook",
          recipient: plan.recipient,
          subject: plan.subject,
          message: plan.message,
          providerMessageId: getProviderMessageId(webhook.body),
          requestPayload: plan.requestPayload,
          responsePayload: webhook.body
        }
      : {
          status: "failed",
          provider: "sms_webhook",
          recipient: plan.recipient,
          subject: plan.subject,
          message: plan.message,
          requestPayload: plan.requestPayload,
          responsePayload: webhook.body,
          errorMessage: `sms_http_${webhook.status}`
        };
  }

  if (!env.emailWebhookUrl) {
    return {
      status: "failed",
      provider: "email_webhook",
      recipient: plan.recipient,
      subject: plan.subject,
      message: plan.message,
      requestPayload: plan.requestPayload,
      responsePayload: {},
      errorMessage: "email_provider_unconfigured"
    };
  }

  const webhook = await postNotificationWebhook({
    url: env.emailWebhookUrl,
    bearerToken: env.emailBearerToken,
    payload: plan.requestPayload
  });

  return webhook.ok
    ? {
        status: "succeeded",
        provider: "email_webhook",
        recipient: plan.recipient,
        subject: plan.subject,
        message: plan.message,
        providerMessageId: getProviderMessageId(webhook.body),
        requestPayload: plan.requestPayload,
        responsePayload: webhook.body
      }
    : {
        status: "failed",
        provider: "email_webhook",
        recipient: plan.recipient,
        subject: plan.subject,
        message: plan.message,
        requestPayload: plan.requestPayload,
        responsePayload: webhook.body,
        errorMessage: `email_http_${webhook.status}`
      };
}

export function toClinicNotificationDeliveryInsert(params: {
  organizationId: string;
  patientId: string;
  engagementJobId: string;
  result: NotificationDeliveryResult;
}): Omit<ClinicNotificationDeliveryRow, "id" | "created_at" | "attempted_at"> & {
  attempted_at: string;
} {
  return {
    organization_id: params.organizationId,
    patient_id: params.patientId,
    engagement_job_id: params.engagementJobId,
    channel: params.result.requestPayload.channel as string,
    provider: params.result.provider,
    recipient: params.result.recipient,
    subject: params.result.subject,
    body_preview: params.result.message.slice(0, 240),
    status: params.result.status,
    provider_message_id: params.result.providerMessageId ?? null,
    request_payload: params.result.requestPayload,
    response_payload: params.result.responsePayload,
    error_message: params.result.errorMessage ?? null,
    attempted_at: new Date().toISOString()
  };
}
