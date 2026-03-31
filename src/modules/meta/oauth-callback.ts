/**
 * Orchestrates Meta OAuth callback: token exchange → connection → discovery.
 * Page selection and sync jobs are separate concerns (see selection actions / sync placeholder).
 */
import { exchangeCodeForAccessToken } from "@/lib/meta/client";
import { upsertMetaConnection } from "@/modules/meta/connection";
import { discoverAndPersistMetaPages } from "@/modules/meta/discovery";

export async function completeMetaOAuthCallback(params: {
  code: string;
  organizationId: string;
}): Promise<void> {
  const tokenResponse = await exchangeCodeForAccessToken(params.code);

  const connection = await upsertMetaConnection({
    organizationId: params.organizationId,
    accessToken: tokenResponse.access_token,
    expiresInSeconds: tokenResponse.expires_in
  });

  await discoverAndPersistMetaPages({
    organizationId: params.organizationId,
    connectionId: connection.connectionId,
    encryptedAccessToken: connection.accessTokenEncrypted
  });
}
