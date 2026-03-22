"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";

export type OrganizationActionState = {
  error?: string;
};

function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createOrganizationAction(
  _prevState: OrganizationActionState,
  formData: FormData
): Promise<OrganizationActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const existingOrg = await getCurrentUserOrganization(user.id);
  if (existingOrg) {
    redirect("/dashboard");
  }

  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return { error: "Organization name is required." };
  }

  const slug = toSlug(name);
  if (!slug) {
    return { error: "Please provide a valid organization name." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("create_organization_with_starter", {
    target_name: name.trim(),
    target_slug: slug
  });

  if (error) {
    console.error("[organizations] create_organization_with_starter failed:", error.message);
    return { error: "Could not create organization. Please try again." };
  }

  redirect("/dashboard");
}
