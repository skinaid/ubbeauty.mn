import { describe, expect, it } from "vitest";
import {
  filterAndSortCheckoutQueue,
  getCheckoutOutstandingAmount,
  type QueueCheckout
} from "./checkout-queue";

const baseCheckouts: QueueCheckout[] = [
  {
    id: "checkout-1",
    currency: "MNT",
    total: 200000,
    payments: [{ amount: 50000, payment_kind: "card" }],
    payment_status: "partial",
    status: "open",
    patient: { full_name: "Anu" },
    appointment: {
      scheduled_start: "2026-04-04T01:00:00.000Z",
      staff_member: { full_name: "Dr. Saraa" },
      location: { name: "Central" }
    }
  },
  {
    id: "checkout-2",
    currency: "MNT",
    total: 120000,
    payments: [{ amount: 120000, payment_kind: "cash" }],
    payment_status: "paid",
    status: "closed",
    patient: { full_name: "Bataa" },
    appointment: {
      scheduled_start: "2026-04-04T06:30:00.000Z",
      staff_member: { full_name: "Dr. Saraa" },
      location: { name: "Central" }
    }
  },
  {
    id: "checkout-3",
    currency: "MNT",
    total: 180000,
    payments: [],
    payment_status: "pending",
    status: "voided",
    patient: { full_name: "Cece" },
    appointment: {
      scheduled_start: "2026-04-04T11:30:00.000Z",
      staff_member: { full_name: "Dr. Enkh" },
      location: { name: "River" }
    }
  }
];

describe("getCheckoutOutstandingAmount", () => {
  it("subtracts refunds from paid totals and never returns a negative balance", () => {
    const outstanding = getCheckoutOutstandingAmount({
      id: "checkout-refund",
      currency: "MNT",
      total: 100000,
      payments: [
        { amount: 90000, payment_kind: "card" },
        { amount: 10000, payment_kind: "refund" }
      ]
    });

    expect(outstanding).toBe(20000);
  });
});

describe("filterAndSortCheckoutQueue", () => {
  it("prioritizes biggest outstanding balance before older visits", () => {
    const queue = filterAndSortCheckoutQueue({
      checkouts: baseCheckouts,
      query: "",
      statusFilter: "all",
      providerFilter: "all",
      locationFilter: "all",
      timeFilter: "all",
      sortMode: "priority_balance"
    });

    expect(queue.map((checkout) => checkout.id)).toEqual([
      "checkout-3",
      "checkout-1",
      "checkout-2"
    ]);
  });

  it("filters queue by operational status, provider, location, time, and query", () => {
    const queue = filterAndSortCheckoutQueue({
      checkouts: baseCheckouts,
      query: "anu",
      statusFilter: "collecting",
      providerFilter: "Dr. Saraa",
      locationFilter: "Central",
      timeFilter: "morning",
      sortMode: "alphabetical"
    });

    expect(queue.map((checkout) => checkout.id)).toEqual(["checkout-1"]);
  });

  it("supports paid and voided views with stable visit ordering", () => {
    const paidQueue = filterAndSortCheckoutQueue({
      checkouts: baseCheckouts,
      query: "",
      statusFilter: "paid",
      providerFilter: "all",
      locationFilter: "all",
      timeFilter: "all",
      sortMode: "oldest"
    });
    const voidedQueue = filterAndSortCheckoutQueue({
      checkouts: baseCheckouts,
      query: "",
      statusFilter: "voided",
      providerFilter: "all",
      locationFilter: "all",
      timeFilter: "evening",
      sortMode: "newest"
    });

    expect(paidQueue.map((checkout) => checkout.id)).toEqual(["checkout-2"]);
    expect(voidedQueue.map((checkout) => checkout.id)).toEqual(["checkout-3"]);
  });
});
