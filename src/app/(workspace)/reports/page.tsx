import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoPrintOnLoad } from "@/components/clinic/auto-print-on-load";
import { DeleteReportPresetButton } from "@/components/clinic/delete-report-preset-button";
import { PrintReportButton } from "@/components/clinic/print-report-button";
import { SaveReportPresetForm } from "@/components/clinic/save-report-preset-form";
import { Alert, Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import {
  getClinicCheckouts,
  getClinicEngagementJobs,
  getClinicReportPresets,
  getRecentAppointmentsForDesk,
  isClinicFoundationMissingError
} from "@/modules/clinic/data";
import {
  buildAppointmentStatusBreakdown,
  buildCheckoutCollectionSummary,
  buildDashboardReportSummary,
  buildExportableReportSummary,
  buildReportPresetHref,
  filterReportAppointments,
  filterReportCheckouts,
  filterReportEngagementJobs,
  formatReportRangeLabel,
  resolveCustomReportDateRange,
  resolveReportDateRange,
  type ReportRangePreset
} from "@/modules/clinic/reporting";
import { getCurrentUserOrganization } from "@/modules/organizations/data";

export default async function ReportsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) redirect("/setup-organization");

  const rawSearchParams = (await searchParams) ?? {};
  const rangeParam = typeof rawSearchParams?.range === "string" ? rawSearchParams.range : "today";
  const providerParam = typeof rawSearchParams?.provider === "string" ? rawSearchParams.provider : "all";
  const locationParam = typeof rawSearchParams?.location === "string" ? rawSearchParams.location : "all";
  const startDateParam = typeof rawSearchParams?.startDate === "string" ? rawSearchParams.startDate : "";
  const endDateParam = typeof rawSearchParams?.endDate === "string" ? rawSearchParams.endDate : "";
  const printParam = typeof rawSearchParams?.print === "string" ? rawSearchParams.print : "";
  const rangePreset: ReportRangePreset =
    rangeParam === "7d" || rangeParam === "30d" || rangeParam === "custom" ? rangeParam : "today";

  let migrationMissing = false;
  let appointments: Awaited<ReturnType<typeof getRecentAppointmentsForDesk>> = [];
  let checkouts: Awaited<ReturnType<typeof getClinicCheckouts>> = [];
  let engagementJobs: Awaited<ReturnType<typeof getClinicEngagementJobs>> = [];
  let presets: Awaited<ReturnType<typeof getClinicReportPresets>> = [];

  try {
    [appointments, checkouts, engagementJobs, presets] = await Promise.all([
      getRecentAppointmentsForDesk(user.id, 40),
      getClinicCheckouts(user.id, 30),
      getClinicEngagementJobs(user.id, 30),
      getClinicReportPresets(user.id, 12)
    ]);
  } catch (error) {
    if (isClinicFoundationMissingError(error)) {
      migrationMissing = true;
    } else {
      throw error;
    }
  }

  const nowIso = new Date().toISOString();
  const range =
    rangePreset === "custom"
      ? resolveCustomReportDateRange({
          nowIso,
          startDate: startDateParam,
          endDate: endDateParam
        })
      : resolveReportDateRange(nowIso, rangePreset);
  const rangeLabel = formatReportRangeLabel(range);
  const providerOptions = Array.from(
    new Set(appointments.map((appointment) => appointment.staff_member?.full_name ?? "").filter(Boolean))
  );
  const locationOptions = Array.from(
    new Set(appointments.map((appointment) => appointment.location?.name ?? "").filter(Boolean))
  );
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
  const reportSummary = buildDashboardReportSummary({
    appointments: filteredAppointments,
    checkouts: filteredCheckouts,
    engagementJobs: filteredEngagementJobs,
    range
  });
  const statusBreakdown = buildAppointmentStatusBreakdown({
    appointments: filteredAppointments,
    range
  });
  const collectionSummary = buildCheckoutCollectionSummary(filteredCheckouts);
  const exportSummary = buildExportableReportSummary({
    clinicName: organization.name,
    rangeLabel,
    dashboard: reportSummary,
    collection: collectionSummary,
    topProvider: reportSummary.providerLoad[0]
  });
  const exportHref = `/reports/export?range=${encodeURIComponent(rangePreset)}&provider=${encodeURIComponent(providerParam)}&location=${encodeURIComponent(locationParam)}&startDate=${encodeURIComponent(startDateParam)}&endDate=${encodeURIComponent(endDateParam)}`;
  const generatedAtLabel = new Date(nowIso).toLocaleString("mn-MN");
  const activeFilterLabel = [
    providerParam !== "all" ? `Provider: ${providerParam}` : null,
    locationParam !== "all" ? `Location: ${locationParam}` : null
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="ui-customer-stack reports-print-page">
      <AutoPrintOnLoad enabled={printParam === "1"} />

      <PageHeader
        title="Reports"
        description={`${organization.name}-ийн operational report. Date range, provider, location filter-ээр owner, front desk, cashier багт хэрэгтэй metric-үүдийг нэг дор төвлөрүүлнэ.`}
      />

      <Card padded stack className="reports-print-hidden">
        <h2 className="ui-section-title" style={{ marginTop: 0 }}>
          Report filters
        </h2>
        <form method="get" style={{ display: "grid", gap: "0.75rem" }}>
          <div
            style={{
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
            }}
          >
            <select className="ui-input" name="range" defaultValue={rangePreset}>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>

            <input className="ui-input" type="date" name="startDate" defaultValue={startDateParam} />

            <input className="ui-input" type="date" name="endDate" defaultValue={endDateParam} />

            <select className="ui-input" name="provider" defaultValue={providerParam}>
              <option value="all">All providers</option>
              {providerOptions.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>

            <select className="ui-input" name="location" defaultValue={locationParam}>
              <option value="all">All locations</option>
              {locationOptions.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button type="submit" className="ui-button ui-button--primary ui-button--sm">
              Apply filters
            </button>
            <PrintReportButton />
            <Link href={exportHref} className="ui-table__link">
              CSV export
            </Link>
            <Link href="/reports" className="ui-table__link">
              Reset
            </Link>
          </div>
        </form>
        <span className="ui-text-muted">Active range: {rangeLabel}</span>
      </Card>

      {!migrationMissing ? (
        <div className="ui-stat-grid reports-print-hidden">
          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Save current preset
            </h2>
            <SaveReportPresetForm
              rangePreset={rangePreset}
              startDate={startDateParam}
              endDate={endDateParam}
              provider={providerParam}
              location={locationParam}
            />
          </Card>

          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Saved presets
            </h2>
            {presets.length === 0 ? (
              <p style={{ margin: 0 }}>Saved preset хараахан алга байна.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
                {presets.map((preset) => {
                  const presetParams = {
                    rangePreset:
                      preset.range_preset === "7d" ||
                      preset.range_preset === "30d" ||
                      preset.range_preset === "custom"
                        ? preset.range_preset
                        : "today",
                    provider: preset.provider_filter,
                    location: preset.location_filter,
                    startDate: preset.start_date,
                    endDate: preset.end_date
                  } as const;
                  const presetHref = buildReportPresetHref(presetParams);
                  const presetPrintHref = buildReportPresetHref({
                    ...presetParams,
                    printView: true
                  });
                  const presetExportHref = `/reports/export?range=${encodeURIComponent(presetParams.rangePreset)}&provider=${encodeURIComponent(presetParams.provider)}&location=${encodeURIComponent(presetParams.location)}&startDate=${encodeURIComponent(presetParams.startDate ?? "")}&endDate=${encodeURIComponent(presetParams.endDate ?? "")}`;

                  return (
                    <li key={preset.id} className="ui-card ui-card--padded ui-card--stack">
                      <strong>{preset.name}</strong>
                      <span className="ui-text-muted">
                        {preset.range_preset}
                        {preset.provider_filter !== "all" ? ` · ${preset.provider_filter}` : ""}
                        {preset.location_filter !== "all" ? ` · ${preset.location_filter}` : ""}
                      </span>
                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                        <Link href={presetHref} className="ui-table__link">
                          Apply
                        </Link>
                        <Link href={presetExportHref} className="ui-table__link">
                          CSV
                        </Link>
                        <Link href={presetPrintHref} className="ui-table__link">
                          Print
                        </Link>
                        <DeleteReportPresetButton presetId={preset.id} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      {migrationMissing ? (
        <Alert variant="warning">
          Clinic reporting foundation хараахан бүрэн apply хийгдээгүй байна. Migration ажилласны дараа энд live report гарна.
        </Alert>
      ) : null}

      <Card padded stack className="reports-print-header">
        <h2 className="ui-section-title" style={{ marginTop: 0 }}>
          {organization.name} operational report
        </h2>
        <span className="ui-text-muted">Range: {rangeLabel}</span>
        <span className="ui-text-muted">Generated at: {generatedAtLabel}</span>
        {activeFilterLabel ? <span className="ui-text-muted">{activeFilterLabel}</span> : null}
      </Card>

      <div className="ui-stat-grid">
        <Card padded stack>
          <span className="ui-text-muted">Өнөөдрийн орлого</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>
            {reportSummary.todayRevenue.toLocaleString("en-US")} {reportSummary.revenueCurrency}
          </strong>
          <p style={{ margin: 0 }}>Captured payment - refund</p>
        </Card>
        <Card padded stack>
          <span className="ui-text-muted">No-show rate</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>{reportSummary.noShowRate}%</strong>
          <p style={{ margin: 0 }}>
            {reportSummary.noShowCount}/{reportSummary.totalAppointments} appointment
          </p>
        </Card>
        <Card padded stack>
          <span className="ui-text-muted">Follow-up due</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>{reportSummary.followUpDueCount}</strong>
          <p style={{ margin: 0 }}>Due follow-up queue</p>
        </Card>
        <Card padded stack>
          <span className="ui-text-muted">Collection outstanding</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>
            {collectionSummary.outstandingAmount.toLocaleString("en-US")} {collectionSummary.currency}
          </strong>
          <p style={{ margin: 0 }}>{collectionSummary.collectingCount} collecting checkout</p>
        </Card>
      </div>

      {!migrationMissing ? (
        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Export-ready summary
          </h2>
          <p className="ui-text-muted" style={{ margin: 0 }}>
            Share хийхэд бэлэн management snapshot
          </p>
          <div className="ui-card ui-card--padded ui-card--stack">
            <strong>{exportSummary.title}</strong>
            {exportSummary.lines.map((line) => (
              <span key={line} className="ui-text-muted">
                {line}
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      {!migrationMissing ? (
        <div className="ui-stat-grid">
          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Appointment status mix
            </h2>
            {statusBreakdown.length === 0 ? (
              <p style={{ margin: 0 }}>Өнөөдрийн appointment data алга байна.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
                {statusBreakdown.map((item) => (
                  <li key={item.status} className="ui-card ui-card--padded ui-card--stack">
                    <strong>{item.status}</strong>
                    <span className="ui-text-muted">{item.count} appointment</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/schedule" className="ui-table__link">
              Schedule drilldown
            </Link>
          </Card>

          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Provider load
            </h2>
            {reportSummary.providerLoad.length === 0 ? (
              <p style={{ margin: 0 }}>Өнөөдрийн provider load data алга байна.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
                {reportSummary.providerLoad.map((provider) => (
                  <li key={provider.providerName} className="ui-card ui-card--padded ui-card--stack">
                    <strong>{provider.providerName}</strong>
                    <span className="ui-text-muted">
                      {provider.totalAppointments} appointment · {provider.activeVisits} active · {provider.completedVisits} completed
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/schedule" className="ui-table__link">
              Provider schedule харах
            </Link>
          </Card>
        </div>
      ) : null}

      {!migrationMissing ? (
        <div className="ui-stat-grid">
          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Checkout collection mix
            </h2>
            <div style={{ display: "grid", gap: "var(--space-3)" }}>
              <div className="ui-card ui-card--padded ui-card--stack">
                <strong>Collecting</strong>
                <span className="ui-text-muted">{collectionSummary.collectingCount} checkout</span>
              </div>
              <div className="ui-card ui-card--padded ui-card--stack">
                <strong>Paid</strong>
                <span className="ui-text-muted">{collectionSummary.paidCount} checkout</span>
              </div>
              <div className="ui-card ui-card--padded ui-card--stack">
                <strong>Voided</strong>
                <span className="ui-text-muted">{collectionSummary.voidedCount} checkout</span>
              </div>
            </div>
            <Link href="/checkout" className="ui-table__link">
              POS drilldown
            </Link>
          </Card>

          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Follow-up operations
            </h2>
            <p style={{ margin: 0 }}>
              Due follow-up: <strong>{reportSummary.followUpDueCount}</strong>
            </p>
            <p className="ui-text-muted" style={{ margin: 0 }}>
              Reminder queue болон follow-up task-уудаа schedule/dashboard дээрээс ажиллуулна.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href="/schedule" className="ui-table__link">
                Schedule queue
              </Link>
              <Link href="/dashboard" className="ui-table__link">
                Dashboard queue
              </Link>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
