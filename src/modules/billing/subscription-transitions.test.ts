import { describe, expect, it } from "vitest";
import { canApplyPaidPlanAfterVerification, computeNextPeriodEnd } from "./subscription-transitions";

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

describe("canApplyPaidPlanAfterVerification", () => {
  it("allows bootstrap_pending_billing → any plan", () => {
    const result = canApplyPaidPlanAfterVerification(makeSub({ status: "bootstrap_pending_billing" }), "plan-pro");
    expect(result).toEqual({ ok: true });
  });

  it("allows active subscription to upgrade to a different plan", () => {
    const result = canApplyPaidPlanAfterVerification(
      makeSub({ status: "active", plan_id: "plan-starter" }),
      "plan-pro"
    );
    expect(result).toEqual({ ok: true });
  });

  it("allows trialing subscription to upgrade", () => {
    const result = canApplyPaidPlanAfterVerification(
      makeSub({ status: "trialing", plan_id: "plan-starter" }),
      "plan-pro"
    );
    expect(result).toEqual({ ok: true });
  });

  it("rejects already active on the same plan", () => {
    const result = canApplyPaidPlanAfterVerification(
      makeSub({ status: "active", plan_id: "plan-pro" }),
      "plan-pro"
    );
    expect(result).toEqual({ ok: false, reason: "already_active_on_plan" });
  });

  it("rejects canceled subscriptions", () => {
    const result = canApplyPaidPlanAfterVerification(makeSub({ status: "canceled" }), "plan-pro");
    expect(result.ok).toBe(false);
    expect("reason" in result && result.reason).toContain("subscription_status_blocked");
  });

  it("rejects expired subscriptions", () => {
    const result = canApplyPaidPlanAfterVerification(makeSub({ status: "expired" }), "plan-pro");
    expect(result.ok).toBe(false);
  });

  it("rejects suspended subscriptions", () => {
    const result = canApplyPaidPlanAfterVerification(makeSub({ status: "suspended" }), "plan-pro");
    expect(result.ok).toBe(false);
  });
});

describe("computeNextPeriodEnd", () => {
  it("adds 30 days to the given date", () => {
    const from = new Date("2025-01-01T00:00:00Z");
    const result = computeNextPeriodEnd(from);
    expect(result).toBe(new Date("2025-01-31T00:00:00Z").toISOString());
  });

  it("handles month boundary rollover", () => {
    const from = new Date("2025-02-15T12:00:00Z");
    const result = computeNextPeriodEnd(from);
    const expected = new Date("2025-03-17T12:00:00Z").toISOString();
    expect(result).toBe(expected);
  });
});
