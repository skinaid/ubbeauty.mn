import Link from "next/link";
import { redirect } from "next/navigation";
import { AiInsightsBlock } from "@/components/ai/ai-insights-block";
import { RegenerateAnalysisForm } from "@/components/ai/regenerate-analysis-form";
import { OperationalHealthBanner } from "@/components/dashboard/operational-health-banner";
import { PageAnalyticsBlock } from "@/components/dashboard/page-analytics-block";
import { ManualSyncForm } from "@/components/sync/manual-sync-form";
import { RetrySyncJobForm } from "@/components/sync/retry-sync-job-form";
import { Alert, Card, PageHeader } from "@/components/ui";
import {
  getLatestAnalysisJobForPage,
  getLatestFailedAnalysisJobForOrganization,
  getLatestReadyReportForPage,
  getRecentAnalysisJobsForPage,
  getRecommendationsForReport,
  getReportHistoryForPage
} from "@/modules/ai/data";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getOrganizationMetaPages } from "@/modules/meta/data";
import { getCurrentOrganizationSubscription } from "@/modules/subscriptions/data";
import { checkOrganizationFeatureLimit } from "@/modules/subscriptions/entitlements";
import {
  getDailyMetricsSeriesForPage,
  getLatestDailyMetricForPage,
  getLatestFailedSyncJobForOrganization,
  getLatestSucceededSyncJobForPage,
  getLatestSyncJobForPage,
  getRecentPostMetricsForPage,
  getRecentSyncJobsForOrganization
} from "@/modules/sync/data";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) {
    redirect("/setup-organization");
  }

  const [subscription, pages, recentJobs, manualEntitlement, aiEntitlement, failedSync, failedAnalysis] =
    await Promise.all([
      getCurrentOrganizationSubscription(user.id),
      getOrganizationMetaPages(organization.id),
      getRecentSyncJobsForOrganization(organization.id, 8),
      checkOrganizationFeatureLimit(user.id, "manual_sync"),
      checkOrganizationFeatureLimit(user.id, "generate_ai_report"),
      getLatestFailedSyncJobForOrganization(organization.id),
      getLatestFailedAnalysisJobForOrganization(organization.id)
    ]);

  const selectedPages = pages.filter((p) => p.is_selected && p.status === "active");

  const pageCards = await Promise.all(
    selectedPages.map(async (p) => {
      const [metric, job, lastOkJob, dailySeries, postMetrics, aiReport, aiJob, aiJobRuns, reportHistory] =
        await Promise.all([
          getLatestDailyMetricForPage(p.id),
          getLatestSyncJobForPage(p.id),
          getLatestSucceededSyncJobForPage(p.id),
          getDailyMetricsSeriesForPage(p.id, 28),
          getRecentPostMetricsForPage(p.id, 15),
          getLatestReadyReportForPage(p.id),
          getLatestAnalysisJobForPage(p.id),
          getRecentAnalysisJobsForPage(p.id, 6),
          getReportHistoryForPage(p.id, 10)
        ]);
      const recs = aiReport ? await getRecommendationsForReport(aiReport.id) : [];
      return {
        page: p,
        metric,
        job,
        lastOkJob,
        dailySeries,
        postMetrics,
        aiReport,
        aiJob,
        aiJobRuns,
        reportHistory,
        recs
      };
    })
  );

  return (
    <section className="ui-customer-stack">
      <div>
        <PageHeader title="Dashboard" />
        <p className="ui-text-muted" style={{ margin: "var(--space-2) 0 0" }}>
          Organization: {organization.name}
        </p>
        <p className="ui-text-muted" style={{ margin: "var(--space-1) 0 0" }}>
          Subscription: {subscription ? `${subscription.plan.name} (${subscription.status})` : "Not configured"}
        </p>
        <p className="ui-text-muted" style={{ margin: "var(--space-1) 0 0" }}>
          Meta pages:{" "}
          <Link href="/pages" className="ui-table__link">
            /pages
          </Link>
        </p>
      </div>
      <OperationalHealthBanner failedSync={failedSync} failedAnalysis={failedAnalysis} />
      {!aiEntitlement.allowed ? (
        <Alert variant="warning">
          AI report quota: {aiEntitlement.used}/{aiEntitlement.limit} this month — generation is skipped until quota
          resets or plan allows more.
        </Alert>
      ) : null}

      <Card padded>
        <h2 className="ui-section-title" style={{ marginTop: 0 }}>
          Sync, metrics &amp; AI
        </h2>
        <p className="ui-text-muted" style={{ marginTop: 0 }}>
          Metrics come from Meta Graph sync. AI uses normalized tables + rule-based signals; optional OpenAI refines
          narrative. Billing uses QPay; see{" "}
          <Link href="/billing" className="ui-table__link">
            /billing
          </Link>{" "}
          for invoices and payment status.
        </p>

        <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600, margin: "var(--space-5) 0 var(--space-3)" }}>
          Selected pages
        </h3>
        {pageCards.length === 0 ? (
          <p>No pages selected. Connect Meta and select pages on /pages.</p>
        ) : (
          <ul className="ui-dashboard-page-list">
            {pageCards.map(
              ({
                page,
                metric,
                job,
                lastOkJob,
                dailySeries,
                postMetrics,
                aiReport,
                aiJob,
                aiJobRuns,
                reportHistory,
                recs
              }) => (
              <li key={page.id}>
                <Card padded stack>
                  <strong>{page.name}</strong>
                  <p className="ui-text-muted" style={{ margin: 0 }}>
                    Last synced (page): {page.last_synced_at ?? "—"}
                  </p>
                  <p className="ui-text-muted" style={{ margin: 0 }}>
                    Latest sync job: {job ? `${job.status} (${job.job_type})` : "—"}
                    {job?.finished_at ? ` · finished ${job.finished_at}` : null}
                    {job?.error_message ? (
                      <span className="ui-text-error" style={{ display: "block" }}>
                        {job.error_message}
                      </span>
                    ) : null}
                  </p>
                  <p className="ui-text-muted" style={{ margin: 0 }}>
                    Latest daily row:{" "}
                    {metric
                      ? `${metric.metric_date} · fans ${metric.followers_count ?? "—"} · impressions ${metric.impressions ?? "—"} · engaged ${metric.engaged_users ?? "—"}`
                      : "—"}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center" }}>
                    <ManualSyncForm
                      organizationId={organization.id}
                      internalPageId={page.id}
                      pageLabel={page.name}
                      disabled={!manualEntitlement.allowed}
                    />
                    <RegenerateAnalysisForm
                      organizationId={organization.id}
                      internalPageId={page.id}
                      disabled={!aiEntitlement.allowed}
                    />
                    {!manualEntitlement.allowed ? (
                      <span className="ui-text-warning-emphasis" style={{ fontSize: "var(--text-xs)" }}>
                        Manual sync quota: {manualEntitlement.used}/{manualEntitlement.limit} today
                      </span>
                    ) : null}
                  </div>

                  <PageAnalyticsBlock
                    pageName={page.name}
                    dailySeries={dailySeries}
                    posts={postMetrics}
                    latestJob={job}
                    lastSucceededJob={lastOkJob}
                    latestMetricDate={metric?.metric_date ?? null}
                    pageLastSyncedAt={page.last_synced_at}
                  />

                  <AiInsightsBlock
                    report={aiReport}
                    recommendations={recs}
                    analysisJob={aiJob}
                    recentAnalysisJobs={aiJobRuns}
                    reportHistory={reportHistory}
                  />
                </Card>
              </li>
            )
            )}
          </ul>
        )}

        <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600, margin: "var(--space-5) 0 var(--space-3)" }}>
          Recent sync jobs
        </h3>
        {recentJobs.length === 0 ? (
          <p>No jobs yet.</p>
        ) : (
          <ul style={{ paddingLeft: "1.1rem" }}>
            {recentJobs.map((j) => (
              <li key={j.id} style={{ marginBottom: "var(--space-2)" }}>
                <code style={{ fontSize: "var(--text-xs)" }}>{j.id.slice(0, 8)}…</code> · {j.job_type} ·{" "}
                <strong>{j.status}</strong>
                {j.error_message ? (
                  <span className="ui-text-error" style={{ display: "block", fontSize: "var(--text-sm)" }}>
                    {j.error_message}
                  </span>
                ) : null}
                {j.status === "failed" || j.status === "queued" ? (
                  <div style={{ marginTop: "var(--space-2)" }}>
                    <RetrySyncJobForm jobId={j.id} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="ui-text-muted" style={{ fontSize: "var(--text-xs)", margin: 0 }}>
        Phase 5–6: sync runs inline after selection or manual trigger; analysis runs after successful sync when quota
        allows. Queue/worker can call the same execute entrypoints later.
      </p>
    </section>
  );
}
