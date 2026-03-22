import { Alert, Badge } from "@/components/ui";
import type {
  AnalysisJobStatusView,
  AnalysisReportHistoryView,
  AnalysisReportView,
  RecommendationRowView
} from "@/modules/ai/data";

const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

type SignalLike = { title?: string; detail?: string; severity?: string };
type ExtraLike = { title?: string; detail?: string };

function formatTs(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function jobStatusBadgeVariant(status: string): "danger" | "warning" | "success" | "neutral" | "info" {
  const s = status.toLowerCase();
  if (s === "failed") return "danger";
  if (s === "running") return "info";
  if (s === "queued" || s === "pending") return "warning";
  if (s === "succeeded" || s === "completed") return "success";
  return "neutral";
}

function historyStatusBadgeVariant(status: string): "danger" | "warning" | "success" | "neutral" | "info" {
  const s = status.toLowerCase();
  if (s === "failed") return "danger";
  if (s === "ready" || s === "succeeded") return "success";
  return "neutral";
}

export function AiInsightsBlock(props: {
  report: AnalysisReportView | null;
  recommendations: RecommendationRowView[];
  analysisJob: AnalysisJobStatusView | null;
  recentAnalysisJobs?: AnalysisJobStatusView[];
  reportHistory?: AnalysisReportHistoryView[];
}) {
  const { report, recommendations, analysisJob, recentAnalysisJobs = [], reportHistory = [] } = props;

  const findings = report?.findings_json;
  const findingsObj =
    findings && typeof findings === "object" && !Array.isArray(findings)
      ? (findings as Record<string, unknown>)
      : {};

  const signals = Array.isArray(findingsObj.deterministic_signals)
    ? (findingsObj.deterministic_signals as SignalLike[])
    : [];
  const extras = Array.isArray(findingsObj.llm_extra_findings)
    ? (findingsObj.llm_extra_findings as ExtraLike[])
    : [];

  const sortedRecs = [...recommendations].sort(
    (a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
  );

  const showFailure =
    !report && analysisJob?.status === "failed" && analysisJob.error_message;

  return (
    <div className="ui-ai-insights">
      <h4 className="ui-ai-insights__title">AI insights</h4>
      <p className="ui-ai-insights__lead">
        Signals come from normalized metrics only (no raw provider payloads in the model path). Recommendations are
        stored in the <code>recommendations</code> table; the report row keeps pointers for audit.
      </p>

      {showFailure ? (
        <Alert variant="danger" className="ui-operational-alert">
          <strong>Last analysis failed</strong>
          <p style={{ margin: "0.35rem 0 0" }}>{analysisJob?.error_message}</p>
          <ul className="ui-ai-insights__list" style={{ margin: "0.35rem 0 0" }}>
            <li>Status: {analysisJob?.status}</li>
            <li>Scheduled: {formatTs(analysisJob?.scheduled_at)}</li>
            <li>Started: {formatTs(analysisJob?.started_at)}</li>
            <li>Finished: {formatTs(analysisJob?.finished_at)}</li>
            <li>
              Source sync job:{" "}
              {analysisJob?.source_sync_job_id ? (
                <code style={{ fontSize: "0.75rem" }}>{analysisJob.source_sync_job_id.slice(0, 8)}…</code>
              ) : (
                "— (manual / scheduled)"
              )}
            </li>
          </ul>
        </Alert>
      ) : null}

      {report ? (
        <>
          <p className="ui-ai-insights__block-label">Summary</p>
          <p className="ui-ai-insights__summary">{report.summary}</p>
          {report.model_name ? (
            <p className="ui-text-faint">Model: {report.model_name}</p>
          ) : (
            <p className="ui-text-faint">Deterministic narrative (no LLM)</p>
          )}

          <p className="ui-ai-insights__block-label">Key signals (rules)</p>
          <ul className="ui-ai-insights__list">
            {signals.map((s, i) => (
              <li key={i}>
                <strong>{s.title ?? "Signal"}</strong> ({s.severity ?? "info"}): {s.detail ?? ""}
              </li>
            ))}
          </ul>

          {extras.length > 0 ? (
            <>
              <p className="ui-ai-insights__block-label">Additional notes (model)</p>
              <ul className="ui-ai-insights__list">
                {extras.map((e, i) => (
                  <li key={i}>
                    <strong>{e.title}</strong>: {e.detail}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <p className="ui-ai-insights__block-label">
            Recommendations ({sortedRecs.length}) — from <code>recommendations</code> table
          </p>
          <ol className="ui-ai-insights__ol">
            {sortedRecs.map((r) => (
              <li key={r.id} style={{ marginBottom: "0.35rem" }}>
                <span className="ui-ai-insights__rec-meta">
                  {r.priority} · {r.category}
                </span>
                <br />
                <strong>{r.title}</strong> — {r.description}
              </li>
            ))}
          </ol>
        </>
      ) : !showFailure ? (
        <p className="ui-text-muted">No ready report yet. Run a successful sync (or use regenerate) when monthly AI quota allows.</p>
      ) : null}

      {recentAnalysisJobs.length > 0 ? (
        <details style={{ marginTop: "0.65rem" }}>
          <summary>
            Recent analysis runs ({recentAnalysisJobs.length})
          </summary>
          <ul className="ui-ai-insights__list" style={{ margin: "0.35rem 0 0" }}>
            {recentAnalysisJobs.map((j) => (
              <li key={j.id} style={{ marginBottom: "0.35rem" }}>
                <code>{j.id.slice(0, 8)}…</code> · <Badge variant={jobStatusBadgeVariant(j.status)}>{j.status}</Badge>
                {j.error_message ? <span className="ui-ai-insights__detail-error">{j.error_message}</span> : null}
                <span className="ui-ai-insights__detail-meta">
                  scheduled {formatTs(j.scheduled_at)} · finished {formatTs(j.finished_at)}
                </span>
                {j.source_sync_job_id ? (
                  <span className="ui-ai-insights__detail-meta">
                    sync job <code>{j.source_sync_job_id.slice(0, 8)}…</code>
                  </span>
                ) : (
                  <span className="ui-ai-insights__detail-meta">no sync linkage</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {reportHistory.length > 1 ? (
        <details style={{ marginTop: "0.5rem" }}>
          <summary>Report history (compare over time)</summary>
          <ul className="ui-ai-insights__list" style={{ margin: "0.35rem 0 0" }}>
            {reportHistory.map((h) => (
              <li key={h.id} style={{ marginBottom: "0.35rem" }}>
                <Badge variant={historyStatusBadgeVariant(h.status)}>{h.status}</Badge> · {formatTs(h.created_at)}
                <div className="ui-ai-insights__history-snippet">
                  {h.summary.slice(0, 140)}
                  {h.summary.length > 140 ? "…" : ""}
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
