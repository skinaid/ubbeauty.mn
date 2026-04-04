import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/session";
import {
  getClinicCheckouts,
  getClinicEngagementJobs,
  getClinicNotificationDeliveries,
  getRecentAppointmentsForDesk
} from "@/modules/clinic/data";
import {
  buildAppointmentStatusBreakdown,
  buildCheckoutCollectionSummary,
  buildDashboardReportSummary,
  buildNotificationDeliverySummary,
  buildOperationalReportCsv,
  filterReportAppointments,
  filterReportCheckouts,
  filterReportEngagementJobs,
  filterReportNotificationDeliveries,
  formatReportRangeLabel,
  resolveCustomReportDateRange,
  resolveReportDateRange,
  type ReportRangePreset
} from "@/modules/clinic/reporting";
import { getCurrentUserOrganization } from "@/modules/organizations/data";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const url = new URL(request.url);
  const rangeParam = url.searchParams.get("range") ?? "today";
  const providerParam = url.searchParams.get("provider") ?? "all";
  const locationParam = url.searchParams.get("location") ?? "all";
  const startDateParam = url.searchParams.get("startDate") ?? "";
  const endDateParam = url.searchParams.get("endDate") ?? "";
  const rangePreset: ReportRangePreset =
    rangeParam === "7d" || rangeParam === "30d" || rangeParam === "custom" ? rangeParam : "today";

  const [appointments, checkouts, engagementJobs, notificationDeliveries] = await Promise.all([
    getRecentAppointmentsForDesk(user.id, 200),
    getClinicCheckouts(user.id, 200),
    getClinicEngagementJobs(user.id, 200),
    getClinicNotificationDeliveries(user.id, 200)
  ]);

  const nowIso = new Date().toISOString();
  const range =
    rangePreset === "custom"
      ? resolveCustomReportDateRange({
          nowIso,
          startDate: startDateParam,
          endDate: endDateParam
        })
      : resolveReportDateRange(nowIso, rangePreset);

  const filteredAppointments = filterReportAppointments(appointments, {
    range,
    provider: providerParam,
    location: locationParam
  });
  const filteredCheckouts = filterReportCheckouts(checkouts, {
    range,
    provider: providerParam,
    location: locationParam
  });
  const filteredEngagementJobs = filterReportEngagementJobs(engagementJobs, { range });
  const filteredNotificationDeliveries = filterReportNotificationDeliveries(notificationDeliveries, { range });

  const dashboard = buildDashboardReportSummary({
    appointments: filteredAppointments,
    checkouts: filteredCheckouts,
    engagementJobs: filteredEngagementJobs,
    notificationDeliveries: filteredNotificationDeliveries,
    range
  });
  const collection = buildCheckoutCollectionSummary(filteredCheckouts);
  const notificationSummary = buildNotificationDeliverySummary(filteredNotificationDeliveries);
  const statusBreakdown = buildAppointmentStatusBreakdown({
    appointments: filteredAppointments,
    range
  });
  const csv = buildOperationalReportCsv({
    rangeLabel: formatReportRangeLabel(range),
    dashboard,
    collection,
    statusBreakdown,
    providerLoad: dashboard.providerLoad,
    notificationSummary
  });

  const filename = `ubbeauty-report-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
