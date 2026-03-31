/**
 * Persists user page selection via DB RPC (enforces plan max against `meta_pages` rows only).
 * Does not touch OAuth, discovery, or usage_counters.
 */
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function applyMetaPageSelection(params: {
  organizationId: string;
  metaPageRowId: string;
  selected: boolean;
}): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("set_meta_page_selected", {
    target_org_id: params.organizationId,
    target_meta_page_id: params.metaPageRowId,
    target_selected: params.selected
  });

  if (error) {
    throw error;
  }
}
