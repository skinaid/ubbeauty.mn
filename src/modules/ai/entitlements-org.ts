/**
 * Server-side AI generation limits by organization (no user session required).
 */
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { statusAllowsPlanFeatureAccess } from "@/modules/subscriptions/billing-lifecycle";

function currentMonthKey(date = new Date()): string {
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

export type OrganizationAiEntitlement = {
  allowed: boolean;
  used: number;
  limit: number;
  reason?: string;
};

export async function getOrganizationAiReportEntitlement(
  organizationId: string
): Promise<OrganizationAiEntitlement> {
  const admin = getSupabaseAdminClient();
  const { data: sub, error: subErr } = await admin
    .from("subscriptions")
    .select("status, plan_id")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (subErr || !sub) {
    return { allowed: false, used: 0, limit: 0, reason: "no_subscription" };
  }

  const { data: planRow, error: planErr } = await admin
    .from("plans")
    .select("monthly_ai_reports")
    .eq("id", sub.plan_id)
    .maybeSingle();

  if (planErr || !planRow) {
    return { allowed: false, used: 0, limit: 0, reason: "no_plan" };
  }

  const limit = Number(planRow.monthly_ai_reports);

  if (!statusAllowsPlanFeatureAccess(sub.status)) {
    return { allowed: false, used: 0, limit, reason: "subscription_inactive" };
  }

  if (limit <= 0) {
    return { allowed: false, used: 0, limit: 0, reason: "plan_disallows_ai" };
  }

  const periodKey = currentMonthKey();
  const { data: counter, error: cErr } = await admin
    .from("usage_counters")
    .select("value")
    .eq("organization_id", organizationId)
    .eq("period_key", periodKey)
    .eq("metric_key", "ai_reports_generated")
    .maybeSingle();

  if (cErr) {
    return { allowed: false, used: 0, limit, reason: "usage_read_failed" };
  }

  const used = counter?.value ?? 0;
  if (used >= limit) {
    return { allowed: false, used, limit, reason: "monthly_quota_exceeded" };
  }

  return { allowed: true, used, limit };
}
