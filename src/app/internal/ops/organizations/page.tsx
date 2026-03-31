import Link from "next/link";
import { getOrganizationsForOps } from "@/modules/admin/data";

export const dynamic = "force-dynamic";

export default async function InternalOpsOrganizationsPage() {
  const orgs = await getOrganizationsForOps(100);

  return (
    <section style={{ display: "grid", gap: "1.25rem" }}>
      <div>
        <h1 style={{ margin: "0 0 0.35rem" }}>Organizations</h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem" }}>
          Subscription state, Meta connection health, and org metadata (service role). Prefer the{" "}
          <Link href="/admin/organizations" style={{ color: "#4f46e5" }}>
            system admin org directory
          </Link>{" "}
          for search and detail views.
        </p>
      </div>

      {orgs.length === 0 ? (
        <p>No organizations.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", background: "#fff" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                <th style={{ padding: "0.5rem" }}>Name</th>
                <th style={{ padding: "0.5rem" }}>Slug</th>
                <th style={{ padding: "0.5rem" }}>Status</th>
                <th style={{ padding: "0.5rem" }}>Subscriptions</th>
                <th style={{ padding: "0.5rem" }}>Meta</th>
                <th style={{ padding: "0.5rem" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => {
                const subs = o.subscriptions ?? [];
                const metas = o.meta_connections ?? [];
                const metaWorst = metas.some((m) => m.status !== "active");
                return (
                  <tr key={o.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.5rem" }}>
                      <strong>{o.name}</strong>
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                        <code>{o.id.slice(0, 8)}…</code>
                      </div>
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <Link href={`/admin/jobs?org=${encodeURIComponent(o.id)}`} style={{ color: "#4f46e5" }}>
                        {o.slug}
                      </Link>
                    </td>
                    <td style={{ padding: "0.5rem" }}>{o.status}</td>
                    <td style={{ padding: "0.5rem" }}>
                      {subs.length === 0 ? (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      ) : (
                        <ul style={{ margin: 0, paddingLeft: "1rem" }}>
                          {subs.map((s, i) => (
                            <li key={`${o.id}-sub-${i}`}>
                              {s.status}
                              {s.plans ? ` · ${s.plans.name} (${s.plans.code})` : ` · plan ${s.plan_id.slice(0, 8)}…`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {metas.length === 0 ? (
                        <span style={{ color: "#94a3b8" }}>No connection</span>
                      ) : (
                        <ul style={{ margin: 0, paddingLeft: "1rem", color: metaWorst ? "#b45309" : undefined }}>
                          {metas.map((m, i) => (
                            <li key={`${o.id}-mc-${i}`}>
                              <strong>{m.status}</strong>
                              {m.last_validated_at ? ` · validated ${m.last_validated_at}` : null}
                              {m.last_error ? (
                                <span style={{ color: "#b91c1c", display: "block", fontSize: "0.75rem" }}>
                                  {m.last_error}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td style={{ padding: "0.5rem", whiteSpace: "nowrap" }}>{o.created_at}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
