import Link from "next/link";
import { redirect } from "next/navigation";
import { SeedDemoClinicDataButton } from "@/components/clinic/seed-demo-clinic-data-button";
import { EngagementJobsPanel } from "@/components/clinic/engagement-jobs-panel";
import { ExecuteDueClinicEngagementJobsButton } from "@/components/clinic/execute-due-clinic-engagement-jobs-button";
import { QueueClinicEngagementJobsButton } from "@/components/clinic/queue-clinic-engagement-jobs-button";
import { Alert, Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import {
  getCheckoutDraftCandidates,
  getClinicEngagementJobs,
  getClinicCheckouts,
  getClinicLocations,
  getClinicReportPresets,
  getCompletedAppointmentsForTreatmentQueue,
  getPatientTimelineSummaries,
  getRecentAppointmentsForDesk,
  getServices,
  getStaffMembers,
  isClinicFoundationMissingError,
  type AppointmentWithRelations,
  type ClinicCheckoutWithRelations,
  type ClinicEngagementJobWithRelations,
  type PatientTimelineSummary
} from "@/modules/clinic/data";
import {
  buildDashboardReportSummary,
  buildReportPresetHref,
  type ReportRangePreset
} from "@/modules/clinic/reporting";
import {
  buildClinicEnvironmentDiagnosticMessage,
  getClinicEnvironmentDiagnostics
} from "@/modules/clinic/diagnostics";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getCurrentOrganizationSubscription } from "@/modules/subscriptions/data";

function getSubscriptionLabel(status?: string | null): string {
  switch (status) {
    case "active":
      return "Идэвхтэй";
    case "bootstrap_pending_billing":
      return "Идэвхжүүлэх төлбөр хүлээж байна";
    case "suspended":
      return "Түр хязгаарлагдсан";
    case "expired":
      return "Хугацаа дууссан";
    case "canceled":
      return "Цуцлагдсан";
    default:
      return "Тодорхойгүй";
  }
}

function buildClinicSlugPreview(name: string, organizationId: string): string {
  const latinSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (latinSlug) return latinSlug;

  const compactName = name.replace(/\s+/g, "").trim();
  if (compactName) return `clinic-${organizationId.slice(0, 8).toLowerCase()}`;

  return "clinic-profile";
}

