/**
 * POST /api/clinic/photos-upload
 * Returns a signed upload URL for a clinic photo.
 * Client uploads directly to Supabase Storage, then calls addClinicPhoto server action.
 *
 * POST body: { fileName: string; mimeType: string }
 * Response:  { uploadUrl: string; publicUrl: string; filePath: string }
 *
 * DELETE body: { filePath: string }
 * Response:    { ok: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { randomUUID } from "crypto";

const BUCKET = "brand-assets";

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
  if (!mimeType.startsWith("image/") || BLOCKED_EXT.test(fileName)) {
    return NextResponse.json({ error: "Зөвхөн зураг байршуулах боломжтой" }, { status: 400 });
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
  const uuid = randomUUID();
  const filePath = `org-photos/${org.id}/${uuid}.${ext}`;

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(filePath, { upsert: false });

  if (error || !data) {
    return NextResponse.json({ error: `Upload URL алдаа: ${error?.message}` }, { status: 500 });
  }

  const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(filePath);

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    publicUrl: publicData.publicUrl,
    filePath,
  });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await getCurrentUserOrganization(user.id);
  if (!org) return NextResponse.json({ error: "Байгууллага олдсонгүй" }, { status: 403 });

  const body = (await req.json()) as { filePath: string };
  const { filePath } = body;

  if (!filePath) return NextResponse.json({ error: "filePath шаардлагатай" }, { status: 400 });

  // Security: only allow deleting from this org's folder
  if (!filePath.startsWith(`org-photos/${org.id}/`)) {
    return NextResponse.json({ error: "Хандах эрхгүй" }, { status: 403 });
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin.storage.from(BUCKET).remove([filePath]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
