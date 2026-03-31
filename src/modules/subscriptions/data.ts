import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { statusAllowsPlanFeatureAccess } from "@/modules/subscriptions/billing-lifecycle";
import type { Database } from "@/types/database";

export type PlanRow = Database["public"]["Tables"]["plans"]["Row"];
export type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];
export type UsageCounterRow = Database["public"]["Tables"]["usage_counters"]["Row"];

export type SubscriptionWithPlan = SubscriptionRow & {
  plan: PlanRow;
};

export const getPublicActivePlans = cache(async (): Promise<PlanRow[]> => {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("price_monthly", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as PlanRow[];
});

export const getCurrentOrganizationSubscription = cache(
  async (userId: string): Promise<SubscriptionWithPlan | null> => {
    const organization = await getCurrentUserOrganization(userId);
    if (!organization) {
      return null;
    }

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*, plan:plans(*)")
      .eq("organization_id", organization.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data?.plan || Array.isArray(data.plan)) {
      return null;
    }

    return {
      ...(data as SubscriptionRow),
      plan: data.plan as PlanRow
    };
  }
);

/**
 * Plan row used for quotas/features from the assigned `plan_id`.
 * Includes `bootstrap_pending_billing` (unpaid bootstrap) — same tier limits, distinct billing lifecycle; see `billing-lifecycle.ts`.
 */
export const getActivePlan = cache(async (userId: string): Promise<PlanRow | null> => {
  const subscription = await getCurrentOrganizationSubscription(userId);
  if (!subscription) {
    return null;
  }

  if (!statusAllowsPlanFeatureAccess(subscription.status)) {
    return null;
  }

  return subscription.plan;
});

export const getUsageCounters = cache(
  async (userId: string, periodKey: string): Promise<UsageCounterRow[]> => {
    const organization = await getCurrentUserOrganization(userId);
    if (!organization) {
      return [];
    }

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("usage_counters")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("period_key", periodKey);

    if (error) {
      throw error;
    }

    return (data ?? []) as UsageCounterRow[];
  }
);
