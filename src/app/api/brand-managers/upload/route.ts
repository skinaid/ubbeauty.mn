/**
 * Returns a signed upload URL for Supabase Storage.
 * Client uploads directly to Storage (no proxying large files through Next.js).
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getUploadUrl } from "@/modules/brand-managers/visual-actions";
import type { AssetType } from "@/modules/brand-managers/visual-types";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await getCurrentUserOrganization(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { brandManagerId, assetType, fileName, mimeType } = (await req.json()) as {
    brandManagerId: string;
    assetType: AssetType;
    fileName: string;
    mimeType: string;
  };

  if (!brandManagerId || !assetType || !fileName || !mimeType) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const result = await getUploadUrl({ brandManagerId, assetType, fileName, mimeType });
  return NextResponse.json(result);
}
