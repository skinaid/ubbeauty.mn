/**
 * Layer: provider verification only (QPay payment/check). No subscription writes.
 */
import { getQPayEnv } from "@/modules/billing/qpay-env";
import {
  qpayCheckInvoicePayments,
  type QPayPaidRow,
  type QPayPaymentCheckResult
} from "@/modules/billing/qpay-client";
import type { Database } from "@/types/database";

type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];

const AMOUNT_EPS = 0.01;

function num(v: string | number): number {
  return typeof v === "number" ? v : parseFloat(v);
}

export type ProviderVerificationSuccess = {
  kind: "paid";
  paidAmount: number;
  check: QPayPaymentCheckResult;
  paidRow: QPayPaymentCheckResult["rows"][0] | null;
};

export type ProviderVerificationOutcome =
  | ProviderVerificationSuccess
  | { kind: "not_paid_yet"; check: QPayPaymentCheckResult }
  | { kind: "qpay_unconfigured" }
  | { kind: "qpay_error"; message: string }
  | { kind: "currency_mismatch"; check: QPayPaymentCheckResult; paidRow: QPayPaidRow }
  | { kind: "amount_insufficient"; check: QPayPaymentCheckResult; paidAmount: number; expected: number };

/**
 * Calls QPay and interprets result against the invoice amount/currency. Idempotent / read-only w.r.t. our DB.
 */
export async function runProviderVerificationForInvoice(invoice: InvoiceRow): Promise<ProviderVerificationOutcome> {
  const env = getQPayEnv();
  if (!env) {
    return { kind: "qpay_unconfigured" };
  }
  if (!invoice.provider_invoice_id) {
    return { kind: "qpay_error", message: "no_provider_invoice_id" };
  }

  let check: QPayPaymentCheckResult;
  try {
    check = await qpayCheckInvoicePayments(env, invoice.provider_invoice_id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { kind: "qpay_error", message: msg };
  }

  const paidRow = check.rows.find((r) => r.payment_status === "PAID") ?? null;

  if (paidRow) {
    const paidAmount = num(paidRow.payment_amount);
    if (paidRow.payment_currency && paidRow.payment_currency !== invoice.currency) {
      return { kind: "currency_mismatch", check, paidRow };
    }
    if (paidAmount + AMOUNT_EPS < num(invoice.amount)) {
      return { kind: "amount_insufficient", check, paidAmount, expected: num(invoice.amount) };
    }
    return { kind: "paid", paidAmount, check, paidRow };
  }

  if (check.paidAmount + AMOUNT_EPS >= num(invoice.amount)) {
    return { kind: "paid", paidAmount: check.paidAmount, check, paidRow: null };
  }

  return { kind: "not_paid_yet", check };
}
