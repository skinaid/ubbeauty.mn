import Link from "next/link";
import type { OrganizationAdminListRow } from "@/modules/admin/data";
import { getOrganizationsForAdminList } from "@/modules/admin/data";

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
    <section style={{ display: "grid", gap: "1.25rem" }}>
      <div>
        <Link href="/admin" style={{ fontSize: "0.85rem", color: "#7c3aed" }}>
          ← Overview
        </Link>
        <h1 style={{ margin: "0.5rem 0 0.35rem", fontSize: "1.35rem", fontWeight: 700 }}>Organizations</h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "0.92rem", maxWidth: "42rem" }}>
          Search and filter customer organizations. Open a row for subscription, Meta, usage, jobs, billing, and
          audit context (read-only).
        </p>
      </div>

      <form
        method="get"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.65rem",
          alignItems: "flex-end",
          padding: "1rem",
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 8
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.8rem" }}>
          <span style={{ color: "#64748b" }}>Search (name, slug, owner email, id)</span>
          <input
            name="q"
            type="search"
            defaultValue={sp.q ?? ""}
            placeholder="Search…"
            style={{ padding: "0.4rem 0.5rem", minWidth: 220, borderRadius: 6, border: "1px solid #cbd5e1" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.8rem" }}>
          <span style={{ color: "#64748b" }}>Org status</span>
          <select
            name="orgStatus"
            defaultValue={sp.orgStatus ?? "all"}
            style={{ padding: "0.4rem 0.5rem", borderRadius: 6, border: "1px solid #cbd5e1" }}
          >
            <option value="all">All</option>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
            <option value="canceled">canceled</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.8rem" }}>
          <span style={{ color: "#64748b" }}>Subscription</span>
          <select
            name="sub"
            defaultValue={sp.sub ?? "all"}
            style={{ padding: "0.4rem 0.5rem", borderRadius: 6, border: "1px solid #cbd5e1" }}
          >
            <option value="all">All</option>
            <option value="active">active / trialing</option>
            <option value="bootstrap">bootstrap_pending_billing</option>
            <option value="issues">Job issues (24h)</option>
          </select>
        </label>
        <button
          type="submit"
          style={{
            padding: "0.45rem 0.9rem",
            borderRadius: 6,
            border: "none",
            background: "#4f46e5",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Apply
        </button>
        {(sp.q || sp.orgStatus !== "all" || sp.sub !== "all") && (
          <Link href="/admin/organizations" style={{ fontSize: "0.85rem", color: "#64748b" }}>
            Reset
          </Link>
        )}
      </form>

      <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
        Showing <strong>{filtered.length}</strong> of <strong>{allRows.length}</strong> organizations (loaded up to 500).
      </p>

      {filtered.length === 0 ? (
        <p style={{ color: "#64748b" }}>No organizations match.</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: "0.55rem 0.65rem" }}>Organization</th>
                <th style={{ padding: "0.55rem 0.65rem" }}>Owner</th>
                <th style={{ padding: "0.55rem 0.65rem" }}>Org</th>
                <th style={{ padding: "0.55rem 0.65rem" }}>Subscription</th>
                <th style={{ padding: "0.55rem 0.65rem" }}>Meta</th>
                <th style={{ padding: "0.55rem 0.65rem" }}>Pages</th>
                <th style={{ padding: "0.55rem 0.65rem" }}>24h health</th>
                <th style={{ padding: "0.55rem 0.65rem" }}>Jobs</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.5rem 0.65rem" }}>
                    <Link href={`/admin/organizations/${o.id}`} style={{ fontWeight: 600, color: "#4f46e5" }}>
                      {o.name}
                    </Link>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                      <code>{o.slug}</code>
                    </div>
                  </td>
                  <td style={{ padding: "0.5rem 0.65rem", maxWidth: 200 }}>
                    {o.ownerEmail ? <span style={{ wordBreak: "break-all" }}>{o.ownerEmail}</span> : "—"}
                  </td>
                  <td style={{ padding: "0.5rem 0.65rem", whiteSpace: "nowrap" }}>{o.status}</td>
                  <td style={{ padding: "0.5rem 0.65rem" }}>
                    {o.subscriptionStatus ? (
                      <>
                        <div>{o.subscriptionStatus}</div>
                        {o.planLabel ? (
                          <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{o.planLabel}</div>
                        ) : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "0.5rem 0.65rem", fontSize: "0.75rem" }}>{o.metaConnectionSummary}</td>
                  <td style={{ padding: "0.5rem 0.65rem", textAlign: "center" }}>{o.selectedPagesCount}</td>
                  <td style={{ padding: "0.5rem 0.65rem", fontSize: "0.75rem" }}>
                    {o.hasFailedSync24h || o.hasFailedAnalysis24h ? (
                      <span style={{ color: "#b45309" }}>
                        {o.hasFailedSync24h ? "sync " : ""}
                        {o.hasFailedAnalysis24h ? "analysis " : ""}
                        fail
                      </span>
                    ) : (
                      <span style={{ color: "#15803d" }}>OK</span>
                    )}
                  </td>
                  <td style={{ padding: "0.5rem 0.65rem" }}>
                    <Link href={`/admin/jobs?org=${encodeURIComponent(o.id)}`} style={{ color: "#7c3aed", fontSize: "0.75rem" }}>
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
