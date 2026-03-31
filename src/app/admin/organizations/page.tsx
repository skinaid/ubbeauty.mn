import Link from "next/link";
import type { OrganizationAdminListRow } from "@/modules/admin/data";
import { getOrganizationsForAdminList } from "@/modules/admin/data";
import { Button, Card, Input, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

type SearchState = {
  q?: string;
  orgStatus?: string;
  sub?: string;
};

function applyOrgListFilters(rows: OrganizationAdminListRow[], sp: SearchState): OrganizationAdminListRow[] {
  let out = rows;
  const q = (sp.q ?? "").trim().toLowerCase();
  if (q) {
    out = out.filter((r) => {
      if (r.name.toLowerCase().includes(q)) return true;
      if (r.slug.toLowerCase().includes(q)) return true;
      if (r.ownerEmail?.toLowerCase().includes(q)) return true;
      if (r.id.toLowerCase().includes(q)) return true;
      return false;
    });
  }
  const orgStatus = sp.orgStatus ?? "all";
  if (orgStatus !== "all") {
    out = out.filter((r) => r.status === orgStatus);
  }
  const sub = sp.sub ?? "all";
  if (sub === "active") {
    out = out.filter((r) => r.subscriptionStatus === "active" || r.subscriptionStatus === "trialing");
  } else if (sub === "bootstrap") {
    out = out.filter((r) => r.subscriptionStatus === "bootstrap_pending_billing");
  } else if (sub === "issues") {
    out = out.filter((r) => r.hasFailedSync24h || r.hasFailedAnalysis24h);
  }
  return out;
}

export default async function AdminOrganizationsPage({ searchParams }: { searchParams: Promise<SearchState> }) {
  const sp = await searchParams;
  const allRows = await getOrganizationsForAdminList(500);
  const filtered = applyOrgListFilters(allRows, sp);

  return (
    <section className="ui-admin-stack">
      <div className="ui-admin-pagehead">
        <Link href="/admin" className="ui-admin-back">
          ← Overview
        </Link>
        <PageHeader
          className="ui-page-header--admin"
          title="Organizations"
          description="Search and filter customer organizations. Open a row for subscription, Meta, usage, jobs, billing, and
          audit context (read-only)."
        />
      </div>

      <Card padded className="ui-max-w-form">
        <form method="get" className="ui-filter-bar">
          <label className="ui-filter-field">
            <span>Search (name, slug, owner email, id)</span>
            <Input name="q" type="search" defaultValue={sp.q ?? ""} placeholder="Search…" style={{ minWidth: 220 }} />
          </label>
          <label className="ui-filter-field">
            <span>Org status</span>
            <select name="orgStatus" defaultValue={sp.orgStatus ?? "all"} className="ui-select">
              <option value="all">All</option>
              <option value="active">active</option>
              <option value="suspended">suspended</option>
              <option value="canceled">canceled</option>
            </select>
          </label>
          <label className="ui-filter-field">
            <span>Subscription</span>
            <select name="sub" defaultValue={sp.sub ?? "all"} className="ui-select">
              <option value="all">All</option>
              <option value="active">active / trialing</option>
              <option value="bootstrap">bootstrap_pending_billing</option>
              <option value="issues">Job issues (24h)</option>
            </select>
          </label>
          <Button type="submit" variant="primary">
            Apply
          </Button>
          {(sp.q || sp.orgStatus !== "all" || sp.sub !== "all") && (
            <Link href="/admin/organizations" className="ui-text-muted" style={{ paddingBottom: "0.35rem" }}>
              Reset
            </Link>
          )}
        </form>
      </Card>

      <p className="ui-text-muted" style={{ margin: 0, fontSize: "var(--text-xs)" }}>
        Showing <strong>{filtered.length}</strong> of <strong>{allRows.length}</strong> organizations (loaded up to 500).
      </p>

      {filtered.length === 0 ? (
        <p className="ui-text-muted">No organizations match.</p>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Owner</th>
                <th>Org</th>
                <th>Subscription</th>
                <th>Meta</th>
                <th>Pages</th>
                <th>24h health</th>
                <th>Jobs</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/organizations/${o.id}`} className="ui-table__link">
                      {o.name}
                    </Link>
                    <div className="ui-text-faint">
                      <code>{o.slug}</code>
                    </div>
                  </td>
                  <td style={{ maxWidth: 200 }}>
                    {o.ownerEmail ? <span style={{ wordBreak: "break-all" }}>{o.ownerEmail}</span> : "—"}
                  </td>
                  <td className="ui-table__muted">{o.status}</td>
                  <td>
                    {o.subscriptionStatus ? (
                      <>
                        <div>{o.subscriptionStatus}</div>
                        {o.planLabel ? (
                          <div className="ui-text-muted" style={{ fontSize: "0.72rem", margin: 0 }}>
                            {o.planLabel}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ fontSize: "0.75rem" }}>{o.metaConnectionSummary}</td>
                  <td style={{ textAlign: "center" }}>{o.selectedPagesCount}</td>
                  <td style={{ fontSize: "0.75rem" }}>
                    {o.hasFailedSync24h || o.hasFailedAnalysis24h ? (
                      <span className="ui-text-warning-emphasis">
                        {o.hasFailedSync24h ? "sync " : ""}
                        {o.hasFailedAnalysis24h ? "analysis " : ""}
                        fail
                      </span>
                    ) : (
                      <span style={{ color: "var(--color-status-success)", fontWeight: 600 }}>OK</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/admin/jobs?org=${encodeURIComponent(o.id)}`} className="ui-link-subtle" style={{ fontSize: "0.75rem" }}>
                      Open jobs
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
