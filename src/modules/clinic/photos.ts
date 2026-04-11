"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { revalidatePath } from "next/cache";

export type ClinicPhoto = {
  id: string;
  organization_id: string;
  url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

export async function getClinicPhotos(): Promise<ClinicPhoto[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const org = await getCurrentUserOrganization(user.id);
  if (!org) return [];

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinic_photos")
    .select("id, organization_id, url, caption, sort_order, created_at")
    .eq("organization_id", org.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as ClinicPhoto[];
}

export async function addClinicPhoto(
  url: string,
  caption?: string
): Promise<ClinicPhoto> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");

  const org = await getCurrentUserOrganization(user.id);
  if (!org) throw new Error("Байгууллага олдсонгүй");

  const supabase = await getSupabaseServerClient();

  // Get current max sort_order
  const { data: maxData } = await supabase
    .from("clinic_photos")
    .select("sort_order")
    .eq("organization_id", org.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxData?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("clinic_photos")
    .insert({
      organization_id: org.id,
      url,
      caption: caption ?? null,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error || !data) throw new Error(`Фото хадгалахад алдаа: ${error?.message}`);

  revalidatePath("/clinic/profile");
  return data as ClinicPhoto;
}

export async function deleteClinicPhoto(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");

  const org = await getCurrentUserOrganization(user.id);
  if (!org) throw new Error("Байгууллага олдсонгүй");

  const supabase = await getSupabaseServerClient();

  // Fetch the photo to get its URL/path before deleting
  const { data: photo, error: fetchError } = await supabase
    .from("clinic_photos")
    .select("id, organization_id, url")
    .eq("id", id)
    .eq("organization_id", org.id)
    .single();

  if (fetchError || !photo) throw new Error("Фото олдсонгүй");

  // Delete from DB
  const { error: dbError } = await supabase
    .from("clinic_photos")
    .delete()
    .eq("id", id)
    .eq("organization_id", org.id);

  if (dbError) throw new Error(`Устгахад алдаа: ${dbError.message}`);

  // Try to delete from storage (best-effort — extract filePath from URL)
  try {
    const url = new URL(photo.url);
    // URL pattern: .../storage/v1/object/public/brand-assets/<filePath>
    const marker = "/object/public/brand-assets/";
    const idx = url.pathname.indexOf(marker);
    if (idx !== -1) {
      const filePath = decodeURIComponent(url.pathname.slice(idx + marker.length));
      const admin = getSupabaseAdminClient();
      await admin.storage.from("brand-assets").remove([filePath]);
    }
  } catch {
    // Ignore storage delete errors — DB record is already gone
  }

  revalidatePath("/clinic/profile");
}
