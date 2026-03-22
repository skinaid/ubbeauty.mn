import Link from "next/link";
import type { AnalysisJobStatusView } from "@/modules/ai/data";
import type { SyncJobSummary } from "@/modules/sync/data";
import { Alert } from "@/components/ui";

export function OperationalHealthBanner(props: {
  failedSync: SyncJobSummary | null;
  failedAnalysis: AnalysisJobStatusView | null;
}) {
  if (!props.failedSync && !props.failedAnalysis) {
    return null;
  }

  return (
    <Alert variant="danger" className="ui-operational-alert">
      <p style={{ margin: "0 0 var(--space-2)", fontWeight: 600 }}>Operational alerts</p>
      <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "var(--text-sm)" }}>
        {props.failedSync ? (
          <li style={{ marginBottom: "0.35rem" }}>
            <strong>Latest failed sync</strong> · job <code>{props.failedSync.id.slice(0, 8)}…</code> ·{" "}
            {props.failedSync.job_type}
            {props.failedSync.error_message ? (
              <span className="ui-text-error" style={{ display: "block", marginTop: "0.2rem" }}>
                {props.failedSync.error_message}
              </span>
            ) : null}
            <span className="ui-text-faint" style={{ display: "block", marginTop: "0.25rem" }}>
              Retry from <strong>Recent sync jobs</strong> below (same idempotent execute entrypoint).
            </span>
          </li>
        ) : null}
        {props.failedAnalysis ? (
          <li>
            <strong>Latest failed analysis</strong> · job <code>{props.failedAnalysis.id.slice(0, 8)}…</code>
            {props.failedAnalysis.error_message ? (
              <span className="ui-text-error" style={{ display: "block", marginTop: "0.2rem" }}>
                {props.failedAnalysis.error_message}
              </span>
            ) : null}
            <span className="ui-text-faint" style={{ display: "block", marginTop: "0.25rem" }}>
              Use <strong>Regenerate AI</strong> on a page card, or internal ops job retry.{" "}
              <Link href="/billing">Billing</Link> for payment issues.
            </span>
          </li>
        ) : null}
      </ul>
    </Alert>
  );
}
