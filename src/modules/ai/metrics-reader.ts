/**
 * Layer: normalized metrics read (service role). Never selects raw provider blobs for downstream AI.
 */
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type DailyRow = Database["public"]["Tables"]["page_daily_metrics"]["Row"];
type PostRow = Database["public"]["Tables"]["page_post_metrics"]["Row"];

/** Columns safe for signal extraction + LLM input (no `raw_metrics`). */
export type NormalizedDailyMetric = Omit<DailyRow, "raw_metrics">;
export type NormalizedPostMetric = Omit<PostRow, "raw_metrics">;

const DAILY_SELECT =
  "id,organization_id,meta_page_id,metric_date,followers_count,follower_delta,reach,impressions,engaged_users,post_count,engagement_rate,created_at" as const;

const POST_SELECT =
  "id,organization_id,meta_page_id,meta_post_id,post_created_at,message_excerpt,post_type,reach,impressions,engagements,reactions,comments,shares,clicks,created_at,updated_at" as const;

export async function loadNormalizedMetricsBundleForPage(internalPageId: string): Promise<{
  daily: NormalizedDailyMetric[];
  posts: NormalizedPostMetric[];
}> {
  const admin = getSupabaseAdminClient();

  const { data: daily, error: dErr } = await admin
    .from("page_daily_metrics")
    .select(DAILY_SELECT)
    .eq("meta_page_id", internalPageId)
    .order("metric_date", { ascending: true });

  if (dErr) {
    throw dErr;
  }

  const { data: posts, error: pErr } = await admin
    .from("page_post_metrics")
    .select(POST_SELECT)
    .eq("meta_page_id", internalPageId)
    .order("post_created_at", { ascending: false })
    .limit(40);

  if (pErr) {
    throw pErr;
  }

  return { daily: (daily ?? []) as NormalizedDailyMetric[], posts: (posts ?? []) as NormalizedPostMetric[] };
}
