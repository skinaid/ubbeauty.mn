/**
 * Meta OAuth connection persistence (organization-level, one per org in v1).
 * Does not perform discovery or page selection.
 */
import { getMetaEnv } from "@/lib/env/server";
import { encryptSecret } from "@/lib/meta/crypto";
import { fetchMetaUser } from "@/lib/meta/client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type MetaConnectionUpsertResult = {
  connectionId: string;
  /** For server-side use only (e.g. discovery). Never send to the client. */
  accessTokenEncrypted: string;
};

export async function upsertMetaConnection(params: {
  organizationId: string;
  accessToken: string;
  expiresInSeconds?: number;
  scopes?: string[];
}): Promise<MetaConnectionUpsertResult> {
  const { tokenEncryptionKey } = getMetaEnv();
  const encryptedToken = encryptSecret(params.accessToken, tokenEncryptionKey);
  const user = await fetchMetaUser(params.accessToken);
  const admin = getSupabaseAdminClient();

  const expiresAt = params.expiresInSeconds
    ? new Date(Date.now() + params.expiresInSeconds * 1000).toISOString()
    : null;

  const { data, error } = await admin
    .from("meta_connections")
    .upsert(
      {
        organization_id: params.organizationId,
        meta_user_id: user.id,
        access_token_encrypted: encryptedToken,
        token_expires_at: expiresAt,
        granted_scopes: params.scopes ?? [],
        status: "active",
        last_validated_at: new Date().toISOString(),
        last_error: null
      },
      { onConflict: "organization_id" }
    )
    .select("id,access_token_encrypted")
    .single();

  if (error) {
    throw error;
  }

  return {
    connectionId: data.id,
    accessTokenEncrypted: data.access_token_encrypted as string
  };
}
