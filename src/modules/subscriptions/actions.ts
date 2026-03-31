"use server";

/**
 * `bootstrap_organization_subscription` only reconciles starter + `bootstrap_pending_billing`.
 * It never sets `active` or applies paid upgrades — those require verified QPay flow.
 */
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function bootstrapStarterSubscription(organizationId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("bootstrap_organization_subscription", {
    target_org_id: organizationId,
    target_plan_code: "starter"
  });

  if (error) {
    throw error;
  }
}

export type SelectPlanState = {
  error?: string;
};

export async function selectPlanAction(_prev: SelectPlanState, formData: FormData): Promise<SelectPlanState> {
  const organizationId = formData.get("organizationId");
  const planCode = formData.get("planCode");

  if (typeof organizationId !== "string" || !organizationId) {
    return { error: "Organization is required." };
  }

  if (typeof planCode !== "string" || !planCode) {
    return { error: "Plan is required." };
  }

  if (planCode !== "starter") {
    return { error: "Paid plans are activated via QPay checkout on /pricing (not this RPC)." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("bootstrap_organization_subscription", {
    target_org_id: organizationId,
    target_plan_code: planCode
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/pricing");
  revalidatePath("/dashboard");
  revalidatePath("/billing");
  return {};
}
