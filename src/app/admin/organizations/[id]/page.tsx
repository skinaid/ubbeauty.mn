import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { getOrganizationAdminDetail } from "@/modules/admin/data";

export const dynamic = "force-dynamic";

function StatusPill(props: { status: string }) {
  const bad = props.status === "failed" || props.status === "error" || props.status === "suspended";
  const warn = props.status === "past_due" || props.status === "pending" || props.status === "queued";
  const color = bad ? "#b91c1c" : warn ? "#b45309" : "#334155";
  return (
    <span style={{ fontSize: "0.75rem", fontWeight: 600, color }}>
      {props.status}
    </span>
  );
}

export default async function AdminOrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getOrganizationAdminDetail(id);
  if (!detail) {
    notFound();
  }

  const { organization: org, subscriptionWithPlan, usageCounters, recentSyncJobs, recentAnalysisJobs, recentInvoices, recentPaymentTransactions, recentBillingEvents, recentAuditEvents } = detail;

  const owners = org.organization_members.filter((m) => m.role === "owner" && m.status === "active");

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <Link href="/admin/organizations" style={{ fontSize: "0.85rem", color: "#7c3aed" }}>
          ← Organizations
        </Link>
        <h1 style={{ margin: "0.5rem 0 0.25rem", fontSize: "1.35rem", fontWeight: 700 }}>{org.name}</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
          <code>{org.slug}</code> · org <code>{org.id}</code> · status <strong>{org.status}</strong>
        </p>
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
          Created {org.created_at} · Updated {org.updated_at}
        </p>
      </div>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Ownership</h2>
        {owners.length === 0 ? (
          <p style={{ color: "#64748b", margin: 0 }}>No active owner membership found.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {owners.map((m, idx) => (
              <li key={m.profiles?.id ?? `owner-${idx}`}>
                {m.profiles?.email ?? "—"}
                {m.profiles?.full_name ? ` · ${m.profiles.full_name}` : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Subscription</h2>
        {subscriptionWithPlan ? (
          <div style={{ fontSize: "0.88rem", display: "grid", gap: "0.35rem" }}>
            <div>
              Status: <StatusPill status={subscriptionWithPlan.status} />
            </div>
            {subscriptionWithPlan.plans ? (
              <div>
                Plan: {subscriptionWithPlan.plans.name} ({subscriptionWithPlan.plans.code}) · max pages{" "}
                {subscriptionWithPlan.plans.max_pages} · syncs/day {subscriptionWithPlan.plans.syncs_per_day} · AI/mo{" "}
                {subscriptionWithPlan.plans.monthly_ai_reports}
              </div>
            ) : (
              <div>Plan id: {subscriptionWithPlan.plan_id}</div>
            )}
            <div>
              Period: {subscriptionWithPlan.current_period_start} → {subscriptionWithPlan.current_period_end ?? "—"}
            </div>
          </div>
        ) : (
          <p style={{ color: "#64748b", margin: 0 }}>No subscription row.</p>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Usage counters (recent periods)</h2>
        {usageCounters.length === 0 ? (
          <p style={{ color: "#64748b", margin: 0 }}>None.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ ...tableStyle, fontSize: "0.78rem" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Period</th>
                  <th style={thStyle}>Metric</th>
                  <th style={thStyle}>Value</th>
                </tr>
              </thead>
              <tbody>
                {usageCounters.map((u) => (
                  <tr key={u.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>{u.period_key}</td>
                    <td style={tdStyle}>
                      <code>{u.metric_key}</code>
                    </td>
                    <td style={tdStyle}>{u.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Meta connections</h2>
        {org.meta_connections.length === 0 ? (
          <p style={{ color: "#64748b", margin: 0 }}>No Meta connection.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.85rem" }}>
            {org.meta_connections.map((m, i) => (
              <li key={`mc-${i}`} style={{ marginBottom: "0.35rem" }}>
                <strong>{m.status}</strong>
                {m.last_validated_at ? ` · validated ${m.last_validated_at}` : null}
                {m.last_error ? (
                  <span style={{ color: "#b91c1c", display: "block", fontSize: "0.75rem" }}>{m.last_error}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Meta pages ({org.meta_pages.length})</h2>
        {org.meta_pages.length === 0 ? (
          <p style={{ color: "#64748b", margin: 0 }}>No pages.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Selected</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Last sync</th>
                </tr>
              </thead>
              <tbody>
                {org.meta_pages.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>
                      {p.name}
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                        <code>{p.meta_page_id}</code>
                      </div>
                    </td>
                    <td style={tdStyle}>{p.is_selected ? "yes" : "no"}</td>
                    <td style={tdStyle}>{p.status}</td>
                    <td style={tdStyle}>{p.last_synced_at ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ ...h2Style, margin: 0 }}>Recent sync jobs</h2>
          <Link href={`/admin/jobs?org=${encodeURIComponent(org.id)}`} style={{ fontSize: "0.85rem", color: "#7c3aed" }}>
            All jobs (filtered) →
          </Link>
        </div>
        <JobTable
          rows={recentSyncJobs.map((j) => ({
            id: j.id,
            status: j.status,
            jobType: j.job_type,
            attempts: j.attempt_count,
            created: j.created_at,
            error: j.error_message,
            page: j.meta_pages?.name
          }))}
        />
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Recent analysis jobs</h2>
        <JobTable
          rows={recentAnalysisJobs.map((j) => ({
            id: j.id,
            status: j.status,
            jobType: "analysis",
            attempts: j.attempt_count,
            created: j.created_at,
            error: j.error_message,
            page: j.meta_pages?.name
          }))}
        />
      </section>

      <section style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ ...h2Style, margin: 0 }}>Recent invoices</h2>
          <Link href="/admin/billing" style={{ fontSize: "0.85rem", color: "#7c3aed" }}>
            Global billing →
          </Link>
        </div>
        {recentInvoices.length === 0 ? (
          <p style={{ color: "#64748b", margin: 0 }}>None.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ ...tableStyle, fontSize: "0.78rem" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Created</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>QPay / sender</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>{inv.created_at}</td>
                    <td style={tdStyle}>
                      <StatusPill status={inv.status} />
                    </td>
                    <td style={tdStyle}>
                      {inv.amount} {inv.currency}
                    </td>
                    <td style={tdStyle}>
                      <code style={{ fontSize: "0.7rem" }}>{inv.provider_invoice_id ?? inv.qpay_sender_invoice_no}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Recent payment transactions</h2>
        {recentPaymentTransactions.length === 0 ? (
          <p style={{ color: "#64748b", margin: 0 }}>None.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ ...tableStyle, fontSize: "0.78rem" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Created</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentPaymentTransactions.map((tx) => (
                  <tr key={tx.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>{tx.created_at}</td>
                    <td style={tdStyle}>{tx.status}</td>
                    <td style={tdStyle}>
                      {tx.amount} {tx.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Recent billing events</h2>
        {recentBillingEvents.length === 0 ? (
          <p style={{ color: "#64748b", margin: 0 }}>None.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.8rem" }}>
            {recentBillingEvents.map((ev) => (
              <li key={ev.id} style={{ marginBottom: "0.35rem" }}>
                <code>{ev.event_type}</code> · {ev.created_at}
                {ev.processing_error ? (
                  <span style={{ color: "#b91c1c", display: "block" }}>{ev.processing_error}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Operator audit (this org)</h2>
        {recentAuditEvents.length === 0 ? (
          <p style={{ color: "#64748b", margin: 0 }}>None.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.8rem" }}>
            {recentAuditEvents.map((e) => (
              <li key={e.id} style={{ marginBottom: "0.45rem" }}>
                <strong>{e.action_type}</strong> · {e.actor_email} · {e.created_at}
                <div style={{ color: "#64748b" }}>
                  {e.resource_type} <code>{e.resource_id}</code>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const sectionStyle: CSSProperties = {
  padding: "1rem 1.15rem",
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 8
};

const h2Style: CSSProperties = {
  margin: "0 0 0.65rem",
  fontSize: "1rem",
  fontWeight: 600
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.82rem"
};

const thStyle: CSSProperties = { padding: "0.45rem 0.5rem", textAlign: "left", color: "#475569" };
const tdStyle: CSSProperties = { padding: "0.45rem 0.5rem", verticalAlign: "top" };

function JobTable(props: {
  rows: Array<{
    id: string;
    status: string;
    jobType: string;
    attempts: number;
    created: string;
    error: string | null;
    page?: string;
  }>;
}) {
  if (props.rows.length === 0) {
    return <p style={{ color: "#64748b", margin: 0 }}>None.</p>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Created</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Page</th>
            <th style={thStyle}>Error</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((j) => (
            <tr key={j.id} style={{ borderTop: "1px solid #f1f5f9" }}>
              <td style={tdStyle}>{j.created}</td>
              <td style={tdStyle}>{j.jobType}</td>
              <td style={tdStyle}>
                <StatusPill status={j.status} /> ({j.attempts})
              </td>
              <td style={tdStyle}>{j.page ?? "—"}</td>
              <td style={{ ...tdStyle, color: j.error ? "#b91c1c" : "#64748b", maxWidth: 280 }}>
                {j.error ? j.error.slice(0, 200) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
