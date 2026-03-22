import Link from "next/link";
import { Badge, PageHeader } from "@/components/ui";
import { OperatorInvoiceReverifyForm } from "@/components/internal/operator-invoice-reverify-form";
import {
  computeInvoiceReconciliationFlags,
  getPendingInvoicesForReconciliationOverview
} from "@/modules/billing/reconciliation";
import type { BillingEventRow, PaymentTransactionRow } from "@/modules/billing/data";
import {
  getGlobalRecentBillingEventsForOps,
  getGlobalRecentInvoicesForOps,
  getGlobalRecentPaymentTransactionsForOps
} from "@/modules/admin/data";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const [invoices, txns, events, pending] = await Promise.all([
    getGlobalRecentInvoicesForOps(25),
    getGlobalRecentPaymentTransactionsForOps(35),
    getGlobalRecentBillingEventsForOps(45),
    getPendingInvoicesForReconciliationOverview(40)
  ]);

  const now = new Date();

  const pendingSorted = [...pending].sort((a, b) => {
    const fa = computeInvoiceReconciliationFlags(a, now);
    const fb = computeInvoiceReconciliationFlags(b, now);
    const score = (inv: (typeof pending)[number], f: ReturnType<typeof computeInvoiceReconciliationFlags>) =>
      (f.pastDueWhilePending ? 4 : 0) + (f.oldPending ? 2 : 0) + (inv.provider_last_error ? 1 : 0);
    return score(b, fb) - score(a, fa);
  });

  const txnNeedsAttention = txns.filter(isPaymentTxnAnomalous);
  const txnOther = txns.filter((t) => !isPaymentTxnAnomalous(t));

  const eventsWithErrors = events.filter((ev) => !!ev.processing_error);
  const eventsClean = events.filter((ev) => !ev.processing_error);

  return (
    <div className="ui-admin-subpage">
      <div className="ui-admin-pagehead">
        <Link href="/admin" className="ui-admin-back">
          ← Overview
        </Link>
        <PageHeader
          className="ui-page-header--admin"
          title="Billing & reconciliation"
          description="Platform billing operations (read-oriented + safe re-verify). Re-verify calls the same idempotent path as
          webhooks; stale markers are advisory. Audit events record outcomes."
        />
      </div>

      <section className="ui-admin-section">
        <h2 className="ui-section-title">Pending invoices (reconciliation)</h2>
        {pendingSorted.length === 0 ? (
          <p className="ui-text-muted">No pending invoices.</p>
        ) : (
          <ul className="ui-admin-list ui-admin-list--loose">
            {pendingSorted.map((inv) => {
              const flags = computeInvoiceReconciliationFlags(inv, now);
              return (
                <li key={inv.id}>
                  <code>{inv.id.slice(0, 8)}…</code> · {inv.organizations?.name ?? inv.organization_id} ·{" "}
                  <strong>{inv.status}</strong> · {inv.amount} {inv.currency}
                  <div className="ui-text-faint" style={{ marginTop: "0.15rem" }}>
                    created {inv.created_at} · due {inv.due_at}
                  </div>
                  {(flags.pastDueWhilePending || flags.oldPending) && (
                    <div style={{ fontSize: "var(--text-xs)", marginTop: "0.2rem", display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                      {flags.pastDueWhilePending ? <Badge variant="warning">Past due</Badge> : null}
                      {flags.oldPending ? <Badge variant="warning">Pending 3d+</Badge> : null}
                    </div>
                  )}
                  {inv.provider_last_error ? (
                    <span className="ui-text-error" style={{ display: "block" }}>
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

      <section className="ui-admin-section">
        <h2 className="ui-section-title">Recent invoices (all statuses)</h2>
        {invoices.length === 0 ? (
          <p className="ui-text-muted">No invoices.</p>
        ) : (
          <ul className="ui-admin-list ui-admin-list--spaced">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <code>{inv.id.slice(0, 8)}…</code> · {inv.organizations?.name ?? inv.organization_id} ·{" "}
                <strong>{inv.status}</strong> · {inv.amount} {inv.currency}
                {inv.provider_invoice_id ? (
                  <span className="ui-text-muted">
                    {" "}
                    · QPay <code>{inv.provider_invoice_id.slice(0, 8)}…</code>
                  </span>
                ) : null}
                {inv.provider_last_error ? (
                  <span className="ui-text-error" style={{ display: "block" }}>
                    {inv.provider_last_error}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ui-admin-section">
        <h2 className="ui-section-title">Recent payment transactions</h2>
        {txns.length === 0 ? (
          <p className="ui-text-muted">No transactions.</p>
        ) : (
          <>
            {txnNeedsAttention.length > 0 ? (
              <>
                <h3 className="ui-subsection-heading ui-subsection-heading--warning">
                  Needs attention (failed or verification error)
                </h3>
                <ul className="ui-admin-list ui-admin-list--spaced" style={{ marginBottom: "var(--space-4)" }}>
                  {txnNeedsAttention.map((t) => (
                    <PaymentTxnItem key={t.id} t={t} emphasize />
                  ))}
                </ul>
              </>
            ) : null}
            {txnOther.length > 0 ? (
              <>
                <h3 className="ui-subsection-heading ui-subsection-heading--muted">Other recent</h3>
                <ul className="ui-admin-list ui-admin-list--spaced">
                  {txnOther.map((t) => (
                    <PaymentTxnItem key={t.id} t={t} />
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </section>

      <section className="ui-admin-section">
        <h2 className="ui-section-title">Recent billing events</h2>
        {events.length === 0 ? (
          <p className="ui-text-muted">No events.</p>
        ) : (
          <>
            {eventsWithErrors.length > 0 ? (
              <>
                <h3 className="ui-subsection-heading ui-subsection-heading--warning">Processing errors</h3>
                <ul className="ui-admin-list ui-admin-list--spaced" style={{ marginBottom: "var(--space-4)" }}>
                  {eventsWithErrors.map((ev) => (
                    <BillingEventItem key={ev.id} ev={ev} />
                  ))}
                </ul>
              </>
            ) : null}
            {eventsClean.length > 0 ? (
              <>
                <h3 className="ui-subsection-heading ui-subsection-heading--muted">Other recent</h3>
                <ul className="ui-admin-list ui-admin-list--spaced">
                  {eventsClean.map((ev) => (
                    <BillingEventItem key={ev.id} ev={ev} />
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function isPaymentTxnAnomalous(t: PaymentTransactionRow): boolean {
  const s = String(t.status).toLowerCase();
  if (s === "failed" || s === "canceled" || s === "cancelled") {
    return true;
  }
  return Boolean(t.last_verification_error);
}

function PaymentTxnItem({ t, emphasize }: { t: PaymentTransactionRow; emphasize?: boolean }) {
  return (
    <li className={emphasize ? "ui-admin-list-item--attention" : undefined}>
      <code>{t.id.slice(0, 8)}…</code> · org <code>{t.organization_id.slice(0, 8)}…</code> · invoice{" "}
      <code>{t.invoice_id.slice(0, 8)}…</code> · <strong>{t.status}</strong>
      {t.provider_txn_id ? (
        <span>
          {" "}
          · txn <code>{String(t.provider_txn_id).slice(0, 14)}…</code>
        </span>
      ) : null}
      {t.last_verification_error ? (
        <span className="ui-text-error" style={{ display: "block" }}>
          {t.last_verification_error}
        </span>
      ) : null}
    </li>
  );
}

function BillingEventItem({ ev }: { ev: BillingEventRow }) {
  return (
    <li>
      <strong>{ev.event_type}</strong> · org{" "}
      {ev.organization_id ? <code>{ev.organization_id.slice(0, 8)}…</code> : "—"} · inv{" "}
      {ev.invoice_id ? <code>{ev.invoice_id.slice(0, 8)}…</code> : "—"}
      {ev.provider_event_id ? (
        <span className="ui-text-muted">
          {" "}
          · <code>{ev.provider_event_id}</code>
        </span>
      ) : null}
      {ev.processing_error ? (
        <span className="ui-text-error" style={{ display: "block" }}>
          {ev.processing_error}
        </span>
      ) : null}
    </li>
  );
}
