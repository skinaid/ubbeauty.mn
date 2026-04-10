import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/session";
import { enforceClinicWorkspaceRouteAccess } from "@/modules/clinic/guard";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getStaffAvailabilityRules, getStaffMembers, getClinicLocations } from "@/modules/clinic/data";
import { AvailabilityPageClient } from "./AvailabilityPageClient";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await enforceClinicWorkspaceRouteAccess("/clinic/availability");

  const org = await getCurrentUserOrganization(user.id);
  if (!org) redirect("/setup-organization");

  const [rules, staffMembers, locations] = await Promise.all([
    getStaffAvailabilityRules(user.id),
    getStaffMembers(user.id),
    getClinicLocations(user.id),
  ]);

  return (
    <AvailabilityPageClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialRules={rules as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      staffMembers={staffMembers as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locations={locations as any[]}
      orgId={org.id}
    />
  );
}
