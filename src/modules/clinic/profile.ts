"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { revalidatePath } from "next/cache";

export type ClinicProfile = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tagline: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  working_hours: Record<string, string> | null;
  services_summary: string[] | null;
  social_instagram: string | null;
  social_facebook: string | null;
  founded_year: number | null;
  staff_count: number | null;
  profile_completed: boolean;
};

export async function getClinicProfile(): Promise<ClinicProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id, name, slug, description, tagline, phone, website, address, city, working_hours, services_summary, social_instagram, social_facebook, founded_year, staff_count, profile_completed"
    )
    .eq("id", (await getCurrentUserOrganization(user.id))?.id ?? "")
    .single();

  if (error || !data) return null;
  return data as unknown as ClinicProfile;
}

export type UpdateClinicProfileInput = Partial<Omit<ClinicProfile, "id" | "slug">>;

export async function updateClinicProfile(
  fields: UpdateClinicProfileInput
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Нэвтрэх шаардлагатай" };

  const org = await getCurrentUserOrganization(user.id);
  if (!org) return { error: "Байгууллага олдсонгүй" };

  const supabase = await getSupabaseServerClient();

  // Check if profile is now complete after this update
  // Fetch current + merge with new fields to check completeness
  const { data: current } = await supabase
    .from("organizations")
    .select("description, phone, address, city")
    .eq("id", org.id)
    .single();

  const currentData = current as { description?: string | null; phone?: string | null; address?: string | null; city?: string | null } | null;
  const merged = { ...(currentData ?? {}), ...fields };
  const isComplete = !!(
    merged.description &&
    merged.phone &&
    merged.address &&
    merged.city
  );

  const { error } = await supabase
    .from("organizations")
    .update({
      ...fields,
      profile_completed: isComplete,
      updated_at: new Date().toISOString(),
    })
    .eq("id", org.id);

  if (error) return { error: `Хадгалахад алдаа: ${error.message}` };

  revalidatePath("/clinic/profile");
  return {};
}
