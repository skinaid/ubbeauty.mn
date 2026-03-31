/**
 * Layer: analysis_jobs enqueue (service role). Supports post-sync idempotency and independent manual runs.
 */
import { randomUUID } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type AnalysisJobTrigger = "post_sync" | "manual_regenerate" | "scheduled";

async function insertAnalysisJobRow(params: {
  organizationId: string;
  internalPageId: string;
  sourceSyncJobId: string | null;
  idempotencyKey: string;
  payload: Record<string, unknown>;
}): Promise<string | null> {
  const admin = getSupabaseAdminClient();
  const payloadJson = params.payload as unknown as Json;

  const { data, error } = await admin
    .from("analysis_jobs")
    .insert({
      organization_id: params.organizationId,
      meta_page_id: params.internalPageId,
      source_sync_job_id: params.sourceSyncJobId,
      status: "queued",
      attempt_count: 0,
      idempotency_key: params.idempotencyKey,
      scheduled_at: new Date().toISOString(),
      payload: payloadJson
    })
    .select("id")
    .single();

  if (error) {
    const code = (error as { code?: string }).code;
    const msg = typeof error.message === "string" ? error.message : "";
    if (code === "23505" || msg.toLowerCase().includes("duplicate")) {
      const { data: existing, error: readErr } = await admin
        .from("analysis_jobs")
        .select("id")
        .eq("idempotency_key", params.idempotencyKey)
        .maybeSingle();
      if (readErr || !existing) {
        return null;
      }
      return existing.id;
    }
    throw error;
  }

  return data.id;
}

/** One analysis job per successful sync job (idempotent). */
export async function enqueueAnalysisJobAfterSync(params: {
  organizationId: string;
  internalPageId: string;
  sourceSyncJobId: string;
}): Promise<string | null> {
  return insertAnalysisJobRow({
    organizationId: params.organizationId,
    internalPageId: params.internalPageId,
    sourceSyncJobId: params.sourceSyncJobId,
    idempotencyKey: `post_sync:${params.sourceSyncJobId}`,
    payload: {
      trigger: "post_sync" satisfies AnalysisJobTrigger,
      source_sync_job_id: params.sourceSyncJobId
    }
  });
}

/** Regenerate analysis from current DB metrics without re-running Meta sync. New job each call. */
export async function enqueueManualRegenerateAnalysisJob(params: {
  organizationId: string;
  internalPageId: string;
}): Promise<string> {
  const id = await insertAnalysisJobRow({
    organizationId: params.organizationId,
    internalPageId: params.internalPageId,
    sourceSyncJobId: null,
    idempotencyKey: `manual_regen:${params.internalPageId}:${randomUUID()}`,
    payload: {
      trigger: "manual_regenerate" satisfies AnalysisJobTrigger
    }
  });
  if (!id) {
    throw new Error("Failed to enqueue manual analysis job");
  }
  return id;
}

/** Reserved for Phase 7+ schedulers (cron/queue). Same executeAnalysisJob entrypoint. */
export async function enqueueScheduledAnalysisJob(params: {
  organizationId: string;
  internalPageId: string;
  scheduledForLabel: string;
}): Promise<string> {
  const id = await insertAnalysisJobRow({
    organizationId: params.organizationId,
    internalPageId: params.internalPageId,
    sourceSyncJobId: null,
    idempotencyKey: `scheduled:${params.internalPageId}:${params.scheduledForLabel}:${randomUUID()}`,
    payload: {
      trigger: "scheduled" satisfies AnalysisJobTrigger,
      scheduled_for: params.scheduledForLabel
    }
  });
  if (!id) {
    throw new Error("Failed to enqueue scheduled analysis job");
  }
  return id;
}
