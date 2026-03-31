import Link from "next/link";
import {
  getRecentOperatorAuditActionTypes,
  listOperatorAuditEvents,
  type OperatorAuditEventRow
} from "@/modules/admin/data";
import { Button, Card, Input, PageHeader } from "@/components/ui";

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
    <div className="ui-admin-stack">
      <div className="ui-admin-pagehead">
        <Link href="/admin" className="ui-admin-back">
          ← Overview
        </Link>
        <PageHeader
          className="ui-page-header--admin"
          title="Audit log"
          description={
            <>
              <code>operator_audit_events</code> — newest first (up to 200 rows per request). Filters apply server-side;
              read-only.
            </>
          }
        />
      </div>

      <Card padded className="ui-max-w-form">
        <form method="get" className="ui-admin-stack" style={{ gap: "var(--space-3)" }}>
          <div className="ui-filter-bar">
            <label className="ui-filter-field">
              <span>Action contains</span>
              <Input
                name="action"
                defaultValue={actionContains ?? ""}
                placeholder="e.g. invoice_payment"
                list="audit-action-hints"
                style={{ minWidth: "12rem" }}
              />
            </label>
            <label className="ui-filter-field">
              <span>Actor email contains</span>
              <Input name="actor" defaultValue={actorContains ?? ""} placeholder="substring" style={{ minWidth: "12rem" }} />
            </label>
            <label className="ui-filter-field">
              <span>Organization ID (exact)</span>
              <Input
                name="org"
                defaultValue={organizationId ?? orgRaw ?? ""}
                placeholder="uuid"
                style={{ minWidth: "16rem", fontFamily: "ui-monospace, monospace", fontSize: "var(--text-xs)" }}
              />
            </label>
            <label className="ui-filter-field">
              <span>Limit</span>
              <select name="limit" defaultValue={String(Math.min(limit, 200))} className="ui-select">
                {[50, 100, 150, 200].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" variant="primary">
              Apply
            </Button>
            {filterQuery ? (
              <Link href="/admin/audit" className="ui-text-muted" style={{ paddingBottom: "0.35rem" }}>
                Clear filters
              </Link>
            ) : null}
            <datalist id="audit-action-hints">
              {actionTypes.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          {orgRaw && !organizationId ? (
            <p className="ui-text-warning-emphasis" style={{ margin: 0, fontSize: "var(--text-xs)" }}>
              Organization filter ignored — use a full UUID.
            </p>
          ) : null}
        </form>
      </Card>

      {audit.length === 0 ? (
        <p className="ui-text-muted">No events match these filters.</p>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table" style={{ fontSize: "0.78rem" }}>
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap" }}>Time (UTC)</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Organization</th>
                <th>Resource</th>
                <th>Metadata</th>
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
    <tr style={{ verticalAlign: "top" }}>
      <td className="ui-table__muted">{new Date(row.created_at).toISOString().replace("T", " ").slice(0, 19)}</td>
      <td>
        <code style={{ fontSize: "0.75rem", wordBreak: "break-word" }}>{row.action_type}</code>
      </td>
      <td style={{ wordBreak: "break-word" }}>{row.actor_email}</td>
      <td className="ui-table__muted">
        {row.organization_id ? (
          <>
            <code style={{ fontSize: "0.72rem" }}>{row.organization_id.slice(0, 8)}…</code>
            <Link
              href={`/admin/audit?org=${encodeURIComponent(row.organization_id)}`}
              className="ui-link-subtle"
              style={{ marginLeft: "0.35rem", fontSize: "0.72rem" }}
            >
              filter
            </Link>
          </>
        ) : (
          "—"
        )}
      </td>
      <td>
        <span className="ui-text-muted">{row.resource_type}</span>{" "}
        <code style={{ fontSize: "0.72rem", wordBreak: "break-all" }} title={row.resource_id}>
          {row.resource_id.length > 20 ? `${row.resource_id.slice(0, 14)}…` : row.resource_id}
        </code>
      </td>
      <td className="ui-text-muted" style={{ maxWidth: "22rem" }}>
        <code style={{ fontSize: "0.7rem", whiteSpace: "pre-wrap", wordBreak: "break-word" }} title={metaStr}>
          {metaShort}
        </code>
      </td>
    </tr>
  );
}
