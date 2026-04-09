import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getNotificationRetryDecision,
  normalizeNotificationDeliveryStatus
} from "@/modules/clinic/notifications";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

type NotificationWebhookBody = {
  deliveryId?: string;
  providerMessageId?: string;
  provider?: string;
  status?: string;
  errorMessage?: string | null;
  responsePayload?: Record<string, unknown>;
};

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

export async function POST(request: Request) {
  const expectedToken =
    process.env.CLINIC_NOTIFICATION_CALLBACK_BEARER_TOKEN ??
    process.env.CLINIC_NOTIFICATION_WEBHOOK_BEARER_TOKEN;

  if (!expectedToken) {
    return NextResponse.json({ ok: false, error: "callback_token_unconfigured" }, { status: 503 });
  }

  if (getBearerToken(request) !== expectedToken) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: NotificationWebhookBody = {};
  try {
    body = (await request.json()) as NotificationWebhookBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const normalizedStatus = normalizeNotificationDeliveryStatus(body.status);
  if (!normalizedStatus) {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }

  if (!body.deliveryId && !body.providerMessageId) {
    return NextResponse.json({ ok: false, error: "missing_delivery_identifier" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    let deliveryQuery = supabase
      .from("clinic_notification_deliveries")
      .select("id,organization_id,engagement_job_id,provider,provider_message_id");

    deliveryQuery = body.deliveryId
      ? deliveryQuery.eq("id", body.deliveryId)
      : deliveryQuery.eq("provider_message_id", body.providerMessageId ?? "");

    if (body.provider) {
      deliveryQuery = deliveryQuery.eq("provider", body.provider);
    }

    const { data: delivery, error: deliveryError } = await deliveryQuery.maybeSingle();

    if (deliveryError) {
      return NextResponse.json({ ok: false, error: "delivery_lookup_failed" }, { status: 500 });
    }

    if (!delivery) {
      return NextResponse.json({ ok: false, error: "delivery_not_found" }, { status: 404 });
    }

    const responsePayload =
      ((body.responsePayload && typeof body.responsePayload === "object" ? body.responsePayload : body) as Json) ?? {};
    const errorMessage = typeof body.errorMessage === "string" ? body.errorMessage : null;
    const providerMessageId = body.providerMessageId ?? delivery.provider_message_id ?? null;

    const { error: updateDeliveryError } = await supabase
      .from("clinic_notification_deliveries")
      .update({
        status: normalizedStatus,
        error_message: errorMessage,
        provider_message_id: providerMessageId,
        response_payload: responsePayload
      })
      .eq("id", delivery.id)
      .eq("organization_id", delivery.organization_id);

    if (updateDeliveryError) {
      return NextResponse.json({ ok: false, error: "delivery_update_failed" }, { status: 500 });
    }

    const { count } = await supabase
      .from("clinic_notification_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", delivery.organization_id)
      .eq("engagement_job_id", delivery.engagement_job_id);

    const nowIso = new Date().toISOString();
    let jobStatus: "queued" | "succeeded" | "failed" = normalizedStatus;

    if (normalizedStatus === "succeeded") {
      await supabase
        .from("clinic_engagement_jobs")
        .update({
          status: "succeeded",
          finished_at: nowIso,
          outcome_notes: `${delivery.provider} callback confirmed delivery`
        })
        .eq("id", delivery.engagement_job_id)
        .eq("organization_id", delivery.organization_id);
    } else {
      const retryDecision = getNotificationRetryDecision({
        attemptCount: count ?? 1,
        nowIso,
        errorMessage
      });

      if (retryDecision.shouldRetry) {
        jobStatus = "queued";
        const nextScheduledFor = retryDecision.nextScheduledFor ?? nowIso;
        await supabase
          .from("clinic_engagement_jobs")
          .update({
            status: "queued",
            scheduled_for: nextScheduledFor,
            started_at: null,
            finished_at: null,
            outcome_notes: `${delivery.provider} callback failed: ${errorMessage ?? "unknown_error"} · retry scheduled`
          })
          .eq("id", delivery.engagement_job_id)
          .eq("organization_id", delivery.organization_id);
      } else {
        await supabase
          .from("clinic_engagement_jobs")
          .update({
            status: "failed",
            finished_at: nowIso,
            outcome_notes: `${delivery.provider} callback failed: ${errorMessage ?? "unknown_error"}`
          })
          .eq("id", delivery.engagement_job_id)
          .eq("organization_id", delivery.organization_id);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/schedule");
    revalidatePath("/patients");
    revalidatePath("/reports");

    return NextResponse.json({
      ok: true,
      deliveryId: delivery.id,
      engagementJobId: delivery.engagement_job_id,
      deliveryStatus: normalizedStatus,
      jobStatus
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "callback_unhandled_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
