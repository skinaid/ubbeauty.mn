/**
 * Layer: payment_transaction row (initiated / later verified). Separate from invoice and webhook payload.
 */
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export async function insertInitiatedPaymentTransaction(params: {
  invoiceId: string;
  organizationId: string;
  amount: number;
  currency: string;
  rawPayload: Record<string, unknown>;
}): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("payment_transactions").insert({
    invoice_id: params.invoiceId,
    organization_id: params.organizationId,
    provider: "qpay",
    status: "initiated",
    amount: params.amount,
    currency: params.currency,
    raw_payload: params.rawPayload as unknown as Json
  });
  if (error) {
    throw error;
  }
}
