import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getSelectedActivePageCount } from "@/modules/meta/data";
import { getActivePlan, getUsageCounters } from "@/modules/subscriptions/data";

export type EntitlementFeature = "connect_page" | "manual_sync" | "generate_ai_report";

export type EntitlementResult = {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
};

function currentPeriodKey(date = new Date()): string {
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

function currentDayKey(date = new Date()): string {
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export async function checkOrganizationFeatureLimit(
  userId: string,
  feature: EntitlementFeature
): Promise<EntitlementResult> {
  const plan = await getActivePlan(userId);
  if (!plan) {
    return { allowed: false, limit: 0, used: 0, remaining: 0 };
  }

  if (feature === "connect_page") {
    const organization = await getCurrentUserOrganization(userId);
    if (!organization) {
      return { allowed: false, limit: plan.max_pages, used: 0, remaining: plan.max_pages };
    }
    const used = await getSelectedActivePageCount(organization.id);
    const limit = plan.max_pages;
    return { allowed: used < limit, limit, used, remaining: Math.max(limit - used, 0) };
  }

  if (feature === "manual_sync") {
    const counters = await getUsageCounters(userId, currentDayKey());
    const used = counters.find((c) => c.metric_key === "manual_syncs_used")?.value ?? 0;
    const limit = plan.syncs_per_day;
    return { allowed: used < limit, limit, used, remaining: Math.max(limit - used, 0) };
  }

  const counters = await getUsageCounters(userId, currentPeriodKey());
  const used = counters.find((c) => c.metric_key === "ai_reports_generated")?.value ?? 0;
  const limit = plan.monthly_ai_reports;
  return { allowed: used < limit, limit, used, remaining: Math.max(limit - used, 0) };
}
