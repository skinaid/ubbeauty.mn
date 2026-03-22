import Link from "next/link";
import type { ReactNode } from "react";
import { getOpsOverviewCounts, getRecentOperatorAuditEvents } from "@/modules/admin/data";

export const dynamic = "force-dynamic";

const OPS = {
  organizations: "/admin/organizations",
  billing: "/admin/billing",
  jobs: "/admin/jobs"
} as const;

type OverviewProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminOverviewPage({ searchParams }: OverviewProps) {
  const sp = (await (searchParams ?? Promise.resolve({}))) as { error?: string };
  const permError = sp.error === "insufficient_permissions";

  const [counts, audit] = await Promise.all([getOpsOverviewCounts(), getRecentOperatorAuditEvents(30)]);

  return (
    <div style={{ display: "grid", gap: "1.75rem" }}>
      {permError ? (
        <div
          role="alert"
          style={{
            padding: "0.75rem 1rem",
            borderRadius: 8,
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#9f1239",
            fontSize: "0.9rem"
          }}
        >
          <strong>Permission denied</strong> — that action requires an <strong>operator</strong> or{" "}
          <strong>super admin</strong> role (or legacy env allowlist). Contact a super admin if you need elevated
          access.
        </div>
      ) : null}
      <header>
        <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700 }}>Overview</h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem", maxWidth: "48rem" }}>
          Platform health at a glance. Counts use service-role reads (same queries as internal ops). Mutations
          stay on reconciliation / job retry flows — not on this page.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(158px, 1fr))",
          gap: "0.75rem"
        }}
      >
        <StatCard label="Organizations" value={counts.organizationCount} href={OPS.organizations} />
        <StatCard
          label="Active subscriptions"
          value={counts.activeSubscriptionCount}
          href={OPS.organizations}
          hint="active + trialing"
        />
        <StatCard label="Pending invoices" value={counts.pendingInvoiceCount} href={OPS.billing} />
        <StatCard
          label="Pending past due"
          value={counts.pendingPastDueCount}
          href={OPS.billing}
          warn={counts.pendingPastDueCount > 0}
        />
        <StatCard
          label="Stale pending (3d+)"
          value={counts.pendingOlderThan3dCount}
          href={OPS.billing}
          warn={counts.pendingOlderThan3dCount > 0}
        />
        <StatCard
          label="Failed sync (24h)"
          value={counts.failedSyncRecentCount}
          href={OPS.jobs}
          warn={counts.failedSyncRecentCount > 0}
        />
        <StatCard
          label="Failed analysis (24h)"
          value={counts.failedAnalysisRecentCount}
          href={OPS.jobs}
          warn={counts.failedAnalysisRecentCount > 0}
        />
      </section>

      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
          padding: "1rem 1.25rem",
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 8
        }}
      >
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginRight: "0.5rem" }}>
          Quick links
        </span>
        <QuickLink href={OPS.organizations}>Organizations</QuickLink>
        <QuickLink href={OPS.billing}>Billing</QuickLink>
        <QuickLink href={OPS.jobs}>Jobs</QuickLink>
        <QuickLink href="/admin/audit">Audit log</QuickLink>
        <QuickLink href="/admin/plans">Plans</QuickLink>
        <QuickLink href="/admin/settings">Settings</QuickLink>
      </section>

      <section id="recent-audit">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Recent operator audit</h2>
          <Link href="/admin/audit" style={{ fontSize: "0.85rem", color: "#7c3aed" }}>
            View all →
          </Link>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0.35rem 0 0.75rem" }}>
          Last 30 events · also stored in <code>operator_audit_events</code>
        </p>
        {audit.length === 0 ? (
          <p style={{ color: "#64748b", margin: 0 }}>No operator actions recorded yet.</p>
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                  <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "#475569" }}>Time (UTC)</th>
                  <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "#475569" }}>Action</th>
                  <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "#475569" }}>Actor</th>
                  <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "#475569" }}>Resource</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((row) => (
                  <tr key={row.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.45rem 0.75rem", whiteSpace: "nowrap", color: "#64748b" }}>
                      {new Date(row.created_at).toISOString().replace("T", " ").slice(0, 19)}
                    </td>
                    <td style={{ padding: "0.45rem 0.75rem" }}>
                      <code style={{ fontSize: "0.75rem" }}>{row.action_type}</code>
                    </td>
                    <td style={{ padding: "0.45rem 0.75rem" }}>{row.actor_email}</td>
                    <td style={{ padding: "0.45rem 0.75rem", color: "#64748b" }}>
                      {row.resource_type}{" "}
                      <code style={{ fontSize: "0.72rem" }}>{row.resource_id.slice(0, 14)}…</code>
                      {row.organization_id ? (
                        <span>
                          {" "}
                          · org <code style={{ fontSize: "0.72rem" }}>{row.organization_id.slice(0, 8)}…</code>
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard(props: {
  label: string;
  value: number;
  href: string;
  warn?: boolean;
  hint?: string;
}) {
  return (
    <Link
      href={props.href}
      style={{
        border: `1px solid ${props.warn ? "#fecaca" : "#e2e8f0"}`,
        borderRadius: 8,
        padding: "0.75rem 1rem",
        background: props.warn ? "#fff7ed" : "#fff",
        textDecoration: "none",
        color: "inherit",
        display: "block"
      }}
    >
      <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {props.label}
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.15rem", lineHeight: 1.2 }}>{props.value}</div>
      {props.hint ? (
        <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: "0.2rem" }}>{props.hint}</div>
      ) : null}
    </Link>
  );
}

function QuickLink(props: { href: string; children: ReactNode }) {
  return (
    <Link
      href={props.href}
      style={{
        fontSize: "0.85rem",
        padding: "0.35rem 0.65rem",
        borderRadius: 6,
        background: "#f1f5f9",
        color: "#334155",
        textDecoration: "none",
        fontWeight: 500
      }}
    >
      {props.children}
    </Link>
  );
}
