/**
 * Billing reconciliation helpers (no cron): stale markers, safe operator re-verification entrypoint.
 */
import { insertBillingEvent } from "@/modules/billing/billing-events";
import { verifyInvoiceAndActivateSubscription } from "@/modules/billing/verify-payment";
import type { InvoiceRow } from "@/modules/billing/data";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type InvoiceReconciliationFlags = {
  /** Invoice `due_at` passed and still pending — customer may have abandoned or provider delayed. */
  pastDueWhilePending: boolean;
  /** Pending for a long time since creation (e.g. webhook/verification gaps). */
  oldPending: boolean;
};

const OLD_PENDING_MS = 3 * 24 * 60 * 60 * 1000;

export function computeInvoiceReconciliationFlags(
  invoice: Pick<InvoiceRow, "status" | "due_at" | "created_at">,
  now = new Date()
): InvoiceReconciliationFlags {
  const pastDueWhilePending = invoice.status === "pending" && new Date(invoice.due_at).getTime() < now.getTime();
  const created = new Date(invoice.created_at).getTime();
  const oldPending = invoice.status === "pending" && now.getTime() - created > OLD_PENDING_MS;
  return { pastDueWhilePending, oldPending };
}

export type PendingInvoiceReconciliationRow = InvoiceRow & {
  organizations?: { name: string; slug: string } | null;
};

export async function getPendingInvoicesForReconciliationOverview(
  limit = 40
): Promise<PendingInvoiceReconciliationRow[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("invoices")
    .select("*, organizations(name, slug)")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as PendingInvoiceReconciliationRow[];
}

/**
 * Idempotent: calls the same pipeline as webhooks (`verifyInvoiceAndActivateSubscription`).
 * Audited via billing_events + operator_audit (caller).
 */
export async function runInvoicePaymentReverification(params: {
  invoiceId: string;
  actorEmail: string;
}): Promise<Awaited<ReturnType<typeof verifyInvoiceAndActivateSubscription>>> {
  const admin = getSupabaseAdminClient();
  const { data: inv } = await admin.from("invoices").select("organization_id").eq("id", params.invoiceId).maybeSingle();

  await insertBillingEvent({
    organizationId: inv?.organization_id ?? null,
    invoiceId: params.invoiceId,
    eventType: "operator_payment_reverification",
    payload: {
      actor_email: params.actorEmail,
      note: "Manual/operator re-run of provider verification; idempotent with webhook path."
    }
  });

  return verifyInvoiceAndActivateSubscription(params.invoiceId);
}
