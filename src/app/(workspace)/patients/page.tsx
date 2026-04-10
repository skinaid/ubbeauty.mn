import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/session";
import {
  getPatientTimelineSummaries,
  isClinicFoundationMissingError,
} from "@/modules/clinic/data";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { PatientsPageClient } from "./PatientsPageClient";
import type { PatientListItem } from "./PatientsPageClient";

export default async function PatientsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) redirect("/setup-organization");

  let initialPatients: PatientListItem[] = [];

  try {
    const rows = await getPatientTimelineSummaries(user.id, 50);
    initialPatients = rows.map((p) => ({
      id: p.id,
      full_name: p.full_name,
      phone: p.phone,
      email: p.email,
      lifecycle_stage: p.lifecycle_stage,
      last_visit_at: p.last_visit_at,
      cancellation_count: p.cancellation_count,
      no_show_count: p.no_show_count,
    }));
  } catch (error) {
    if (isClinicFoundationMissingError(error)) {
      // Migration not yet applied — render layout with empty list
      initialPatients = [];
    } else {
      throw error;
    }
  }

  return (
    <PatientsPageClient
      initialPatients={initialPatients}
      orgId={organization.id}
    />
  );
}
