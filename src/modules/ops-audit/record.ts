/**
 * Operator/support action audit (service role). No user-facing RLS — internal ops tooling only.
 */
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

type AuditParams = {
  actorEmail: string;
  actionType: string;
  organizationId?: string | null;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
};

export async function recordOperatorAuditEvent(params: AuditParams): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("operator_audit_events").insert({
    actor_email: params.actorEmail,
    action_type: params.actionType,
    organization_id: params.organizationId ?? null,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    metadata: (params.metadata ?? {}) as unknown as Json
  });

  if (error) {
    throw error;
  }
}

/**
 * Best-effort audit write — logs failures instead of throwing.
 * Use in paths where audit failure must not mask the primary operation result.
 */
export async function safeRecordOperatorAuditEvent(params: AuditParams): Promise<void> {
  try {
    await recordOperatorAuditEvent(params);
  } catch (e) {
    console.error("[ops-audit] Audit write failed (non-fatal):", e instanceof Error ? e.message : e, params.actionType, params.resourceId);
  }
}
