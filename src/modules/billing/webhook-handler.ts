/**
 * QPay callback: authenticate → record provider delivery (audit) → always run verification pipeline.
 * Duplicate provider events are logged separately; activation remains idempotent via conditional invoice update.
 *
 * QPay V2 does not support HMAC request signing. Authentication relies on a per-invoice
 * random token embedded in the callback URL. This is an accepted limitation of the QPay V2 API.
 */
import { timingSafeEqual } from "crypto";
import { insertBillingEvent } from "@/modules/billing/billing-events";
import { verifyInvoiceAndActivateSubscription } from "@/modules/billing/verify-payment";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function safeTimingCompare(a: string, b: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

/** Best-effort billing event — never throws. */
async function safeBillingEvent(...args: Parameters<typeof insertBillingEvent>): Promise<string | null> {
  try {
    return await insertBillingEvent(...args);
  } catch (e) {
    console.error("[webhook] Billing event write failed (non-fatal):", e instanceof Error ? e.message : e);
    return null;
  }
}

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

export function extractProviderDedupeKey(body: unknown): string | null {
  const o = asRecord(body);
  const paymentId = o.payment_id ?? o.paymentId;
  if (paymentId != null && String(paymentId).length > 0) {
    return `qpay:payment:${String(paymentId)}`;
  }
  const inv = o.invoice_id ?? o.invoiceId;
  if (inv != null && String(inv).length > 0) {
    return `qpay:invoice_event:${String(inv)}`;
  }
  return null;
}

export async function handleQPayWebhookRequest(params: {
  invoiceIdFromQuery: string | null;
  tokenFromQuery: string | null;
  rawBodyText: string;
  parsedBody: unknown;
}): Promise<{ httpStatus: number; body: Record<string, unknown> }> {
  const invoiceId = params.invoiceIdFromQuery;
  if (!invoiceId) {
    await insertBillingEvent({
      organizationId: null,
      invoiceId: null,
      eventType: "webhook_rejected",
      payload: { reason: "missing_invoice_id", snippet: params.rawBodyText.slice(0, 500) },
      processingError: "missing_invoice_id"
    });
    return { httpStatus: 400, body: { ok: false, error: "missing_invoice_id" } };
  }

  const admin = getSupabaseAdminClient();
  const { data: invoice, error } = await admin.from("invoices").select("*").eq("id", invoiceId).maybeSingle();

  if (error || !invoice) {
    await insertBillingEvent({
      organizationId: null,
      invoiceId,
      eventType: "webhook_unknown_invoice",
      payload: { parsed: params.parsedBody },
      processingError: "invoice_not_found"
    });
    return { httpStatus: 404, body: { ok: false, error: "invoice_not_found" } };
  }

  const expectedToken = invoice.webhook_verify_token ?? "";
  const providedToken = params.tokenFromQuery ?? "";
  const tokenValid = expectedToken.length > 0 &&
    providedToken.length === expectedToken.length &&
    safeTimingCompare(providedToken, expectedToken);
  if (!tokenValid) {
    await insertBillingEvent({
      organizationId: invoice.organization_id,
      invoiceId,
      eventType: "webhook_rejected",
      payload: { reason: "bad_token" },
      processingError: "bad_token"
    });
    return { httpStatus: 401, body: { ok: false, error: "unauthorized" } };
  }

  const dedupe = extractProviderDedupeKey(params.parsedBody);

  const inserted = await safeBillingEvent({
    organizationId: invoice.organization_id,
    invoiceId,
    eventType: "webhook_received",
    providerEventId: dedupe,
    payload: {
      parsed: params.parsedBody,
      raw_length: params.rawBodyText.length
    }
  });

  if (inserted === null && dedupe) {
    await safeBillingEvent({
      organizationId: invoice.organization_id,
      invoiceId,
      eventType: "webhook_provider_duplicate_delivery",
      payload: {
        dedupe,
        parsed: params.parsedBody,
        note: "Same provider_event_id as a prior webhook_received; still running verification for retries / late payment."
      }
    });
  }

  const result = await verifyInvoiceAndActivateSubscription(invoiceId);

  const processedAt = new Date().toISOString();
  if (result.status === "verification_failed" || result.status === "qpay_not_configured") {
    await safeBillingEvent({
      organizationId: invoice.organization_id,
      invoiceId,
      eventType: "webhook_verification_failed",
      providerEventId: dedupe,
      payload: { result },
      processingError: result.status === "verification_failed" ? result.reason : "qpay_not_configured",
      processedAt
    });
  } else if (result.status === "not_paid_yet") {
    await safeBillingEvent({
      organizationId: invoice.organization_id,
      invoiceId,
      eventType: "webhook_payment_pending",
      providerEventId: dedupe,
      payload: { result },
      processedAt
    });
  }

  const isSuccess = result.status === "activated" || result.status === "already_finalized" || result.status === "not_paid_yet";

  return {
    httpStatus: 200,
    body: {
      ok: isSuccess,
      result: result.status,
      duplicate_provider_event: inserted === null && Boolean(dedupe)
    }
  };
}
