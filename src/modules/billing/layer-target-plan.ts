/**
 * Layer: selected target plan for checkout (intent only).
 * Does not touch `subscriptions`; paid activation happens only after verified payment.
 */
import type { Database } from "@/types/database";

type PlanRow = Database["public"]["Tables"]["plans"]["Row"];
type SubRow = Database["public"]["Tables"]["subscriptions"]["Row"];

/** Snapshot of what the customer is paying for; frozen onto `invoices.target_plan_id` + amount. */
export type CheckoutTargetPlanSnapshot = {
  planId: string;
  planCode: string;
  planName: string;
  amount: number;
  currency: string;
};

export function buildCheckoutTargetPlanSnapshot(plan: PlanRow): CheckoutTargetPlanSnapshot {
  return {
    planId: plan.id,
    planCode: plan.code,
    planName: plan.name,
    amount: Number(plan.price_monthly),
    currency: plan.currency
  };
}

/** Validates that starting checkout for this target plan is allowed; never mutates subscription. */
export function validateCheckoutTargetAgainstSubscription(params: {
  subscription: SubRow;
  target: CheckoutTargetPlanSnapshot;
}): { ok: true } | { ok: false; reason: string } {
  if (["canceled", "expired", "suspended"].includes(params.subscription.status)) {
    return { ok: false, reason: "subscription_not_payable" };
  }
  if (params.subscription.status === "active" && params.subscription.plan_id === params.target.planId) {
    return { ok: false, reason: "already_on_plan" };
  }
  if (params.target.planCode === "starter" && params.subscription.status !== "bootstrap_pending_billing") {
    return { ok: false, reason: "starter_checkout_requires_bootstrap" };
  }
  if (params.target.amount <= 0) {
    return { ok: false, reason: "target_plan_not_paid" };
  }
  return { ok: true };
}
