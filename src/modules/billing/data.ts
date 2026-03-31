/**
 * Customer-visible billing reads (RLS + org owner).
 */
import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import type { Database } from "@/types/database";

export type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
export type PaymentTransactionRow = Database["public"]["Tables"]["payment_transactions"]["Row"];
export type BillingEventRow = Database["public"]["Tables"]["billing_events"]["Row"];

export const getRecentInvoicesForCurrentUserOrg = cache(
  async (userId: string, limit = 20): Promise<InvoiceRow[]> => {
    const org = await getCurrentUserOrganization(userId);
    if (!org) {
      return [];
    }

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? []) as InvoiceRow[];
  }
);

export const getRecentPaymentTransactionsForCurrentUserOrg = cache(
  async (userId: string, limit = 30): Promise<PaymentTransactionRow[]> => {
    const org = await getCurrentUserOrganization(userId);
    if (!org) {
      return [];
    }

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? []) as PaymentTransactionRow[];
  }
);

export const getRecentBillingEventsForCurrentUserOrg = cache(
  async (userId: string, limit = 25): Promise<BillingEventRow[]> => {
    const org = await getCurrentUserOrganization(userId);
    if (!org) {
      return [];
    }

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("billing_events")
      .select("*")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? []) as BillingEventRow[];
  }
);
