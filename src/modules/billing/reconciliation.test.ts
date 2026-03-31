import { describe, expect, it } from "vitest";
import { computeInvoiceReconciliationFlags } from "./reconciliation";

describe("computeInvoiceReconciliationFlags", () => {
  const base = {
    status: "pending" as const,
    due_at: "2099-01-01T00:00:00.000Z",
    created_at: "2099-01-01T00:00:00.000Z"
  };

  it("flags past-due pending invoices", () => {
    const now = new Date("2020-06-01T00:00:00.000Z");
    const flags = computeInvoiceReconciliationFlags(
      { ...base, due_at: "2020-01-01T00:00:00.000Z", created_at: "2019-01-01T00:00:00.000Z" },
      now
    );
    expect(flags.pastDueWhilePending).toBe(true);
  });

  it("flags pending older than 3 days", () => {
    const now = new Date("2020-06-04T12:00:00.000Z");
    const flags = computeInvoiceReconciliationFlags(
      { ...base, due_at: "2099-01-01T00:00:00.000Z", created_at: "2020-06-01T00:00:00.000Z" },
      now
    );
    expect(flags.oldPending).toBe(true);
  });

  it("does not flag non-pending rows", () => {
    const now = new Date("2020-06-10T00:00:00.000Z");
    const flags = computeInvoiceReconciliationFlags(
      {
        status: "paid",
        due_at: "2020-01-01T00:00:00.000Z",
        created_at: "2019-01-01T00:00:00.000Z"
      },
      now
    );
    expect(flags.pastDueWhilePending).toBe(false);
    expect(flags.oldPending).toBe(false);
  });
});
