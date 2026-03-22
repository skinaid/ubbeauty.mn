import { NextResponse } from "next/server";
import { createMetaOAuthUrl } from "@/modules/meta/actions";
import { OrgNotFoundError, requireCurrentUserOrganization } from "@/modules/meta/guards";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET() {
  try {
    const { organization } = await requireCurrentUserOrganization();
    const url = await createMetaOAuthUrl(organization.id);
    return NextResponse.redirect(url);
  } catch (e) {
    if (e instanceof OrgNotFoundError) {
      return NextResponse.redirect(new URL("/setup-organization", BASE));
    }
    console.error("[meta/connect] OAuth initiation failed:", e instanceof Error ? e.message : e);
    const pagesUrl = new URL("/pages", BASE);
    pagesUrl.searchParams.set("meta", "error");
    pagesUrl.searchParams.set("reason", "connection_failed");
    return NextResponse.redirect(pagesUrl);
  }
}
