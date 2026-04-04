import Link from "next/link";
import { redirect } from "next/navigation";
import { EngagementJobsPanel } from "@/components/clinic/engagement-jobs-panel";
import { Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import {
  getClinicEngagementJobs,
  getClinicNotificationDeliveries,
  isClinicFoundationMissingError
} from "@/modules/clinic/data";
import { getClinicActorOrNull, hasClinicRole } from "@/modules/clinic/guard";
import {
  buildNotificationDeliverySummary,
  filterReportNotificationDeliveries,
  formatReportRangeLabel,
  resolveReportDateRange,
  type ReportRangePreset
} from "@/modules/clinic/reporting";
import { getCurrentUserOrganization } from "@/modules/organizations/data";

export default async function NotificationsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) redirect("/setup-organization");
  const actor = await getClinicActorOrNull();

  const rawSearchParams = (await searchParams) ?? {};
  const rangeParam = typeof rawSearchParams.range === "string" ? rawSearchParams.range : "7d";
  const statusParam = typeof rawSearchParams.status === "string" ? rawSearchParams.status : "all";
  const channelParam = typeof rawSearchParams.channel === "string" ? rawSearchParams.channel : "all";
  const providerParam = typeof rawSearchParams.provider === "string" ? rawSearchParams.provider : "all";
  const rangePreset: ReportRangePreset =
    rangeParam === "today" || rangeParam === "7d" || rangeParam === "30d" ? rangeParam : "7d";

  let migrationMissing = false;
  let deliveries: Awaited<ReturnType<typeof getClinicNotificationDeliveries>> = [];
  let engagementJobs: Awaited<ReturnType<typeof getClinicEngagementJobs>> = [];

  try {
    [deliveries, engagementJobs] = await Promise.all([
      getClinicNotificationDeliveries(user.id, 150),
      getClinicEngagementJobs(user.id, 40)
    ]);
  } catch (error) {
    if (isClinicFoundationMissingError(error)) {
      migrationMissing = true;
    } else {
      throw error;
    }
  }

  const range = resolveReportDateRange(new Date().toISOString(), rangePreset);
  const rangedDeliveries = filterReportNotificationDeliveries(deliveries, { range });
  const filteredDeliveries = rangedDeliveries.filter((delivery) => {
    const matchesStatus = statusParam === "all" || delivery.status === statusParam;
    const matchesChannel = channelParam === "all" || delivery.channel === channelParam;
    const matchesProvider = providerParam === "all" || delivery.provider === providerParam;
    return matchesStatus && matchesChannel && matchesProvider;
  });
  const summary = buildNotificationDeliverySummary(filteredDeliveries);
  const providerOptions = Array.from(new Set(rangedDeliveries.map((delivery) => delivery.provider).filter(Boolean)));
  const channelOptions = Array.from(new Set(rangedDeliveries.map((delivery) => delivery.channel).filter(Boolean)));
  const rangeLabel = formatReportRangeLabel(range);
  const canManageRetryQueue = actor
    ? hasClinicRole(actor.role, ["owner", "manager", "front_desk", "billing"])
    : false;
  const actionableJobs = engagementJobs.filter(
    (job) => job.status === "failed" || job.status === "succeeded"
  );

  return (
    <section className="ui-customer-stack">
      <PageHeader
        title="Notifications"
        description={`${organization.name}-ийн notification delivery attempts, callback updates, retry state, provider-level failure-үүдийг operational байдлаар хянах дэлгэц.`}
      />

      <Card padded stack>
        <h2 className="ui-section-title" style={{ marginTop: 0 }}>
          Filters
        </h2>
        <form method="get" style={{ display: "grid", gap: "0.75rem" }} data-smoke-form="notification-filters">
          <div
            style={{
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
            }}
          >
            <select className="ui-input" name="range" defaultValue={rangePreset} data-smoke-field="notification-range">
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>

            <select className="ui-input" name="status" defaultValue={statusParam} data-smoke-field="notification-status">
              <option value="all">All statuses</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
            </select>

            <select className="ui-input" name="channel" defaultValue={channelParam} data-smoke-field="notification-channel">
              <option value="all">All channels</option>
              {channelOptions.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>

            <select className="ui-input" name="provider" defaultValue={providerParam} data-smoke-field="notification-provider">
              <option value="all">All providers</option>
              {providerOptions.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button type="submit" className="ui-button ui-button--primary ui-button--sm">
              Apply filters
            </button>
            <Link href="/notifications" className="ui-table__link">
              Reset
            </Link>
          </div>
          <span className="ui-text-muted">Active range: {rangeLabel}</span>
        </form>
      </Card>

      {migrationMissing ? (
        <Card padded stack>
          <p style={{ margin: 0 }}>
            Notification delivery schema хараахан migration-тайгаа apply хийгдээгүй байна.
          </p>
        </Card>
      ) : null}

      {!migrationMissing ? (
        <div className="ui-stat-grid">
          <Card padded stack>
            <span className="ui-text-muted">Delivery success</span>
            <strong style={{ fontSize: "var(--text-2xl)" }}>{summary.successRate}%</strong>
            <p style={{ margin: 0 }}>
              {summary.successCount} succeeded · {summary.failedCount} failed
            </p>
          </Card>
          <Card padded stack>
            <span className="ui-text-muted">Attempts</span>
            <strong style={{ fontSize: "var(--text-2xl)" }}>{summary.totalAttempts}</strong>
            <p style={{ margin: 0 }}>Filtered delivery attempts</p>
          </Card>
          <Card padded stack>
            <span className="ui-text-muted">Failed queue</span>
            <strong style={{ fontSize: "var(--text-2xl)" }}>{summary.failedItems.length}</strong>
            <p style={{ margin: 0 }}>Recent failures requiring attention</p>
          </Card>
        </div>
      ) : null}

      {!migrationMissing ? (
        <div className="ui-stat-grid">
          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Channel mix
            </h2>
            {summary.channelBreakdown.length === 0 ? (
              <p style={{ margin: 0 }}>Энэ filter дээр delivery attempt алга байна.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
                {summary.channelBreakdown.map((item) => (
                  <li key={item.channel} className="ui-card ui-card--padded ui-card--stack">
                    <strong>{item.channel}</strong>
                    <span className="ui-text-muted">
                      {item.total} attempt · {item.succeeded} succeeded · {item.failed} failed
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Failed attempts
            </h2>
            {summary.failedItems.length === 0 ? (
              <p style={{ margin: 0 }}>Failed delivery алга байна.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
                {summary.failedItems.map((item) => (
                  <li
                    key={`${item.channel}-${item.provider}-${item.attemptedAt}-${item.recipient ?? "unknown"}`}
                    className="ui-card ui-card--padded ui-card--stack"
                  >
                    <strong>{item.provider}</strong>
                    <span className="ui-text-muted">
                      {item.channel} · {new Date(item.attemptedAt).toLocaleString("mn-MN")}
                    </span>
                    <span className="ui-text-muted">{item.recipient ?? "Recipient unknown"}</span>
                    <span className="ui-text-muted">{item.errorMessage ?? "Unknown delivery error"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      {!migrationMissing && canManageRetryQueue ? (
        <EngagementJobsPanel title="Retry & requeue queue" jobs={actionableJobs} limit={8} />
      ) : null}

      {!migrationMissing ? (
        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Delivery history
          </h2>
          {filteredDeliveries.length === 0 ? (
            <p style={{ margin: 0 }}>Энэ filter дээр delivery history олдсонгүй.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
              {filteredDeliveries.map((delivery) => (
                <li key={delivery.id} className="ui-card ui-card--padded ui-card--stack">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                    <strong>{delivery.patient?.full_name ?? delivery.recipient ?? "Unknown recipient"}</strong>
                    <span className="ui-text-muted">{new Date(delivery.attempted_at).toLocaleString("mn-MN")}</span>
                  </div>
                  <span className="ui-text-muted">
                    {delivery.channel} · {delivery.provider} · {delivery.status}
                  </span>
                  <span className="ui-text-muted">
                    {delivery.recipient ?? delivery.patient?.phone ?? delivery.patient?.email ?? "Recipient unknown"}
                  </span>
                  {delivery.engagement_job ? (
                    <span className="ui-text-muted">
                      {delivery.engagement_job.job_type} · job status {delivery.engagement_job.status}
                    </span>
                  ) : null}
                  {delivery.error_message ? (
                    <span className="ui-text-muted">{delivery.error_message}</span>
                  ) : null}
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <Link href="/dashboard" className="ui-table__link">
                      Dashboard
                    </Link>
                    <Link href="/reports" className="ui-table__link">
                      Reports
                    </Link>
                    {delivery.patient_id ? (
                      <Link href={`/patients/${delivery.patient_id}`} className="ui-table__link">
                        Patient CRM
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </section>
  );
}
