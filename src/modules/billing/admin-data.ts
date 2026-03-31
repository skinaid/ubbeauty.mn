/**
 * Cross-organization billing reads for internal ops (service role).
 */
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BillingEventRow, InvoiceRow, PaymentTransactionRow } from "@/modules/billing/data";

export type InvoiceWithOrg = InvoiceRow & {
  organizations?: { name: string; slug: string } | null;
};

export async function getGlobalRecentInvoices(limit = 30): Promise<InvoiceWithOrg[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("invoices")
    .select("*, organizations(name, slug)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as InvoiceWithOrg[];
}

export async function getGlobalRecentPaymentTransactions(limit = 40): Promise<PaymentTransactionRow[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("payment_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as PaymentTransactionRow[];
}

export async function getGlobalRecentBillingEvents(limit = 50): Promise<BillingEventRow[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("billing_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as BillingEventRow[];
}
