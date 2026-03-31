import Link from "next/link";
import { OperatorInvoiceReverifyForm } from "@/components/internal/operator-invoice-reverify-form";
import {
  computeInvoiceReconciliationFlags,
  getPendingInvoicesForReconciliationOverview
} from "@/modules/billing/reconciliation";
import {
  getGlobalRecentBillingEventsForOps,
  getGlobalRecentInvoicesForOps,
  getGlobalRecentPaymentTransactionsForOps
} from "@/modules/admin/data";

export const dynamic = "force-dynamic";

export default async function InternalOpsBillingPage() {
  const [invoices, txns, events, pending] = await Promise.all([
    getGlobalRecentInvoicesForOps(25),
    getGlobalRecentPaymentTransactionsForOps(35),
    getGlobalRecentBillingEventsForOps(45),
    getPendingInvoicesForReconciliationOverview(40)
  ]);

  const now = new Date();

  return (
    <section style={{ display: "grid", gap: "1.5rem" }}>
      <div
        role="status"
        style={{
          padding: "0.75rem 1rem",
          borderRadius: 8,
          border: "1px solid #c4b5fd",
          background: "#f5f3ff",
          fontSize: "0.9rem",
          color: "#4c1d95"
        }}
      >
        <strong>Transitional route</strong> — platform billing operations now live under{" "}
        <Link href="/admin/billing" style={{ color: "#5b21b6", fontWeight: 600 }}>
          /admin/billing
        </Link>{" "}
        (system admin). This page is unchanged for bookmarks; prefer the admin control plane for day-to-day ops.
      </div>
      <div>
        <h1 style={{ margin: "0 0 0.35rem" }}>Billing &amp; reconciliation</h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem" }}>
          Invoices, payment rows, billing events, and <strong>pending</strong> invoice reconciliation. Re-verify calls
          the same idempotent path as webhooks; stale markers are advisory (no cron yet).
        </p>
      </div>

      <section>
        <h2 style={{ marginBottom: "0.5rem" }}>Pending invoices (reconciliation)</h2>
        {pending.length === 0 ? (
          <p>No pending invoices.</p>
        ) : (
          <ul style={{ paddingLeft: "1rem", fontSize: "0.85rem" }}>
            {pending.map((inv) => {
              const flags = computeInvoiceReconciliationFlags(inv, now);
              return (
                <li key={inv.id} style={{ marginBottom: "0.75rem" }}>
                  <code>{inv.id.slice(0, 8)}…</code> · {inv.organizations?.name ?? inv.organization_id} ·{" "}
                  <strong>{inv.status}</strong> · {inv.amount} {inv.currency}
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.15rem" }}>
                    created {inv.created_at} · due {inv.due_at}
                  </div>
                  {(flags.pastDueWhilePending || flags.oldPending) && (
                    <div style={{ fontSize: "0.75rem", marginTop: "0.2rem" }}>
                      {flags.pastDueWhilePending ? (
                        <span style={{ color: "#b45309", marginRight: "0.5rem" }}>[past due]</span>
                      ) : null}
                      {flags.oldPending ? <span style={{ color: "#b45309" }}>[pending 3d+]</span> : null}
                    </div>
                  )}
                  {inv.provider_last_error ? (
                    <span style={{ color: "#b91c1c", display: "block", fontSize: "0.8rem" }}>
                      {inv.provider_last_error}
                    </span>
                  ) : null}
                  <div style={{ marginTop: "0.35rem" }}>
                    <OperatorInvoiceReverifyForm invoiceId={inv.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 style={{ marginBottom: "0.5rem" }}>Recent invoices (all statuses)</h2>
        {invoices.length === 0 ? (
          <p>No invoices.</p>
        ) : (
          <ul style={{ paddingLeft: "1rem", fontSize: "0.85rem" }}>
            {invoices.map((inv) => (
              <li key={inv.id} style={{ marginBottom: "0.5rem" }}>
                <code>{inv.id.slice(0, 8)}…</code> · {inv.organizations?.name ?? inv.organization_id} ·{" "}
                <strong>{inv.status}</strong> · {inv.amount} {inv.currency}
                {inv.provider_invoice_id ? (
                  <span style={{ color: "#64748b" }}>
                    {" "}
                    · QPay <code>{inv.provider_invoice_id.slice(0, 8)}…</code>
                  </span>
                ) : null}
                {inv.provider_last_error ? (
                  <span style={{ color: "#b91c1c", display: "block" }}>{inv.provider_last_error}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 style={{ marginBottom: "0.5rem" }}>Recent payment transactions</h2>
        {txns.length === 0 ? (
          <p>No transactions.</p>
        ) : (
          <ul style={{ paddingLeft: "1rem", fontSize: "0.85rem" }}>
            {txns.map((t) => (
              <li key={t.id} style={{ marginBottom: "0.5rem" }}>
                <code>{t.id.slice(0, 8)}…</code> · org <code>{t.organization_id.slice(0, 8)}…</code> · invoice{" "}
                <code>{t.invoice_id.slice(0, 8)}…</code> · <strong>{t.status}</strong>
                {t.provider_txn_id ? (
                  <span>
                    {" "}
                    · txn <code>{String(t.provider_txn_id).slice(0, 14)}…</code>
                  </span>
                ) : null}
                {t.last_verification_error ? (
                  <span style={{ color: "#b91c1c", display: "block" }}>{t.last_verification_error}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 style={{ marginBottom: "0.5rem" }}>Recent billing events</h2>
        {events.length === 0 ? (
          <p>No events.</p>
        ) : (
          <ul style={{ paddingLeft: "1rem", fontSize: "0.85rem" }}>
            {events.map((ev) => (
              <li key={ev.id} style={{ marginBottom: "0.5rem" }}>
                <strong>{ev.event_type}</strong> · org{" "}
                {ev.organization_id ? <code>{ev.organization_id.slice(0, 8)}…</code> : "—"} · inv{" "}
                {ev.invoice_id ? <code>{ev.invoice_id.slice(0, 8)}…</code> : "—"}
                {ev.provider_event_id ? (
                  <span style={{ color: "#64748b" }}>
                    {" "}
                    · <code>{ev.provider_event_id}</code>
                  </span>
                ) : null}
                {ev.processing_error ? (
                  <span style={{ color: "#b91c1c", display: "block" }}>{ev.processing_error}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