function isToday(isoDate: string): boolean {
  const date = new Date(isoDate);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function getCheckoutOutstandingAmount(checkout: ClinicCheckoutWithRelations): number {
  const total = Number(checkout.total ?? 0);
  const paid = (checkout.payments ?? []).reduce((sum, payment) => {
    const amount = Number(payment.amount ?? 0);
    return payment.payment_kind === "refund" ? sum - amount : sum + amount;
  }, 0);

  return Number(Math.max(total - paid, 0).toFixed(2));
}

function getPatientActivitySummary(patient: PatientTimelineSummary): string {
  const appointmentCount = patient.recentAppointments.length;
  const treatmentCount = patient.recentTreatments.length;
  const checkoutCount = patient.recentCheckouts.length;
  return `${appointmentCount} appointment · ${treatmentCount} treatment · ${checkoutCount} checkout`;
}

type DashboardActivityItem = {
  id: string;
  title: string;
  meta: string;
  timestamp: number;
  href: string;
  cta: string;
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) {
    redirect("/setup-organization");
  }

  const subscription = await getCurrentOrganizationSubscription(user.id);
  const clinicSlug = buildClinicSlugPreview(organization.name, organization.id);
  const environmentDiagnostics = await getClinicEnvironmentDiagnostics();
  const environmentDiagnosticMessage =
    buildClinicEnvironmentDiagnosticMessage(environmentDiagnostics);

  let migrationMissing = false;
  let recentAppointments: AppointmentWithRelations[] = [];
  let treatmentQueue: AppointmentWithRelations[] = [];
  let checkoutDraftCandidates: AppointmentWithRelations[] = [];
  let checkouts: ClinicCheckoutWithRelations[] = [];
  let engagementJobs: ClinicEngagementJobWithRelations[] = [];
  let patients: PatientTimelineSummary[] = [];
  let reportPresets = [];
  let locationCount = 0;
  let serviceCount = 0;
  let staffCount = 0;

  try {
    const [appointmentsData, treatmentQueueData, checkoutDraftData, checkoutsData, engagementJobsData, patientData, locations, services, staff, presetData] =
      await Promise.all([
        getRecentAppointmentsForDesk(user.id, 16),
        getCompletedAppointmentsForTreatmentQueue(user.id, 8),
        getCheckoutDraftCandidates(user.id, 8),
        getClinicCheckouts(user.id, 12),
        getClinicEngagementJobs(user.id, 12),
        getPatientTimelineSummaries(user.id, 6),
        getClinicLocations(user.id),
        getServices(user.id),
        getStaffMembers(user.id),
        getClinicReportPresets(user.id, 4)
      ]);

    recentAppointments = appointmentsData;
    treatmentQueue = treatmentQueueData;
    checkoutDraftCandidates = checkoutDraftData;
    checkouts = checkoutsData;
    engagementJobs = engagementJobsData;
    patients = patientData;
    reportPresets = presetData;
    locationCount = locations.length;
    serviceCount = services.length;
    staffCount = staff.length;
  } catch (error) {
    if (isClinicFoundationMissingError(error)) {
      migrationMissing = true;
    } else {
      throw error;
    }
  }

  const todayAppointments = recentAppointments.filter((appointment) => isToday(appointment.scheduled_start));
  const awaitingConfirmation = recentAppointments.filter((appointment) => appointment.status === "booked");
  const arrivedOrInProgress = recentAppointments.filter((appointment) =>
    ["arrived", "in_progress"].includes(appointment.status)
  );
  const collectingCheckouts = checkouts.filter(
    (checkout) => checkout.status !== "voided" && checkout.payment_status !== "paid"
  );
  const outstandingAmount = collectingCheckouts.reduce(
    (sum, checkout) => sum + getCheckoutOutstandingAmount(checkout),
    0
  );
  const setupReadinessCount = [locationCount > 0, staffCount > 0, serviceCount > 0].filter(Boolean).length;
  const dueEngagementJobs = engagementJobs.filter(
    (job) => job.status === "queued" && new Date(job.scheduled_for).getTime() <= Date.now()
  );
  const reportSummary = buildDashboardReportSummary({
    appointments: recentAppointments,
    checkouts,
    engagementJobs,
    range: {
      startIso: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString(),
      endIso: new Date().toISOString()
    }
  });
  const activityItems: DashboardActivityItem[] = [
    ...recentAppointments.slice(0, 6).map((appointment) => ({
      id: `appointment-${appointment.id}`,
      title: `${appointment.patient?.full_name ?? "Patient"} · ${appointment.status}`,
      meta: `${appointment.service?.name ?? "Service"} · ${new Date(appointment.scheduled_start).toLocaleString("mn-MN")}`,
      timestamp: new Date(appointment.scheduled_start).getTime(),
      href: "/schedule",
      cta: "Schedule"
    })),
    ...treatmentQueue.slice(0, 4).map((appointment) => ({
      id: `treatment-${appointment.id}`,
      title: `${appointment.patient?.full_name ?? "Patient"} · treatment queue`,
      meta: `${appointment.service?.name ?? "Service"} · ${new Date(appointment.scheduled_start).toLocaleString("mn-MN")}`,
      timestamp: new Date(appointment.scheduled_start).getTime(),
      href: "/treatments",
      cta: "Treatment"
    })),
    ...checkouts.slice(0, 6).map((checkout) => ({
      id: `checkout-${checkout.id}`,
      title: `${checkout.patient?.full_name ?? "Patient"} · ${checkout.payment_status}`,
      meta: `Үлдэгдэл ${getCheckoutOutstandingAmount(checkout).toLocaleString("en-US")} ${checkout.currency}`,
      timestamp: checkout.appointment?.scheduled_start ? new Date(checkout.appointment.scheduled_start).getTime() : 0,
      href: `/checkout?checkoutId=${checkout.id}`,
      cta: "POS"
    }))
  ]
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 10);

  return (
    <section className="ui-customer-stack">
      <PageHeader
        title={organization.name}
        description="Өнөөдрийн appointment, treatment, checkout, patient activity-г нэг дэлгэц дээр нэгтгэсэн clinic command center."
      />

      {migrationMissing ? (
        <Alert variant="warning">
          {environmentDiagnosticMessage ??
            "Clinic module migration бүрэн apply хийгдээгүй байна. Foundation data орж ирсний дараа dashboard дээр live metrics харагдана."}
        </Alert>
      ) : null}

      <div className="ui-stat-grid">
        <Card padded stack>
          <span className="ui-text-muted">Өнөөдрийн appointments</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>{todayAppointments.length}</strong>
          <p style={{ margin: 0 }}>
            {arrivedOrInProgress.length} arrived/in progress · {awaitingConfirmation.length} баталгаажуулах хүлээлттэй
          </p>
        </Card>
        <Card padded stack>
          <span className="ui-text-muted">Checkout collection</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>
            {collectingCheckouts.length === 0 ? "0" : outstandingAmount.toLocaleString("en-US")}
          </strong>
          <p style={{ margin: 0 }}>
            {collectingCheckouts.length} collecting checkout
            {collectingCheckouts.length > 0 ? " · нийт үлдэгдэл" : ""}
          </p>
        </Card>
        <Card padded stack>
          <span className="ui-text-muted">Clinic readiness</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>{setupReadinessCount}/3</strong>
          <p style={{ margin: 0 }}>Location, staff, service setup бүрэн эсэх</p>
        </Card>
        <Card padded stack>
          <span className="ui-text-muted">Subscription</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>{subscription?.plan.name ?? "No plan"}</strong>
          <p style={{ margin: 0 }}>{getSubscriptionLabel(subscription?.status)}</p>
        </Card>
      </div>

      <div className="ui-stat-grid">
        <Card padded stack>
          <span className="ui-text-muted">Өнөөдрийн орлого</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>
            {reportSummary.todayRevenue.toLocaleString("en-US")} {reportSummary.revenueCurrency}
          </strong>
          <p style={{ margin: 0 }}>Өнөөдөр бүртгэгдсэн payment capture - refund нет</p>
        </Card>
        <Card padded stack>
          <span className="ui-text-muted">No-show rate</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>{reportSummary.noShowRate}%</strong>
          <p style={{ margin: 0 }}>
            {reportSummary.noShowCount}/{reportSummary.totalAppointments} өнөөдрийн appointment
          </p>
        </Card>
        <Card padded stack>
          <span className="ui-text-muted">Follow-up due</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>{reportSummary.followUpDueCount}</strong>
          <p style={{ margin: 0 }}>Due болсон follow-up call task</p>
        </Card>
        <Card padded stack>
          <span className="ui-text-muted">Top provider load</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>
            {reportSummary.providerLoad[0]?.providerName ?? "—"}
          </strong>
          <p style={{ margin: 0 }}>
            {reportSummary.providerLoad[0]
              ? `${reportSummary.providerLoad[0].totalAppointments} appointment`
              : "Өнөөдрийн provider data алга"}
          </p>
        </Card>
      </div>

      <div className="ui-stat-grid">
        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Demo workspace
          </h2>
          <p style={{ margin: 0 }}>
            Хоосон clinic дээр schedule, POS, reports, reminder queue smoke test хийх demo dataset.
          </p>
          <SeedDemoClinicDataButton
            disabled={Boolean(environmentDiagnosticMessage)}
            disabledReason={
              environmentDiagnosticMessage
                ? `Seed түр хаагдсан: ${environmentDiagnosticMessage}`
                : null
            }
          />
        </Card>

        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Environment diagnostics
          </h2>
          <p style={{ margin: 0 }}>
            App project: <strong>{environmentDiagnostics.appProjectRef ?? "unknown"}</strong>
          </p>
          <p style={{ margin: 0 }}>
            CLI linked project: <strong>{environmentDiagnostics.linkedProjectRef ?? "unknown"}</strong>
          </p>
          <p style={{ margin: 0 }}>
            Status:{" "}
            <strong>{environmentDiagnostics.projectMismatch ? "Mismatch detected" : "Aligned"}</strong>
          </p>
          {environmentDiagnosticMessage ? (
            <p style={{ margin: 0 }}>{environmentDiagnosticMessage}</p>
          ) : (
            <p style={{ margin: 0 }}>Seed болон migration flow энэ environment дээр sync-тэй байна.</p>
          )}
        </Card>

        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Report shortcuts
          </h2>
          {reportPresets.length === 0 ? (
            <>
              <p style={{ margin: 0 }}>Saved preset хараахан алга байна.</p>
              <Link href="/reports" className="ui-table__link">
                Reports дээр preset хадгалах
              </Link>
            </>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
              {reportPresets.map((preset) => {
                const rangePreset: ReportRangePreset =
                  preset.range_preset === "7d" ||
                  preset.range_preset === "30d" ||
                  preset.range_preset === "custom"
                    ? preset.range_preset
                    : "today";
                const presetHref = buildReportPresetHref({
                  rangePreset,
                  provider: preset.provider_filter,
                  location: preset.location_filter,
                  startDate: preset.start_date,
                  endDate: preset.end_date
                });
                const presetPrintHref = buildReportPresetHref({
                  rangePreset,
                  provider: preset.provider_filter,
                  location: preset.location_filter,
                  startDate: preset.start_date,
                  endDate: preset.end_date,
                  printView: true
                });
                const presetExportHref = `/reports/export?range=${encodeURIComponent(rangePreset)}&provider=${encodeURIComponent(preset.provider_filter)}&location=${encodeURIComponent(preset.location_filter)}&startDate=${encodeURIComponent(preset.start_date ?? "")}&endDate=${encodeURIComponent(preset.end_date ?? "")}`;

                return (
                  <li key={preset.id} className="ui-card ui-card--padded ui-card--stack">
                    <strong>{preset.name}</strong>
                    <span className="ui-text-muted">
                      {preset.range_preset}
                      {preset.provider_filter !== "all" ? ` · ${preset.provider_filter}` : ""}
                      {preset.location_filter !== "all" ? ` · ${preset.location_filter}` : ""}
                    </span>
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      <Link href={presetHref} className="ui-table__link">
                        Apply
                      </Link>
                      <Link href={presetExportHref} className="ui-table__link">
                        CSV
                      </Link>
                      <Link href={presetPrintHref} className="ui-table__link">
                        Print
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/reports" className="ui-table__link">
            Бүх report tools
          </Link>
        </Card>

        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Шууд хийх ажил
          </h2>
          <div style={{ display: "grid", gap: "var(--space-2)" }}>
            <Link href="/schedule" className="ui-table__link">
              Schedule дээрх шинэ захиалгуудыг шалгах
            </Link>
            <Link href="/treatments" className="ui-table__link">
              Treatment queue хаах
            </Link>
            <Link href="/billing?checkoutStatus=collecting" className="ui-table__link">
              Төлбөр цуглуулж буй checkout-ууд руу орох
            </Link>
            <Link href={`/clinics/${clinicSlug}`} className="ui-table__link">
              Public clinic profile харах
            </Link>
          </div>
        </Card>

        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Go-live readiness
          </h2>
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            <li>{locationCount > 0 ? "Салбар бүртгэгдсэн" : "Ядаж 1 салбар нэмэх шаардлагатай"}</li>
            <li>{staffCount > 0 ? "Staff бүртгэгдсэн" : "Ядаж 1 provider/staff нэмэх шаардлагатай"}</li>
            <li>{serviceCount > 0 ? "Bookable service бэлэн" : "Ядаж 1 үйлчилгээ нэмэх шаардлагатай"}</li>
          </ul>
          <p className="ui-text-muted" style={{ margin: 0 }}>
            Тохиргоо: <Link href="/clinic" className="ui-table__link">/clinic</Link>
          </p>
        </Card>
      </div>

      {!migrationMissing ? reportSummary.providerLoad.length > 0 ? (
        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Provider load snapshot
          </h2>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
            {reportSummary.providerLoad.slice(0, 4).map((provider) => (
              <li key={provider.providerName} className="ui-card ui-card--padded ui-card--stack">
                <strong>{provider.providerName}</strong>
                <span className="ui-text-muted">
                  {provider.totalAppointments} appointment · {provider.activeVisits} active · {provider.completedVisits} completed
                </span>
              </li>
            ))}
          </ul>
          <Link href="/schedule" className="ui-table__link">
            Schedule дээр provider load шалгах
          </Link>
        </Card>
      ) : null : null}

      {!migrationMissing ? (
        <div className="ui-stat-grid">
          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Өнөөдөр / удахгүй
            </h2>
            {recentAppointments.length === 0 ? (
              <p style={{ margin: 0 }}>Одоогоор appointment бүртгэгдээгүй байна.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
                {recentAppointments.slice(0, 6).map((appointment) => (
                  <li key={appointment.id} className="ui-card ui-card--padded ui-card--stack">
                    <strong>{appointment.patient?.full_name ?? "Patient"}</strong>
                    <span className="ui-text-muted">
                      {appointment.service?.name ?? "Service"} · {new Date(appointment.scheduled_start).toLocaleString("mn-MN")}
                    </span>
                    <span className="ui-text-muted">
                      {appointment.status}
                      {appointment.staff_member?.full_name ? ` · ${appointment.staff_member.full_name}` : ""}
                      {appointment.location?.name ? ` · ${appointment.location.name}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/schedule" className="ui-table__link">
              Бүх appointments үзэх
            </Link>
          </Card>

          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Treatment queue
            </h2>
            {treatmentQueue.length === 0 ? (
              <p style={{ margin: 0 }}>Treatment note хүлээж буй completed appointment алга байна.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
                {treatmentQueue.slice(0, 5).map((appointment) => (
                  <li key={appointment.id} className="ui-card ui-card--padded ui-card--stack">
                    <strong>{appointment.patient?.full_name ?? "Patient"}</strong>
                    <span className="ui-text-muted">
                      {appointment.service?.name ?? "Service"} · {new Date(appointment.scheduled_start).toLocaleString("mn-MN")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/treatments" className="ui-table__link">
              Treatment module руу орох
            </Link>
          </Card>
        </div>
      ) : null}

      {!migrationMissing ? (
        <div className="ui-stat-grid">
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <Card padded stack>
              <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                Reminder & follow-up queue
              </h2>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "start" }}>
                <QueueClinicEngagementJobsButton />
                <ExecuteDueClinicEngagementJobsButton />
              </div>
              <span className="ui-text-muted">
                {dueEngagementJobs.length} due / {engagementJobs.length} нийт queue
              </span>
            </Card>
            <EngagementJobsPanel title="Queue detail" jobs={engagementJobs} />
          </div>

          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Checkout collection
            </h2>
            {collectingCheckouts.length === 0 ? (
              <p style={{ margin: 0 }}>Төлбөр цуглуулах идэвхтэй checkout алга байна.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
                {collectingCheckouts.slice(0, 5).map((checkout) => (
                  <li key={checkout.id} className="ui-card ui-card--padded ui-card--stack">
                    <strong>{checkout.patient?.full_name ?? "Patient"}</strong>
                    <span className="ui-text-muted">
                      {checkout.payment_status} · үлдэгдэл {getCheckoutOutstandingAmount(checkout).toLocaleString("en-US")} {checkout.currency}
                    </span>
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      <Link href={`/checkout?checkoutId=${checkout.id}`} className="ui-table__link">
                        POS дээр нээх
                      </Link>
                      <Link href={`/patients/${checkout.patient_id}`} className="ui-table__link">
                        Patient CRM
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/billing?checkoutStatus=collecting" className="ui-table__link">
              Billing collection queue
            </Link>
          </Card>

          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Draft үүсгэх боломжтой visits
            </h2>
            {checkoutDraftCandidates.length === 0 ? (
              <p style={{ margin: 0 }}>Checkout draft үүсгэх completed visit алга байна.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
                {checkoutDraftCandidates.slice(0, 5).map((appointment) => (
                  <li key={appointment.id} className="ui-card ui-card--padded ui-card--stack">
                    <strong>{appointment.patient?.full_name ?? "Patient"}</strong>
                    <span className="ui-text-muted">
                      {appointment.service?.name ?? "Service"} · {new Date(appointment.scheduled_start).toLocaleString("mn-MN")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/billing" className="ui-table__link">
              Billing workspace руу орох
            </Link>
          </Card>
        </div>
      ) : null}

      {!migrationMissing ? (
        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Activity stream
          </h2>
          {activityItems.length === 0 ? (
            <p style={{ margin: 0 }}>Одоогоор dashboard activity хараахан үүсээгүй байна.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
              {activityItems.map((item) => (
                <li key={item.id} className="ui-card ui-card--padded ui-card--stack">
                  <strong>{item.title}</strong>
                  <span className="ui-text-muted">{item.meta}</span>
                  <Link href={item.href} className="ui-table__link">
                    {item.cta} нээх
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {!migrationMissing ? (
        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Active patients
          </h2>
          {patients.length === 0 ? (
            <p style={{ margin: 0 }}>Одоогоор patient activity хараахан үүсээгүй байна.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
              {patients.map((patient) => (
                <li key={patient.id} className="ui-card ui-card--padded ui-card--stack">
                  <strong>{patient.full_name}</strong>
                  <span className="ui-text-muted">
                    {patient.phone ?? "Утасгүй"}{patient.last_visit_at ? ` · last visit ${new Date(patient.last_visit_at).toLocaleDateString("mn-MN")}` : ""}
                  </span>
                  <span className="ui-text-muted">{getPatientActivitySummary(patient)}</span>
                  <Link href={`/patients/${patient.id}`} className="ui-table__link">
                    Patient detail нээх
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </section>
  );
}
