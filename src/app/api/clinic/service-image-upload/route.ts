/**
 * POST /api/clinic/service-image-upload
 * Returns a signed upload URL for a service's cover image.
 * Client uploads directly to Supabase Storage, then calls PATCH to save the public URL.
 *
 * POST body:  { serviceId: string; fileName: string; mimeType: string }
 * Response:   { uploadUrl: string; publicUrl: string; filePath: string }
 *
 * PATCH body: { serviceId: string; imageUrl: string }
 * Response:   { ok: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { revalidatePath } from "next/cache";

const BUCKET = "brand-assets";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await getCurrentUserOrganization(user.id);
  if (!org) return NextResponse.json({ error: "Байгууллага олдсонгүй" }, { status: 403 });

  const body = (await req.json()) as {
    serviceId: string;
    fileName: string;
    mimeType: string;
  };
  const { serviceId, fileName, mimeType } = body;

  if (!serviceId || !fileName || !mimeType) {
    return NextResponse.json(
      { error: "serviceId, fileName, mimeType шаардлагатай" },
      { status: 400 }
    );
  }

  if (!mimeType.startsWith("image/")) {
    return NextResponse.json(
      { error: "Зөвшөөрөгдөөгүй файлын төрөл. Зөвхөн зураг дэмжинэ." },
      { status: 400 }
    );
  }

  // Verify serviceId belongs to this org
  const admin = getSupabaseAdminClient();
  const { data: serviceRow, error: serviceError } = await admin
    .from("services")
    .select("id")
    .eq("id", serviceId)
    .eq("organization_id", org.id)
    .single();

  if (serviceError || !serviceRow) {
    return NextResponse.json(
      { error: "Үйлчилгээ олдсонгүй эсвэл эрх хүрэлцэхгүй" },
      { status: 403 }
    );
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "png";
  const filePath = `service-images/${org.id}/${serviceId}/cover.${ext}`;

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

  const body = (await req.json()) as { serviceId: string; imageUrl: string };
  const { serviceId, imageUrl } = body;

  if (!serviceId || !imageUrl) {
    return NextResponse.json(
      { error: "serviceId, imageUrl шаардлагатай" },
      { status: 400 }
    );
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("services")
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq("id", serviceId)
    .eq("organization_id", org.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/clinic/services");
  return NextResponse.json({ ok: true });
}
