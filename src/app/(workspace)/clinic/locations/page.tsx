import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/session";
import { enforceClinicWorkspaceRouteAccess } from "@/modules/clinic/guard";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getClinicLocations } from "@/modules/clinic/data";
import { LocationsPageClient } from "./LocationsPageClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClinicLocationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await enforceClinicWorkspaceRouteAccess("/clinic/locations");

  const org = await getCurrentUserOrganization(user.id);
  if (!org) redirect("/setup-organization");

  const locations = await getClinicLocations(user.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
        <Link href="/clinic" style={{ fontSize: "0.85rem", color: "#6b7280", textDecoration: "none" }}>← Буцах</Link>
        <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Салбарын байршил</h1>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <LocationsPageClient initialLocations={locations as any[]} orgId={org.id} />
    </div>
  );
}
