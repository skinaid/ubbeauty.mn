import Link from "next/link";
import {
  getRecentOperatorAuditActionTypes,
  listOperatorAuditEvents,
  type OperatorAuditEventRow
} from "@/modules/admin/data";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AuditPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickString(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  if (typeof v === "string") {
    return v;
  }
  if (Array.isArray(v) && typeof v[0] === "string") {
    return v[0];
  }
  return undefined;
}

export default async function AdminAuditPage({ searchParams }: AuditPageProps) {
  const sp = await searchParams;
  const actionContains = pickString(sp, "action")?.trim() || undefined;
  const actorContains = pickString(sp, "actor")?.trim() || undefined;
  const orgRaw = pickString(sp, "org")?.trim();
  const organizationId = orgRaw && UUID_RE.test(orgRaw) ? orgRaw : undefined;
  const limitRaw = pickString(sp, "limit");
  const limitParsed = limitRaw ? Number.parseInt(limitRaw, 10) : 100;
  const limit = Number.isFinite(limitParsed) ? limitParsed : 100;

  const [audit, actionTypes] = await Promise.all([
    listOperatorAuditEvents({
      limit,
      actionContains,
      actorContains,
      organizationId
    }),
    getRecentOperatorAuditActionTypes(800)
  ]);

  const qs = new URLSearchParams();
  if (actionContains) {
    qs.set("action", actionContains);
  }
  if (actorContains) {
    qs.set("actor", actorContains);
  }
  if (organizationId) {
    qs.set("org", organizationId);
  }
  if (limit !== 100) {
    qs.set("limit", String(limit));
  }
  const filterQuery = qs.toString();

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div>
        <Link href="/admin" style={{ fontSize: "0.85rem", color: "#7c3aed" }}>
          ← Overview
        </Link>
        <h1 style={{ margin: "0.5rem 0 0.35rem", fontSize: "1.35rem", fontWeight: 700 }}>Audit log</h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem", maxWidth: "44rem" }}>
          <code>operator_audit_events</code> — newest first (up to 200 rows per request). Filters apply server-side;
          read-only.
        </p>
      </div>

      <form
        method="get"
        style={{
          display: "grid",
          gap: "0.75rem",
          padding: "1rem 1.25rem",
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          maxWidth: "52rem"
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
          <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.85rem" }}>
            <span style={{ color: "#64748b" }}>Action contains</span>
            <input
              name="action"
              defaultValue={actionContains ?? ""}
              placeholder="e.g. invoice_payment"
              list="audit-action-hints"
              style={{
                minWidth: "12rem",
                padding: "0.4rem 0.5rem",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem"
              }}
            />
          </label>
          <datalist id="audit-action-hints">
            {actionTypes.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.85rem" }}>
            <span style={{ color: "#64748b" }}>Actor email contains</span>
            <input
              name="actor"
              defaultValue={actorContains ?? ""}
              placeholder="substring"
              style={{
                minWidth: "12rem",
                padding: "0.4rem 0.5rem",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem"
              }}
            />
          </label>
          <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.85rem" }}>
            <span style={{ color: "#64748b" }}>Organization ID (exact)</span>
            <input
              name="org"
              defaultValue={organizationId ?? orgRaw ?? ""}
              placeholder="uuid"
              style={{
                minWidth: "16rem",
                padding: "0.4rem 0.5rem",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: "0.8rem",
                fontFamily: "ui-monospace, monospace"
              }}
            />
          </label>
          <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.85rem" }}>
            <span style={{ color: "#64748b" }}>Limit</span>
            <select
              name="limit"
              defaultValue={String(Math.min(limit, 200))}
              style={{ padding: "0.4rem 0.5rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
            >
              {[50, 100, 150, 200].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
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
              fontSize: "0.85rem",
              cursor: "pointer"
            }}
          >
            Apply
          </button>
          {filterQuery ? (
            <Link
              href="/admin/audit"
              style={{ fontSize: "0.85rem", color: "#64748b", paddingBottom: "0.35rem" }}
            >
              Clear filters
            </Link>
          ) : null}
        </div>
        {orgRaw && !organizationId ? (
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#b45309" }}>
            Organization filter ignored — use a full UUID.
          </p>
        ) : null}
      </form>

      {audit.length === 0 ? (
        <p style={{ color: "#64748b" }}>No events match these filters.</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>
                  Time (UTC)
                </th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Action</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Actor</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Organization</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Resource</th>
                <th style={{ padding: "0.55rem 0.65rem", fontWeight: 600, color: "#475569" }}>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((row) => (
                <AuditRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AuditRow({ row }: { row: OperatorAuditEventRow }) {
  const metaStr =
    row.metadata == null
      ? "—"
      : typeof row.metadata === "object"
        ? JSON.stringify(row.metadata)
        : String(row.metadata);
  const metaShort = metaStr.length > 140 ? `${metaStr.slice(0, 140)}…` : metaStr;

  return (
    <tr style={{ borderTop: "1px solid #f1f5f9", verticalAlign: "top" }}>
      <td style={{ padding: "0.45rem 0.65rem", whiteSpace: "nowrap", color: "#64748b" }}>
        {new Date(row.created_at).toISOString().replace("T", " ").slice(0, 19)}
      </td>
      <td style={{ padding: "0.45rem 0.65rem" }}>
        <code style={{ fontSize: "0.75rem", wordBreak: "break-word" }}>{row.action_type}</code>
      </td>
      <td style={{ padding: "0.45rem 0.65rem", wordBreak: "break-word" }}>{row.actor_email}</td>
      <td style={{ padding: "0.45rem 0.65rem", color: "#64748b" }}>
        {row.organization_id ? (
          <>
            <code style={{ fontSize: "0.72rem" }}>{row.organization_id.slice(0, 8)}…</code>
            <Link
              href={`/admin/audit?org=${encodeURIComponent(row.organization_id)}`}
              style={{ marginLeft: "0.35rem", fontSize: "0.72rem", color: "#7c3aed" }}
            >
              filter
            </Link>
          </>
        ) : (
          "—"
        )}
      </td>
      <td style={{ padding: "0.45rem 0.65rem", color: "#475569" }}>
        <span style={{ color: "#64748b" }}>{row.resource_type}</span>{" "}
        <code style={{ fontSize: "0.72rem", wordBreak: "break-all" }} title={row.resource_id}>
          {row.resource_id.length > 20 ? `${row.resource_id.slice(0, 14)}…` : row.resource_id}
        </code>
      </td>
      <td style={{ padding: "0.45rem 0.65rem", color: "#64748b", maxWidth: "22rem" }}>
        <code style={{ fontSize: "0.7rem", whiteSpace: "pre-wrap", wordBreak: "break-word" }} title={metaStr}>
          {metaShort}
        </code>
      </td>
    </tr>
  );
}
