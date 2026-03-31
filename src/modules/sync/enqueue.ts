/**
 * Create sync job rows (server-only, service role). Execution is separate.
 */
import { randomUUID } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";

type JobType = Database["public"]["Tables"]["meta_sync_jobs"]["Row"]["job_type"];

export async function enqueueMetaSyncJob(params: {
  organizationId: string;
  internalPageId: string;
  jobType: JobType;
  payload?: Record<string, unknown>;
}): Promise<string> {
  const admin = getSupabaseAdminClient();
  const idempotencyKey = `${params.jobType}:${params.internalPageId}:${randomUUID()}`;

  const { data, error } = await admin
    .from("meta_sync_jobs")
    .insert({
      organization_id: params.organizationId,
      meta_page_id: params.internalPageId,
      job_type: params.jobType,
      status: "queued",
      attempt_count: 0,
      idempotency_key: idempotencyKey,
      scheduled_at: new Date().toISOString(),
      payload: (params.payload ?? {}) as Json
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}
