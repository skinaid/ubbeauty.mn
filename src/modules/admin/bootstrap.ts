/**
 * One-time bootstrap for the *first* row(s) in `system_admins` while the table
 * is still empty (COUNT(*) = 0). Only callers whose email is in
 * `MARTECH_INTERNAL_OPS_EMAILS` may insert.
 *
 * After any row exists, this function becomes a no-op — it does NOT add
 * further allowlisted users automatically. Additional admins must be inserted
 * into `system_admins` (SQL, future UI, or future migration). The env allowlist
 * is not consulted again for elevation once the table is non-empty.
 *
 * Concurrent access:
 * - Same user, parallel requests: INSERT may race on UNIQUE(user_id); we
 *   re-fetch by user_id after failure so one path still succeeds.
 * - Different users, both allowlisted, both see COUNT=0: both may INSERT before
 *   either commit, yielding multiple initial super_admins. Rare; acceptable for
 *   small ops teams. Stricter single-winner behavior would require a DB lock
 *   or RPC (deferred).
 *
 * Schema: `supabase/migrations/202603220012_system_admins.sql` (single source of truth).
 */
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isInternalOpsEmail } from "@/lib/internal-ops";
import { safeRecordOperatorAuditEvent } from "@/modules/ops-audit/record";

export async function maybeBootstrapSystemAdmin(
  userId: string,
  email: string
): Promise<{ id: string; role: "super_admin" } | null> {
  if (!isInternalOpsEmail(email)) return null;

  const admin = getSupabaseAdminClient();

  const { count, error: countErr } = await admin
    .from("system_admins")
    .select("*", { count: "exact", head: true });

  if (countErr) {
    console.warn("[admin/bootstrap] Count query failed:", countErr.message);
    return null;
  }

  if ((count ?? 0) > 0) {
    return null;
  }

  const { data, error } = await admin
    .from("system_admins")
    .insert({
      user_id: userId,
      email: email.toLowerCase(),
      role: "super_admin" as const,
      status: "active" as const,
      granted_by: "system_bootstrap"
    })
    .select("id,role")
    .single();

  if (!error && data) {
    await safeRecordOperatorAuditEvent({
      actorEmail: email.toLowerCase(),
      actionType: "system_admin_bootstrap",
      organizationId: null,
      resourceType: "system_admin",
      resourceId: data.id,
      metadata: { source: "env_allowlist_empty_table", user_id: userId }
    });
    console.info("[admin/bootstrap] Bootstrapped first system admin:", email);
    return data as { id: string; role: "super_admin" };
  }

  const reFetched = await fetchActiveAdminByUserId(userId);
  if (reFetched) {
    console.info("[admin/bootstrap] Resolved concurrent bootstrap via re-fetch:", email);
    return reFetched;
  }

  console.warn("[admin/bootstrap] Bootstrap insert failed:", error?.message ?? "unknown");
  return null;
}

async function fetchActiveAdminByUserId(
  userId: string
): Promise<{ id: string; role: "super_admin" } | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("system_admins")
    .select("id,role,status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data || data.status !== "active") {
    return null;
  }
  return { id: data.id, role: data.role as "super_admin" };
}
