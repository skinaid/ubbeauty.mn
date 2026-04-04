import { getCurrentUser } from "@/modules/auth/session";
import { cookies } from "next/headers";
import { getCurrentUserOrganization, getCurrentUserOwnerMembership } from "@/modules/organizations/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { OrganizationSummary } from "@/modules/organizations/data";
import type { StaffMemberRow, StaffRole } from "./types";

export type ClinicActor = {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  organization: OrganizationSummary;
  role: StaffRole;
  staffMember: StaffMemberRow | null;
};

export const CLINIC_ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Owner",
  manager: "Manager",
  front_desk: "Front desk",
  provider: "Provider",
  assistant: "Assistant",
  billing: "Billing"
};

export const DEV_CLINIC_ROLE_COOKIE = "ubbeauty-dev-clinic-role";

export function parseDevClinicRoleOverride(value: string | null | undefined): StaffRole | null {
  if (!value) return null;

  return value in CLINIC_ROLE_LABELS ? (value as StaffRole) : null;
}

async function resolveClinicActor(): Promise<ClinicActor | { error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Нэвтэрсэн байх шаардлагатай." };
  }

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) {
    return { error: "Clinic workspace олдсонгүй." };
  }

  if (process.env.NODE_ENV !== "production") {
    const cookieStore = await cookies();
    const devRoleOverride = parseDevClinicRoleOverride(cookieStore.get(DEV_CLINIC_ROLE_COOKIE)?.value);

    if (devRoleOverride) {
      const supabase = await getSupabaseServerClient();
      const { data: staffMember } = await supabase
        .from("staff_members")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("role", devRoleOverride)
        .eq("status", "active")
        .maybeSingle();

      return {
        user,
        organization,
        role: devRoleOverride,
        staffMember: (staffMember as StaffMemberRow | null) ?? null
      };
    }
  }

  const ownerMembership = await getCurrentUserOwnerMembership(user.id);
  if (ownerMembership?.organization_id === organization.id) {
    return {
      user,
      organization,
      role: "owner",
      staffMember: null
    };
  }

  const supabase = await getSupabaseServerClient();
  const { data: staffMember, error } = await supabase
    .from("staff_members")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("profile_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    return { error: "Clinic actor role шалгах үед алдаа гарлаа." };
  }

  if (!staffMember) {
    return { error: "Таны clinic staff role бүртгэгдээгүй байна." };
  }

  return {
    user,
    organization,
    role: staffMember.role as StaffRole,
    staffMember: staffMember as StaffMemberRow
  };
}

export async function requireClinicActor(): Promise<ClinicActor | { error: string }> {
  return resolveClinicActor();
}

export async function getClinicActorOrNull(): Promise<ClinicActor | null> {
  const actor = await resolveClinicActor();
  return "error" in actor ? null : actor;
}

export function hasClinicRole(actorRole: StaffRole, allowedRoles: StaffRole[]) {
  return allowedRoles.includes(actorRole);
}

export function buildClinicPermissionError(allowedRoles: StaffRole[]) {
  const labels = allowedRoles.map((role) => CLINIC_ROLE_LABELS[role]).join(", ");
  return `Энэ үйлдэлд ${labels} эрх шаардлагатай.`;
}
