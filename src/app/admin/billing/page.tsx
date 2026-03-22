import Link from "next/link";
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
    <section style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <Link href="/admin" style={{ fontSize: "0.85rem", color: "#7c3aed" }}>
          ← Overview
        </Link>
        <h1 style={{ margin: "0.5rem 0 0.35rem", fontSize: "1.35rem", fontWeight: 700 }}>Billing &amp; reconciliation</h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem", maxWidth: "44rem" }}>
          Platform billing operations (read-oriented + safe re-verify). Re-verify calls the same idempotent path as
          webhooks; stale markers are advisory. Audit events record outcomes.
        </p>
      </div>

      <section>
        <h2 style={{ marginBottom: "0.5rem", fontSize: "1.05rem" }}>Pending invoices (reconciliation)</h2>
        {pendingSorted.length === 0 ? (
          <p style={{ color: "#64748b" }}>No pending invoices.</p>
        ) : (
          <ul style={{ paddingLeft: "1rem", fontSize: "0.85rem" }}>
            {pendingSorted.map((inv) => {
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
        <h2 style={{ marginBottom: "0.5rem", fontSize: "1.05rem" }}>Recent invoices (all statuses)</h2>
        {invoices.length === 0 ? (
          <p style={{ color: "#64748b" }}>No invoices.</p>
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
        <h2 style={{ marginBottom: "0.5rem", fontSize: "1.05rem" }}>Recent payment transactions</h2>
        {txns.length === 0 ? (
          <p style={{ color: "#64748b" }}>No transactions.</p>
        ) : (
          <>
            {txnNeedsAttention.length > 0 ? (
              <>
                <h3 style={{ fontSize: "0.9rem", color: "#b45309", marginBottom: "0.35rem" }}>
                  Needs attention (failed or verification error)
                </h3>
                <ul style={{ paddingLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                  {txnNeedsAttention.map((t) => (
                    <PaymentTxnItem key={t.id} t={t} emphasize />
                  ))}
                </ul>
              </>
            ) : null}
            {txnOther.length > 0 ? (
              <>
                <h3 style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "0.35rem" }}>Other recent</h3>
                <ul style={{ paddingLeft: "1rem", fontSize: "0.85rem" }}>
                  {txnOther.map((t) => (
                    <PaymentTxnItem key={t.id} t={t} />
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </section>

      <section>
        <h2 style={{ marginBottom: "0.5rem", fontSize: "1.05rem" }}>Recent billing events</h2>
        {events.length === 0 ? (
          <p style={{ color: "#64748b" }}>No events.</p>
        ) : (
          <>
            {eventsWithErrors.length > 0 ? (
              <>
                <h3 style={{ fontSize: "0.9rem", color: "#b45309", marginBottom: "0.35rem" }}>Processing errors</h3>
                <ul style={{ paddingLeft: "1rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                  {eventsWithErrors.map((ev) => (
                    <BillingEventItem key={ev.id} ev={ev} />
                  ))}
                </ul>
              </>
            ) : null}
            {eventsClean.length > 0 ? (
              <>
                <h3 style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "0.35rem" }}>Other recent</h3>
                <ul style={{ paddingLeft: "1rem", fontSize: "0.85rem" }}>
                  {eventsClean.map((ev) => (
                    <BillingEventItem key={ev.id} ev={ev} />
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </section>
    </section>
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
    <li style={{ marginBottom: "0.5rem", borderLeft: emphasize ? "3px solid #f59e0b" : undefined, paddingLeft: emphasize ? "0.5rem" : 0 }}>
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
  );
}

function BillingEventItem({ ev }: { ev: BillingEventRow }) {
  return (
    <li style={{ marginBottom: "0.5rem" }}>
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
  );
}
