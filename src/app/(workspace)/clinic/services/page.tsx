import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/session";
import { enforceClinicWorkspaceRouteAccess } from "@/modules/clinic/guard";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getServices, getServiceCategories } from "@/modules/clinic/data";
import { ServicesPageClient } from "./ServicesPageClient";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await enforceClinicWorkspaceRouteAccess("/clinic/services");

  const org = await getCurrentUserOrganization(user.id);
  if (!org) redirect("/setup-organization");

  const [services, categories] = await Promise.all([
    getServices(user.id),
    getServiceCategories(user.id),
  ]);

  return (
    <ServicesPageClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialServices={services as any[]}
      initialCategories={categories}
      orgId={org.id}
    />
  );
}
