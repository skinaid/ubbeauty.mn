import Link from "next/link";
import { OperatorRetryAnalysisForm } from "@/components/internal/operator-retry-analysis-form";
import { OperatorRetrySyncForm } from "@/components/internal/operator-retry-sync-form";
import { getRecentAnalysisJobsForOps, getRecentSyncJobsForOps } from "@/modules/admin/data";

export const dynamic = "force-dynamic";

type JobsPageProps = {
  searchParams: Promise<{ org?: string }>;
};

export default async function InternalOpsJobsPage({ searchParams }: JobsPageProps) {
  const sp = await searchParams;
  const orgFilter = typeof sp.org === "string" && sp.org.length > 0 ? sp.org : null;

  const [syncJobs, analysisJobs] = await Promise.all([
    getRecentSyncJobsForOps(80),
    getRecentAnalysisJobsForOps(80)
  ]);

  const syncFiltered = orgFilter ? syncJobs.filter((j) => j.organization_id === orgFilter) : syncJobs;
  const analysisFiltered = orgFilter ? analysisJobs.filter((j) => j.organization_id === orgFilter) : analysisJobs;

  return (
    <section style={{ display: "grid", gap: "1.5rem" }}>
      <div
        role="status"
        style={{
          padding: "0.75rem 1rem",
          borderRadius: 8,
          border: "1px solid #c4b5fd",
          background: "#f5f3ff",
          fontSize: "0.9rem",
          color: "#4c1d95"
        }}
      >
        <strong>Transitional route</strong> — sync and analysis job ops now live under{" "}
        <Link href="/admin/jobs" style={{ color: "#5b21b6", fontWeight: 600 }}>
          /admin/jobs
        </Link>{" "}
        (system admin). This page is unchanged for bookmarks; prefer the admin control plane.
      </div>
      <div>
        <h1 style={{ margin: "0 0 0.35rem" }}>Sync &amp; analysis jobs</h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem" }}>
          Recent jobs across all orgs. Retry actions call the same execute entrypoints as the product; outcomes are
          audited.
          {orgFilter ? (
            <>
              {" "}
              Filtered to org <code>{orgFilter.slice(0, 8)}…</code> —{" "}
              <Link href="/admin/jobs" style={{ color: "#4f46e5" }}>
                clear
              </Link>
              .
            </>
          ) : null}
        </p>
      </div>

      <section>
        <h2 style={{ marginBottom: "0.5rem" }}>Meta sync jobs</h2>
        {syncFiltered.length === 0 ? (
          <p>No sync jobs in window.</p>
        ) : (
          <ul style={{ paddingLeft: "1rem", fontSize: "0.85rem" }}>
            {syncFiltered.map((j) => (
              <li key={j.id} style={{ marginBottom: "0.65rem" }}>
                <code>{j.id.slice(0, 8)}…</code> · {j.organizations?.name ?? j.organization_id} ·{" "}
                {j.meta_pages?.name ?? "page"} · <strong>{j.job_type}</strong> · <StatusPill status={j.status} />
                <span style={{ color: "#64748b" }}> · attempts {j.attempt_count}</span>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{j.created_at}</div>
                {j.error_message ? (
                  <div style={{ color: "#b91c1c", fontSize: "0.8rem", marginTop: "0.2rem" }}>{j.error_message}</div>
                ) : null}
                {j.status === "failed" || j.status === "queued" ? (
                  <div style={{ marginTop: "0.35rem" }}>
                    <OperatorRetrySyncForm jobId={j.id} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 style={{ marginBottom: "0.5rem" }}>Analysis jobs</h2>
        {analysisFiltered.length === 0 ? (
          <p>No analysis jobs in window.</p>
        ) : (
          <ul style={{ paddingLeft: "1rem", fontSize: "0.85rem" }}>
            {analysisFiltered.map((j) => (
              <li key={j.id} style={{ marginBottom: "0.65rem" }}>
                <code>{j.id.slice(0, 8)}…</code> · {j.organizations?.name ?? j.organization_id} ·{" "}
                {j.meta_pages?.name ?? "page"} · <StatusPill status={j.status} />
                <span style={{ color: "#64748b" }}> · attempts {j.attempt_count}</span>
                {j.source_sync_job_id ? (
                  <span style={{ color: "#64748b" }}>
                    {" "}
                    · sync <code>{j.source_sync_job_id.slice(0, 8)}…</code>
                  </span>
                ) : null}
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{j.created_at}</div>
                {j.error_message ? (
                  <div style={{ color: "#b91c1c", fontSize: "0.8rem", marginTop: "0.2rem" }}>{j.error_message}</div>
                ) : null}
                {j.status !== "succeeded" && j.status !== "running" ? (
                  <div style={{ marginTop: "0.35rem" }}>
                    <OperatorRetryAnalysisForm jobId={j.id} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const failed = status === "failed";
  const running = status === "running";
  return (
    <strong
      style={{
        color: failed ? "#b91c1c" : running ? "#1d4ed8" : "#0f172a"
      }}
    >
      {status}
    </strong>
  );
}
