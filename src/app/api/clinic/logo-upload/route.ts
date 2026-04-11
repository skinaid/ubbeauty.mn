/**
 * POST /api/clinic/logo-upload
 * Returns a signed upload URL for the clinic logo.
 * Client uploads directly to Supabase Storage, then calls PATCH to save the public URL.
 *
 * POST body: { fileName: string; mimeType: string }
 * Response:  { uploadUrl: string; publicUrl: string; filePath: string }
 *
 * PATCH body: { publicUrl: string }
 * Response:   { ok: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { revalidatePath } from "next/cache";

const BUCKET = "brand-assets";

const ALLOWED_MIMES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);
const BLOCKED_EXT = /\.(js|ts|jsx|tsx|php|exe|sh|bat|cmd|py|rb|pl)$/i;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await getCurrentUserOrganization(user.id);
  if (!org) return NextResponse.json({ error: "Байгууллага олдсонгүй" }, { status: 403 });

  const body = (await req.json()) as { fileName: string; mimeType: string };
  const { fileName, mimeType } = body;

  if (!fileName || !mimeType) {
    return NextResponse.json({ error: "fileName, mimeType шаардлагатай" }, { status: 400 });
  }
  if (!ALLOWED_MIMES.has(mimeType) || BLOCKED_EXT.test(fileName)) {
    return NextResponse.json({ error: "Зөвшөөрөгдөөгүй файлын төрөл" }, { status: 400 });
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "png";
  // Fixed path — always overwrite so there's only one logo per org
  const filePath = `org-logos/${org.id}/logo.${ext}`;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(filePath, { upsert: true });

  if (error || !data) {
    return NextResponse.json({ error: `Upload URL алдаа: ${error?.message}` }, { status: 500 });
  }

  // Build the public URL (will be valid after upload completes)
  const admin = getSupabaseAdminClient();
  const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(filePath);

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    publicUrl: publicData.publicUrl,
    filePath,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await getCurrentUserOrganization(user.id);
  if (!org) return NextResponse.json({ error: "Байгууллага олдсонгүй" }, { status: 403 });

  const { publicUrl } = (await req.json()) as { publicUrl: string };
  if (!publicUrl) return NextResponse.json({ error: "publicUrl шаардлагатай" }, { status: 400 });

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("organizations")
    .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", org.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/clinic/profile");
  return NextResponse.json({ ok: true });
}
