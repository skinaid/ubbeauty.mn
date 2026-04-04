import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended" | "canceled";
};

export type OrganizationMemberRow = Database["public"]["Tables"]["organization_members"]["Row"];

export const getCurrentUserOrganization = cache(async (userId: string) => {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("organization:organizations(id,name,slug,status)")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("role", "owner")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.organization && !Array.isArray(data.organization)) {
    return data.organization as OrganizationSummary;
  }

  const { data: staffData, error: staffError } = await supabase
    .from("staff_members")
    .select("organization:organizations(id,name,slug,status)")
    .eq("profile_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (staffError) {
    throw staffError;
  }

  if (!staffData?.organization || Array.isArray(staffData.organization)) {
    return null;
  }

  return staffData.organization as OrganizationSummary;
});

export const getCurrentUserOwnerMembership = cache(
  async (userId: string): Promise<OrganizationMemberRow | null> => {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("organization_members")
      .select("*")
      .eq("user_id", userId)
      .eq("role", "owner")
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data ?? null) as OrganizationMemberRow | null;
  }
);
