import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/session";
import { enforceClinicWorkspaceRouteAccess } from "@/modules/clinic/guard";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getStaffMembers } from "@/modules/clinic/data";
import { StaffPageClient } from "./StaffPageClient";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await enforceClinicWorkspaceRouteAccess("/clinic/staff");

  const org = await getCurrentUserOrganization(user.id);
  if (!org) redirect("/setup-organization");

  const staffMembers = await getStaffMembers(user.id);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <StaffPageClient initialStaff={staffMembers as any[]} orgId={org.id} />
  );
}
