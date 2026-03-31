import Link from "next/link";
import { getSystemAdminsDirectory } from "@/modules/admin/data";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admins = await getSystemAdminsDirectory();

  return (
    <div className="ui-admin-stack">
      <div className="ui-admin-pagehead">
        <Link href="/admin" className="ui-admin-back">
          ← Overview
        </Link>
        <PageHeader
          className="ui-page-header--admin"
          title="Settings"
          description={
            <>
              <strong>System admins</strong> — read-only list from <code>system_admins</code>. Bootstrap and first-run
              behavior are documented in <code style={{ fontSize: "var(--text-sm)" }}>docs/admin-bootstrap.md</code>. V1
              does not include invite/revoke here.
            </>
          }
        />
      </div>

      {admins.length === 0 ? (
        <p className="ui-text-muted">
          No system admin rows (empty table — bootstrap may apply on first allowlisted access).
        </p>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table" style={{ fontSize: "var(--text-sm)" }}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>User ID</th>
                <th>Granted by</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td style={{ wordBreak: "break-word" }}>{a.email}</td>
                  <td>
                    <code style={{ fontSize: "0.75rem" }}>{a.role}</code>
                  </td>
                  <td>
                    {a.status === "active" ? (
                      <span style={{ color: "var(--color-status-success)", fontWeight: 600 }}>active</span>
                    ) : (
                      <span className="ui-text-warning-emphasis">{a.status}</span>
                    )}
                  </td>
                  <td className="ui-text-muted">
                    <code style={{ fontSize: "0.72rem" }} title={a.user_id}>
                      {a.user_id.slice(0, 8)}…
                    </code>
                  </td>
                  <td className="ui-text-muted" style={{ fontSize: "0.75rem" }}>
                    {a.granted_by ? (
                      <code style={{ fontSize: "0.72rem" }} title={a.granted_by}>
                        {a.granted_by.slice(0, 8)}…
                      </code>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="ui-text-faint">{a.created_at?.replace("T", " ").slice(0, 19) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
