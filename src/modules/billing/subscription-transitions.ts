/**
 * Deterministic subscription transitions after provider-verified payment only.
 */
import type { Database } from "@/types/database";

type SubRow = Database["public"]["Tables"]["subscriptions"]["Row"];

const PRE_PAY_STATUSES: SubRow["status"][] = ["bootstrap_pending_billing"];
const UPGRADE_FROM_STATUSES: SubRow["status"][] = ["bootstrap_pending_billing", "active", "trialing"];

export function canApplyPaidPlanAfterVerification(current: SubRow, targetPlanId: string): { ok: true } | { ok: false; reason: string } {
  if (current.plan_id === targetPlanId && current.status === "active") {
    return { ok: false, reason: "already_active_on_plan" };
  }

  if (PRE_PAY_STATUSES.includes(current.status)) {
    return { ok: true };
  }

  if (UPGRADE_FROM_STATUSES.includes(current.status) && current.plan_id !== targetPlanId) {
    return { ok: true };
  }

  if (current.status === "active" && current.plan_id === targetPlanId) {
    return { ok: false, reason: "already_active_on_plan" };
  }

  return { ok: false, reason: `subscription_status_blocked:${current.status}` };
}

/** Monthly period end from verified payment time (calendar approximation). */
export function computeNextPeriodEnd(from: Date): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString();
}
