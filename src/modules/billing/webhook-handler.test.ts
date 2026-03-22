import { describe, expect, it } from "vitest";
import { extractProviderDedupeKey } from "./webhook-handler";

describe("extractProviderDedupeKey", () => {
  it("extracts key from payment_id", () => {
    expect(extractProviderDedupeKey({ payment_id: "PAY123" })).toBe("qpay:payment:PAY123");
  });

  it("extracts key from paymentId (camelCase)", () => {
    expect(extractProviderDedupeKey({ paymentId: "PAY456" })).toBe("qpay:payment:PAY456");
  });

  it("prefers payment_id over invoice_id", () => {
    expect(extractProviderDedupeKey({ payment_id: "PAY1", invoice_id: "INV1" })).toBe("qpay:payment:PAY1");
  });

  it("falls back to invoice_id when no payment_id", () => {
    expect(extractProviderDedupeKey({ invoice_id: "INV789" })).toBe("qpay:invoice_event:INV789");
  });

  it("falls back to invoiceId (camelCase)", () => {
    expect(extractProviderDedupeKey({ invoiceId: "INV012" })).toBe("qpay:invoice_event:INV012");
  });

  it("returns null for empty object", () => {
    expect(extractProviderDedupeKey({})).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(extractProviderDedupeKey(null)).toBeNull();
    expect(extractProviderDedupeKey(undefined)).toBeNull();
    expect(extractProviderDedupeKey("string")).toBeNull();
    expect(extractProviderDedupeKey(42)).toBeNull();
  });

  it("returns null for array input", () => {
    expect(extractProviderDedupeKey([1, 2, 3])).toBeNull();
  });

  it("ignores empty string payment_id", () => {
    expect(extractProviderDedupeKey({ payment_id: "" })).toBeNull();
  });

  it("handles numeric payment_id", () => {
    expect(extractProviderDedupeKey({ payment_id: 12345 })).toBe("qpay:payment:12345");
  });
});
