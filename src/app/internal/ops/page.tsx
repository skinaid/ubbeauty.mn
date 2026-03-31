import Link from "next/link";
import { getOpsOverviewCounts, getRecentOperatorAuditEvents } from "@/modules/admin/data";

export const dynamic = "force-dynamic";

export default async function InternalOpsOverviewPage() {
  const [counts, audit] = await Promise.all([getOpsOverviewCounts(), getRecentOperatorAuditEvents(25)]);

  return (
    <section style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <h1 style={{ margin: "0 0 0.35rem" }}>Overview</h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem" }}>
          Private beta health snapshot. Counts use service-role reads; operator actions are written to{" "}
          <code>operator_audit_events</code>.
        </p>
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "0.75rem"
        }}
      >
        <Stat label="Organizations" value={counts.organizationCount} href="/admin/organizations" />
        <Stat
          label="Active subscriptions"
          value={counts.activeSubscriptionCount}
          href="/admin/organizations"
        />
        <Stat label="Pending invoices" value={counts.pendingInvoiceCount} href="/admin/billing" />
        <Stat
          label="Pending past due"
          value={counts.pendingPastDueCount}
          href="/admin/billing"
          warn={counts.pendingPastDueCount > 0}
        />
        <Stat
          label="Stale pending (3d+)"
          value={counts.pendingOlderThan3dCount}
          href="/admin/billing"
          warn={counts.pendingOlderThan3dCount > 0}
        />
        <Stat
          label="Failed sync (24h)"
          value={counts.failedSyncRecentCount}
          href="/admin/jobs"
          warn={counts.failedSyncRecentCount > 0}
        />
        <Stat
          label="Failed analysis (24h)"
          value={counts.failedAnalysisRecentCount}
          href="/admin/jobs"
          warn={counts.failedAnalysisRecentCount > 0}
        />
      </section>

      <section style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        <Link href="/admin/organizations" style={{ color: "#4f46e5" }}>
          Browse organizations →
        </Link>
        <Link href="/admin/jobs" style={{ color: "#4f46e5" }}>
          Sync &amp; analysis jobs →
        </Link>
        <Link href="/admin/billing" style={{ color: "#4f46e5" }}>
          Billing &amp; reconciliation →
        </Link>
      </section>

      <section>
        <h2 style={{ marginBottom: "0.5rem" }}>Recent operator audit</h2>
        {audit.length === 0 ? (
          <p style={{ color: "#64748b" }}>No operator actions recorded yet.</p>
        ) : (
          <ul style={{ paddingLeft: "1.1rem", fontSize: "0.85rem", margin: 0 }}>
            {audit.map((row) => (
              <li key={row.id} style={{ marginBottom: "0.45rem" }}>
                <strong>{row.action_type}</strong> · {row.actor_email} · {new Date(row.created_at).toISOString()}
                {row.organization_id ? (
                  <span style={{ color: "#64748b" }}>
                    {" "}
                    · org <code>{row.organization_id.slice(0, 8)}…</code>
                  </span>
                ) : null}
                <span style={{ color: "#64748b" }}>
                  {" "}
                  · {row.resource_type} <code>{row.resource_id.slice(0, 12)}</code>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function Stat(props: { label: string; value: number; href: string; warn?: boolean }) {
  return (
    <Link
      href={props.href}
      style={{
        border: `1px solid ${props.warn ? "#fecaca" : "#e2e8f0"}`,
        borderRadius: 8,
        padding: "0.75rem 1rem",
        background: props.warn ? "#fff7ed" : "#fff",
        textDecoration: "none",
        color: "inherit"
      }}
    >
      <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.02em" }}>
        {props.label}
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.15rem" }}>{props.value}</div>
    </Link>
  );
}
