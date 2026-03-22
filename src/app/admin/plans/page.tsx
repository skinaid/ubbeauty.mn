import Link from "next/link";
import { getPlansForAdminDirectory, getSubscriptionCountsByPlanId } from "@/modules/admin/data";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const [plans, subCounts] = await Promise.all([getPlansForAdminDirectory(), getSubscriptionCountsByPlanId()]);

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div>
        <Link href="/admin" style={{ fontSize: "0.85rem", color: "#7c3aed" }}>
          ← Overview
        </Link>
        <h1 style={{ margin: "0.5rem 0 0.35rem", fontSize: "1.35rem", fontWeight: 700 }}>Plans</h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem", maxWidth: "44rem" }}>
          Read-only directory from <code>plans</code> (including inactive). Customer-facing pricing:{" "}
          <Link href="/pricing" style={{ color: "#7c3aed" }}>
            /pricing
          </Link>
          . Subscription counts are non-mutating aggregates.
        </p>
      </div>

      {plans.length === 0 ? (
        <p style={{ color: "#64748b" }}>No plan rows.</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Code</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Name</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>State</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Price / mo</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Max pages</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Syncs / day</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>AI reports / mo</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Retention (days)</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Subscriptions</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => {
                const subs = subCounts[p.id] ?? 0;
                return (
                  <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.45rem 0.65rem" }}>
                      <code style={{ fontSize: "0.75rem" }}>{p.code}</code>
                    </td>
                    <td style={{ padding: "0.45rem 0.65rem" }}>{p.name}</td>
                    <td style={{ padding: "0.45rem 0.65rem" }}>
                      {p.is_active ? (
                        <span style={{ color: "#15803d", fontWeight: 600 }}>active</span>
                      ) : (
                        <span style={{ color: "#64748b" }}>inactive</span>
                      )}
                    </td>
                    <td style={{ padding: "0.45rem 0.65rem", whiteSpace: "nowrap" }}>
                      {p.price_monthly} {p.currency}
                    </td>
                    <td style={{ padding: "0.45rem 0.65rem" }}>{p.max_pages}</td>
                    <td style={{ padding: "0.45rem 0.65rem" }}>{p.syncs_per_day}</td>
                    <td style={{ padding: "0.45rem 0.65rem" }}>{p.monthly_ai_reports}</td>
                    <td style={{ padding: "0.45rem 0.65rem" }}>{p.report_retention_days}</td>
                    <td style={{ padding: "0.45rem 0.65rem" }}>{subs}</td>
                    <td style={{ padding: "0.45rem 0.65rem", color: "#94a3b8", fontSize: "0.75rem" }}>
                      {p.updated_at?.replace("T", " ").slice(0, 19) ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
