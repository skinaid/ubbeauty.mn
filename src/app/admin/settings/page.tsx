import Link from "next/link";
import { getSystemAdminsDirectory } from "@/modules/admin/data";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admins = await getSystemAdminsDirectory();

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div>
        <Link href="/admin" style={{ fontSize: "0.85rem", color: "#7c3aed" }}>
          ← Overview
        </Link>
        <h1 style={{ margin: "0.5rem 0 0.35rem", fontSize: "1.35rem", fontWeight: 700 }}>Settings</h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem", maxWidth: "44rem" }}>
          <strong>System admins</strong> — read-only list from <code>system_admins</code>. Bootstrap and first-run
          behavior are documented in{" "}
          <code style={{ fontSize: "0.85rem" }}>docs/admin-bootstrap.md</code>. V1 does not include invite/revoke
          here.
        </p>
      </div>

      {admins.length === 0 ? (
        <p style={{ color: "#64748b" }}>No system admin rows (empty table — bootstrap may apply on first allowlisted
          access).</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Email</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Role</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Status</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>User ID</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Granted by</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.45rem 0.65rem", wordBreak: "break-word" }}>{a.email}</td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>
                    <code style={{ fontSize: "0.75rem" }}>{a.role}</code>
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>
                    {a.status === "active" ? (
                      <span style={{ color: "#15803d", fontWeight: 600 }}>active</span>
                    ) : (
                      <span style={{ color: "#b45309" }}>{a.status}</span>
                    )}
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem", color: "#64748b" }}>
                    <code style={{ fontSize: "0.72rem" }} title={a.user_id}>
                      {a.user_id.slice(0, 8)}…
                    </code>
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem", color: "#64748b", fontSize: "0.75rem" }}>
                    {a.granted_by ? (
                      <code style={{ fontSize: "0.72rem" }} title={a.granted_by}>
                        {a.granted_by.slice(0, 8)}…
                      </code>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem", color: "#94a3b8", fontSize: "0.75rem" }}>
                    {a.created_at?.replace("T", " ").slice(0, 19) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
