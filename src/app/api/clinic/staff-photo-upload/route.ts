/**
 * POST /api/clinic/staff-photo-upload
 * Returns a signed upload URL for a staff member's photo.
 * Client uploads directly to Supabase Storage, then calls PATCH to save the public URL.
 *
 * POST body:  { staffId: string; fileName: string; mimeType: string }
 * Response:   { uploadUrl: string; publicUrl: string; filePath: string }
 *
 * PATCH body: { staffId: string; photoUrl: string }
 * Response:   { ok: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { revalidatePath } from "next/cache";

const BUCKET = "brand-assets";

const ALLOWED_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await getCurrentUserOrganization(user.id);
  if (!org) return NextResponse.json({ error: "Байгууллага олдсонгүй" }, { status: 403 });

  const body = (await req.json()) as {
    staffId: string;
    fileName: string;
    mimeType: string;
  };
  const { staffId, fileName, mimeType } = body;

  if (!staffId || !fileName || !mimeType) {
    return NextResponse.json(
      { error: "staffId, fileName, mimeType шаардлагатай" },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIMES.has(mimeType)) {
    return NextResponse.json(
      { error: "Зөвшөөрөгдөөгүй файлын төрөл. PNG, JPEG, WebP, GIF дэмжинэ." },
      { status: 400 }
    );
  }

  // Verify staffId belongs to this org
  const admin = getSupabaseAdminClient();
  const { data: staffRow, error: staffError } = await admin
    .from("staff_members")
    .select("id")
    .eq("id", staffId)
    .eq("organization_id", org.id)
    .single();

  if (staffError || !staffRow) {
    return NextResponse.json(
      { error: "Ажилтан олдсонгүй эсвэл эрх хүрэлцэхгүй" },
      { status: 403 }
    );
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "png";
  const filePath = `staff-photos/${org.id}/${staffId}/photo.${ext}`;

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(filePath, { upsert: true });

  if (error || !data) {
    return NextResponse.json(
      { error: `Upload URL алдаа: ${error?.message}` },
      { status: 500 }
    );
  }

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

  const body = (await req.json()) as { staffId: string; photoUrl: string };
  const { staffId, photoUrl } = body;

  if (!staffId || !photoUrl) {
    return NextResponse.json(
      { error: "staffId, photoUrl шаардлагатай" },
      { status: 400 }
    );
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("staff_members")
    .update({ photo_url: photoUrl, updated_at: new Date().toISOString() })
    .eq("id", staffId)
    .eq("organization_id", org.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/clinic/staff");
  return NextResponse.json({ ok: true });
}
