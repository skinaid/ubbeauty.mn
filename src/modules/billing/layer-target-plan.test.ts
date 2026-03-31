import { describe, expect, it } from "vitest";
import { validateCheckoutTargetAgainstSubscription, buildCheckoutTargetPlanSnapshot } from "./layer-target-plan";

function makeSub(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    organization_id: "org-1",
    plan_id: "plan-starter",
    status: "bootstrap_pending_billing" as const,
    current_period_start: "2025-01-01T00:00:00Z",
    current_period_end: "2025-02-01T00:00:00Z",
    cancel_at_period_end: false,
    trial_ends_at: null,
    last_billed_at: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides
  };
}

const proTarget = {
  planId: "plan-pro",
  planCode: "pro",
  planName: "Pro",
  amount: 49000,
  currency: "MNT"
};

const starterTarget = {
  planId: "plan-starter",
  planCode: "starter",
  planName: "Starter",
  amount: 29000,
  currency: "MNT"
};

describe("validateCheckoutTargetAgainstSubscription", () => {
  it("allows bootstrap subscription to checkout for a paid plan", () => {
    const result = validateCheckoutTargetAgainstSubscription({
      subscription: makeSub({ status: "bootstrap_pending_billing" }),
      target: proTarget
    });
    expect(result).toEqual({ ok: true });
  });

  it("allows active subscription to upgrade to a different plan", () => {
    const result = validateCheckoutTargetAgainstSubscription({
      subscription: makeSub({ status: "active", plan_id: "plan-starter" }),
      target: proTarget
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects checkout for a plan the subscription is already on", () => {
    const result = validateCheckoutTargetAgainstSubscription({
      subscription: makeSub({ status: "active", plan_id: "plan-pro" }),
      target: proTarget
    });
    expect(result).toEqual({ ok: false, reason: "already_on_plan" });
  });

  it("rejects canceled subscription", () => {
    const result = validateCheckoutTargetAgainstSubscription({
      subscription: makeSub({ status: "canceled" }),
      target: proTarget
    });
    expect(result).toEqual({ ok: false, reason: "subscription_not_payable" });
  });

  it("rejects expired subscription", () => {
    const result = validateCheckoutTargetAgainstSubscription({
      subscription: makeSub({ status: "expired" }),
      target: proTarget
    });
    expect(result).toEqual({ ok: false, reason: "subscription_not_payable" });
  });

  it("rejects suspended subscription", () => {
    const result = validateCheckoutTargetAgainstSubscription({
      subscription: makeSub({ status: "suspended" }),
      target: proTarget
    });
    expect(result).toEqual({ ok: false, reason: "subscription_not_payable" });
  });

  it("rejects starter plan checkout for non-bootstrap subscription", () => {
    const result = validateCheckoutTargetAgainstSubscription({
      subscription: makeSub({ status: "active", plan_id: "plan-pro" }),
      target: starterTarget
    });
    expect(result).toEqual({ ok: false, reason: "starter_checkout_requires_bootstrap" });
  });

  it("rejects free/zero-amount target plan", () => {
    const result = validateCheckoutTargetAgainstSubscription({
      subscription: makeSub(),
      target: { ...proTarget, amount: 0 }
    });
    expect(result).toEqual({ ok: false, reason: "target_plan_not_paid" });
  });
});

describe("buildCheckoutTargetPlanSnapshot", () => {
  it("extracts the correct fields from a plan row", () => {
    const plan = {
      id: "plan-pro",
      code: "pro",
      name: "Pro",
      price_monthly: "49000",
      currency: "MNT",
      is_active: true,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
      description: null,
      features: null,
      limits: null,
      sort_order: 1
    };
    const snapshot = buildCheckoutTargetPlanSnapshot(plan as never);
    expect(snapshot).toEqual({
      planId: "plan-pro",
      planCode: "pro",
      planName: "Pro",
      amount: 49000,
      currency: "MNT"
    });
  });
});
