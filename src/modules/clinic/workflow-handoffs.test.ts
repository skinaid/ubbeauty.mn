import { describe, expect, it } from "vitest";
import {
  getBillingAuditHref,
  getCheckoutOpenHref,
  getScheduleHandoffState,
  isScheduleHandoffEligible
} from "./workflow-handoffs";

describe("isScheduleHandoffEligible", () => {
  it("allows arrived, in progress, and completed visits into the handoff queue", () => {
    expect(isScheduleHandoffEligible("arrived")).toBe(true);
    expect(isScheduleHandoffEligible("in_progress")).toBe(true);
    expect(isScheduleHandoffEligible("completed")).toBe(true);
    expect(isScheduleHandoffEligible("booked")).toBe(false);
  });
});

describe("getScheduleHandoffState", () => {
  it("returns checkout-ready state when a checkout already exists", () => {
    const state = getScheduleHandoffState({
      appointment: {
        id: "appt-1",
        patient_id: "patient-1",
        status: "completed"
      },
      checkout: {
        id: "checkout-1",
        status: "draft",
        payment_status: "partial"
      }
    });

    expect(state).toEqual({
      kind: "checkout_ready",
      badgeLabel: "draft / partial",
      links: [
        { href: "/patients/patient-1", label: "Patient CRM" },
        { href: "/checkout", label: "POS queue" }
      ]
    });
  });

  it("returns draft-ready state for completed visits without a checkout", () => {
    const state = getScheduleHandoffState({
      appointment: {
        id: "appt-2",
        patient_id: "patient-2",
        status: "completed"
      }
    });

    expect(state).toEqual({
      kind: "draft_ready",
      links: [
        { href: "/patients/patient-2", label: "Patient CRM" },
        { href: "/checkout", label: "POS queue" }
      ]
    });
  });

  it("returns waiting state for active visits that are not completed yet", () => {
    const state = getScheduleHandoffState({
      appointment: {
        id: "appt-3",
        patient_id: "patient-3",
        status: "arrived"
      }
    });

    expect(state).toEqual({
      kind: "waiting_for_completion",
      message: "Checkout нь completed дээр идэвхжинэ",
      links: [
        { href: "/patients/patient-3", label: "Patient CRM" },
        { href: "/checkout", label: "POS queue" }
      ]
    });
  });
});

describe("handoff route builders", () => {
  it("builds stable POS and billing links", () => {
    expect(getCheckoutOpenHref({ id: "checkout-9", payment_status: "partial" })).toBe(
      "/checkout?checkoutId=checkout-9"
    );
    expect(getBillingAuditHref({ id: "checkout-9", payment_status: "partial" })).toBe(
      "/billing?checkoutStatus=collecting#checkout-checkout-9"
    );
    expect(getBillingAuditHref({ id: "checkout-10", payment_status: "paid" })).toBe(
      "/billing?checkoutStatus=paid#checkout-checkout-10"
    );
  });
});
