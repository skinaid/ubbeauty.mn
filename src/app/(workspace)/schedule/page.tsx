import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/session";
import {
  getAppointmentsByDate,
  getClinicLocations,
  getServices,
  getStaffMembers,
  isClinicFoundationMissingError,
} from "@/modules/clinic/data";
import { enforceClinicWorkspaceRouteAccess } from "@/modules/clinic/guard";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { SchedulePageClient } from "./SchedulePageClient";
import type { AppointmentWithRelations } from "@/modules/clinic/data";
import type { ClinicLocationRow, ServiceRow, StaffMemberRow } from "@/modules/clinic/types";

export const dynamic = "force-dynamic";

function getTodayUTC(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function SchedulePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await enforceClinicWorkspaceRouteAccess("/schedule");

  const org = await getCurrentUserOrganization(user.id);
  if (!org) redirect("/setup-organization");

  let appointments: AppointmentWithRelations[] = [];
  let staffMembers: StaffMemberRow[] = [];
  let services: ServiceRow[] = [];
  let locations: ClinicLocationRow[] = [];

  try {
    const today = getTodayUTC();
    [appointments, staffMembers, services, locations] = await Promise.all([
      getAppointmentsByDate(user.id, today),
      getStaffMembers(user.id),
      getServices(user.id),
      getClinicLocations(user.id),
    ]);
  } catch (err) {
    if (!isClinicFoundationMissingError(err)) {
      throw err;
    }
    // Schema not ready — pass empty arrays; client handles empty state gracefully
  }

  return (
    <SchedulePageClient
      initialAppointments={appointments}
      staffMembers={staffMembers}
      services={services}
      locations={locations}
    />
  );
}
