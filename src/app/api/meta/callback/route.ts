import { NextRequest, NextResponse } from "next/server";
import { validateMetaOAuthState } from "@/modules/meta/actions";
import { completeMetaOAuthCallback } from "@/modules/meta/oauth-callback";

function redirectToPages(status: "success" | "error", message?: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = new URL("/pages", base);
  url.searchParams.set("meta", status);
  if (message) {
    url.searchParams.set("reason", message);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code || !state) {
      return redirectToPages("error", "missing_oauth_parameters");
    }

    const organizationId = await validateMetaOAuthState(state);
    await completeMetaOAuthCallback({ code, organizationId });

    return redirectToPages("success");
  } catch (error) {
    console.error("[meta/callback] OAuth callback failed:", error instanceof Error ? error.message : error);
    return redirectToPages("error", "meta_callback_failed");
  }
}
