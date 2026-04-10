import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/modules/auth/session";
import { enforceClinicWorkspaceRouteAccess } from "@/modules/clinic/guard";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getServices } from "@/modules/clinic/data";
import { ServicesPageClient } from "./ServicesPageClient";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await enforceClinicWorkspaceRouteAccess("/clinic/services");
  const org = await getCurrentUserOrganization(user.id);
  if (!org) redirect("/setup-organization");
  const services = await getServices(user.id);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
        <Link href="/clinic" style={{ fontSize: "0.85rem", color: "#6b7280", textDecoration: "none" }}>← Буцах</Link>
        <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Үйлчилгээ</h1>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ServicesPageClient initialServices={services as any[]} orgId={org.id} />
    </div>
  );
}
