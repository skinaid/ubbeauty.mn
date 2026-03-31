import Link from "next/link";
import { Badge, PageHeader, type BadgeVariant } from "@/components/ui";
import { OperatorRetryAnalysisForm } from "@/components/internal/operator-retry-analysis-form";
import { OperatorRetrySyncForm } from "@/components/internal/operator-retry-sync-form";
import {
  type AnalysisJobOpsRow,
  type SyncJobOpsRow,
  getRecentAnalysisJobsForOps,
  getRecentSyncJobsForOps
} from "@/modules/admin/data";

export const dynamic = "force-dynamic";

type JobsPageProps = {
  searchParams: Promise<{ org?: string }>;
};

function jobStatusBadgeVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (s === "failed") return "danger";
  if (s === "running") return "info";
  if (s === "queued" || s === "pending") return "warning";
  if (s === "succeeded" || s === "completed") return "success";
  return "neutral";
}

export default async function AdminJobsPage({ searchParams }: JobsPageProps) {
  const sp = await searchParams;
  const orgFilter = typeof sp.org === "string" && sp.org.length > 0 ? sp.org : null;

  const [syncJobs, analysisJobs] = await Promise.all([
    getRecentSyncJobsForOps(80),
    getRecentAnalysisJobsForOps(80)
  ]);

  const syncFiltered = orgFilter ? syncJobs.filter((j) => j.organization_id === orgFilter) : syncJobs;
  const analysisFiltered = orgFilter ? analysisJobs.filter((j) => j.organization_id === orgFilter) : analysisJobs;

  const syncFailed = syncFiltered.filter((j) => j.status === "failed");
  const syncNonFailed = syncFiltered.filter((j) => j.status !== "failed");
  const analysisFailed = analysisFiltered.filter((j) => j.status === "failed");
  const analysisNonFailed = analysisFiltered.filter((j) => j.status !== "failed");

  return (
    <div className="ui-admin-subpage">
      <div className="ui-admin-pagehead">
        <Link href="/admin" className="ui-admin-back">
          ← Overview
        </Link>
        <PageHeader
          className="ui-page-header--admin"
          title="Sync & analysis jobs"
          description={
            <>
              Recent jobs across all orgs. Retry actions call the same execute entrypoints as the product; outcomes are
              audited.
              {orgFilter ? (
                <>
                  {" "}
                  Filtered to org <code>{orgFilter.slice(0, 8)}…</code> —{" "}
                  <Link href="/admin/jobs" className="ui-link-subtle">
                    clear
                  </Link>
                  .
                </>
              ) : null}
            </>
          }
        />
      </div>

      <section className="ui-admin-section">
        <h2 className="ui-section-title">Meta sync jobs</h2>
        {syncFiltered.length === 0 ? (
          <p className="ui-text-muted">No sync jobs in window.</p>
        ) : (
          <>
            {syncFailed.length > 0 ? (
              <>
                <h3 className="ui-subsection-heading ui-subsection-heading--warning">Failed (recent)</h3>
                <ul className="ui-admin-list ui-admin-list--loose" style={{ marginBottom: "var(--space-4)" }}>
                  {syncFailed.map((j) => (
                    <SyncJobItem key={j.id} j={j} />
                  ))}
                </ul>
              </>
            ) : null}
            {syncNonFailed.length > 0 ? (
              <>
                <h3 className="ui-subsection-heading ui-subsection-heading--muted">Other statuses</h3>
                <ul className="ui-admin-list ui-admin-list--loose">
                  {syncNonFailed.map((j) => (
                    <SyncJobItem key={j.id} j={j} />
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </section>

      <section className="ui-admin-section">
        <h2 className="ui-section-title">Analysis jobs</h2>
        {analysisFiltered.length === 0 ? (
          <p className="ui-text-muted">No analysis jobs in window.</p>
        ) : (
          <>
            {analysisFailed.length > 0 ? (
              <>
                <h3 className="ui-subsection-heading ui-subsection-heading--warning">Failed (recent)</h3>
                <ul className="ui-admin-list ui-admin-list--loose" style={{ marginBottom: "var(--space-4)" }}>
                  {analysisFailed.map((j) => (
                    <AnalysisJobItem key={j.id} j={j} />
                  ))}
                </ul>
              </>
            ) : null}
            {analysisNonFailed.length > 0 ? (
              <>
                <h3 className="ui-subsection-heading ui-subsection-heading--muted">Other statuses</h3>
                <ul className="ui-admin-list ui-admin-list--loose">
                  {analysisNonFailed.map((j) => (
                    <AnalysisJobItem key={j.id} j={j} />
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function SyncJobItem({ j }: { j: SyncJobOpsRow }) {
  return (
    <li>
      <code>{j.id.slice(0, 8)}…</code> · {j.organizations?.name ?? j.organization_id} ·{" "}
      {j.meta_pages?.name ?? "page"} · <strong>{j.job_type}</strong> · <Badge variant={jobStatusBadgeVariant(j.status)}>{j.status}</Badge>
      <span className="ui-text-muted"> · attempts {j.attempt_count}</span>
      <div className="ui-text-faint">{j.created_at}</div>
      {j.error_message ? (
        <div className="ui-text-error" style={{ marginTop: "0.2rem" }}>
          {j.error_message}
        </div>
      ) : null}
      {j.status === "failed" || j.status === "queued" ? (
        <div style={{ marginTop: "0.35rem" }}>
          <OperatorRetrySyncForm jobId={j.id} />
        </div>
      ) : null}
    </li>
  );
}

function AnalysisJobItem({ j }: { j: AnalysisJobOpsRow }) {
  return (
    <li>
      <code>{j.id.slice(0, 8)}…</code> · {j.organizations?.name ?? j.organization_id} ·{" "}
      {j.meta_pages?.name ?? "page"} · <Badge variant={jobStatusBadgeVariant(j.status)}>{j.status}</Badge>
      <span className="ui-text-muted"> · attempts {j.attempt_count}</span>
      {j.source_sync_job_id ? (
        <span className="ui-text-muted">
          {" "}
          · sync <code>{j.source_sync_job_id.slice(0, 8)}…</code>
        </span>
      ) : null}
      <div className="ui-text-faint">{j.created_at}</div>
      {j.error_message ? (
        <div className="ui-text-error" style={{ marginTop: "0.2rem" }}>
          {j.error_message}
        </div>
      ) : null}
      {j.status !== "succeeded" && j.status !== "running" ? (
        <div style={{ marginTop: "0.35rem" }}>
          <OperatorRetryAnalysisForm jobId={j.id} />
        </div>
      ) : null}
    </li>
  );
}
