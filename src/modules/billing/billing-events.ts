/**
 * Append-only billing audit log (server / service role).
 */
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export async function insertBillingEvent(params: {
  organizationId: string | null;
  invoiceId: string | null;
  eventType: string;
  providerEventId?: string | null;
  payload: Record<string, unknown>;
  processingError?: string | null;
  processedAt?: string | null;
}): Promise<string | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("billing_events")
    .insert({
      organization_id: params.organizationId,
      invoice_id: params.invoiceId,
      event_type: params.eventType,
      provider_event_id: params.providerEventId ?? null,
      payload: params.payload as unknown as Json,
      processing_error: params.processingError ?? null,
      processed_at: params.processedAt ?? null
    })
    .select("id")
    .single();

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      return null;
    }
    throw error;
  }

  return data.id;
}
