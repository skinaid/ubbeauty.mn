/**
 * Fetches accessible Meta pages and upserts rows into `meta_pages`.
 * Assumes OAuth connection already exists. Does not handle OAuth or selection.
 */
import { getMetaEnv } from "@/lib/env/server";
import { encryptSecret, decryptSecret } from "@/lib/meta/crypto";
import { fetchAccessiblePages, type MetaPage } from "@/lib/meta/client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function discoverAndPersistMetaPages(params: {
  organizationId: string;
  connectionId: string;
  encryptedAccessToken: string;
}): Promise<void> {
  const { tokenEncryptionKey } = getMetaEnv();
  const token = decryptSecret(params.encryptedAccessToken, tokenEncryptionKey);
  const pages = await fetchAccessiblePages(token);
  const admin = getSupabaseAdminClient();

  const payload = pages.map((page: MetaPage) => ({
    organization_id: params.organizationId,
    meta_connection_id: params.connectionId,
    meta_page_id: page.id,
    name: page.name,
    category: page.category ?? null,
    page_access_token_encrypted: page.access_token
      ? encryptSecret(page.access_token, tokenEncryptionKey)
      : null,
    is_selectable: true,
    status: "active" as const,
    last_synced_at: new Date().toISOString()
  }));

  if (payload.length === 0) {
    return;
  }

  const { error } = await admin.from("meta_pages").upsert(payload, {
    onConflict: "organization_id,meta_page_id"
  });

  if (error) {
    throw error;
  }
}
