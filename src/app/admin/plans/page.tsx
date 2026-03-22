import Link from "next/link";
import { getPlansForAdminDirectory, getSubscriptionCountsByPlanId } from "@/modules/admin/data";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const [plans, subCounts] = await Promise.all([getPlansForAdminDirectory(), getSubscriptionCountsByPlanId()]);

  return (
    <div className="ui-admin-stack">
      <div className="ui-admin-pagehead">
        <Link href="/admin" className="ui-admin-back">
          ← Overview
        </Link>
        <PageHeader
          className="ui-page-header--admin"
          title="Plans"
          description={
            <>
              Read-only directory from <code>plans</code> (including inactive). Customer-facing pricing:{" "}
              <Link href="/pricing" className="ui-link-subtle">
                /pricing
              </Link>
              . Subscription counts are non-mutating aggregates.
            </>
          }
        />
      </div>

      {plans.length === 0 ? (
        <p className="ui-text-muted">No plan rows.</p>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table" style={{ fontSize: "var(--text-sm)" }}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>State</th>
                <th>Price / mo</th>
                <th>Max pages</th>
                <th>Syncs / day</th>
                <th>AI reports / mo</th>
                <th>Retention (days)</th>
                <th>Subscriptions</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => {
                const subs = subCounts[p.id] ?? 0;
                return (
                  <tr key={p.id}>
                    <td>
                      <code style={{ fontSize: "0.75rem" }}>{p.code}</code>
                    </td>
                    <td>{p.name}</td>
                    <td>
                      {p.is_active ? (
                        <span style={{ color: "var(--color-status-success)", fontWeight: 600 }}>active</span>
                      ) : (
                        <span className="ui-text-muted">inactive</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {p.price_monthly} {p.currency}
                    </td>
                    <td>{p.max_pages}</td>
                    <td>{p.syncs_per_day}</td>
                    <td>{p.monthly_ai_reports}</td>
                    <td>{p.report_retention_days}</td>
                    <td>{subs}</td>
                    <td className="ui-text-faint">{p.updated_at?.replace("T", " ").slice(0, 19) ?? "—"}</td>
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
