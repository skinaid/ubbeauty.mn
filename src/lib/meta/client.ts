import { getMetaEnv } from "@/lib/env/server";

export type MetaTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

export type MetaPage = {
  id: string;
  name: string;
  category?: string;
  access_token?: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Meta API error (${response.status}): ${body}`);
  }
  return (await response.json()) as T;
}

export function buildMetaOAuthUrl(state: string): string {
  const { appId, redirectUri, apiVersion } = getMetaEnv();
  const url = new URL(`https://www.facebook.com/${apiVersion}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "pages_show_list,pages_read_engagement,read_insights");
  return url.toString();
}

export async function exchangeCodeForAccessToken(code: string): Promise<MetaTokenResponse> {
  const { appId, appSecret, redirectUri, apiVersion } = getMetaEnv();
  const url = new URL(`https://graph.facebook.com/${apiVersion}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  return parseJson<MetaTokenResponse>(response);
}

export async function fetchMetaUser(accessToken: string): Promise<{ id: string }> {
  const { apiVersion } = getMetaEnv();
  const url = new URL(`https://graph.facebook.com/${apiVersion}/me`);
  url.searchParams.set("fields", "id");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  return parseJson<{ id: string }>(response);
}

export async function fetchAccessiblePages(accessToken: string): Promise<MetaPage[]> {
  const { apiVersion } = getMetaEnv();
  const url = new URL(`https://graph.facebook.com/${apiVersion}/me/accounts`);
  url.searchParams.set("fields", "id,name,category,access_token");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const data = await parseJson<{ data?: MetaPage[] }>(response);
  return data.data ?? [];
}
