import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/session";
import { enforceClinicWorkspaceRouteAccess } from "@/modules/clinic/guard";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getClinicLocations } from "@/modules/clinic/data";
import { LocationsPageClient } from "./LocationsPageClient";

export const dynamic = "force-dynamic";

export default async function ClinicLocationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await enforceClinicWorkspaceRouteAccess("/clinic/locations");

  const org = await getCurrentUserOrganization(user.id);
  if (!org) redirect("/setup-organization");

  const locations = await getClinicLocations(user.id);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <LocationsPageClient initialLocations={locations as any[]} orgId={org.id} />
  );
}
