import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildNotificationDeliveryPlan,
  getNotificationRetryDecision,
  isRetriableNotificationFailure,
  normalizeNotificationDeliveryStatus,
  sendClinicNotification
} from "./notifications";

describe("clinic notifications", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("builds sms reminder content", () => {
    const plan = buildNotificationDeliveryPlan({
      job: {
        id: "job-1",
        organization_id: "org-1",
        patient_id: "patient-1",
        channel: "sms",
        job_type: "appointment_reminder_24h",
        payload: {},
        scheduled_for: "2026-04-05T02:00:00.000Z"
      },
      patient: {
        full_name: "Anu Tsog",
        phone: "99112233"
      },
      appointment: {
        scheduled_start: "2026-04-06T02:00:00.000Z",
        status: "confirmed"
      }
    });

    expect(plan.provider).toBe("sms_webhook");
    expect(plan.recipient).toBe("99112233");
    expect(plan.message).toContain("Anu Tsog");
  });

  it("fails sms delivery when provider is not configured", async () => {
    const result = await sendClinicNotification({
      job: {
        id: "job-1",
        organization_id: "org-1",
        patient_id: "patient-1",
        channel: "sms",
        job_type: "appointment_reminder_24h",
        payload: {},
        scheduled_for: "2026-04-05T02:00:00.000Z"
      },
      patient: {
        full_name: "Anu Tsog",
        phone: "99112233"
      }
    });

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("sms_provider_unconfigured");
  });

  it("succeeds manual call task delivery without webhook", async () => {
    const result = await sendClinicNotification({
      job: {
        id: "job-2",
        organization_id: "org-1",
        patient_id: "patient-1",
        channel: "call_task",
        job_type: "follow_up_24h",
        payload: {},
        scheduled_for: "2026-04-05T02:00:00.000Z"
      },
      patient: {
        full_name: "Cecilia Bold",
        phone: "88119922"
      },
      treatmentRecord: {
        follow_up_plan: "24 цагийн дараа check хийх"
      }
    });

    expect(result.status).toBe("succeeded");
    expect(result.provider).toBe("call_task");
  });

  it("posts sms webhook when configured", async () => {
    vi.stubEnv("CLINIC_SMS_WEBHOOK_URL", "https://example.com/sms");
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ messageId: "sms-123" }), { status: 200 })
      );

    const result = await sendClinicNotification({
      job: {
        id: "job-3",
        organization_id: "org-1",
        patient_id: "patient-1",
        channel: "sms",
        job_type: "appointment_reminder_24h",
        payload: {},
        scheduled_for: "2026-04-05T02:00:00.000Z"
      },
      patient: {
        full_name: "Dulmaa T",
        phone: "77112233"
      }
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("succeeded");
    expect(result.providerMessageId).toBe("sms-123");
  });

  it("normalizes provider callback statuses", () => {
    expect(normalizeNotificationDeliveryStatus("delivered")).toBe("succeeded");
    expect(normalizeNotificationDeliveryStatus("FAILED")).toBe("failed");
    expect(normalizeNotificationDeliveryStatus("processing")).toBeNull();
  });

  it("classifies retriable failures and computes retry schedule", () => {
    expect(isRetriableNotificationFailure("sms_http_503")).toBe(true);
    expect(isRetriableNotificationFailure("mailbox unavailable")).toBe(false);

    const retry = getNotificationRetryDecision({
      attemptCount: 1,
      nowIso: "2026-04-04T10:00:00.000Z",
      errorMessage: "sms_http_503"
    });

    expect(retry.shouldRetry).toBe(true);
    expect(retry.maxAttemptsReached).toBe(false);
    expect(retry.nextScheduledFor).toBe("2026-04-04T10:05:00.000Z");

    const exhausted = getNotificationRetryDecision({
      attemptCount: 3,
      nowIso: "2026-04-04T10:00:00.000Z",
      errorMessage: "sms_http_503"
    });

    expect(exhausted.shouldRetry).toBe(false);
    expect(exhausted.maxAttemptsReached).toBe(true);
  });
});
