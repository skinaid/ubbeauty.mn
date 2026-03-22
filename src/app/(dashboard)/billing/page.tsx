import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import {
  getRecentBillingEventsForCurrentUserOrg,
  getRecentInvoicesForCurrentUserOrg,
  getRecentPaymentTransactionsForCurrentUserOrg
} from "@/modules/billing/data";
import { getCurrentOrganizationSubscription } from "@/modules/subscriptions/data";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) {
    redirect("/setup-organization");
  }

  const [subscription, invoices, txns, events] = await Promise.all([
    getCurrentOrganizationSubscription(user.id),
    getRecentInvoicesForCurrentUserOrg(user.id, 15),
    getRecentPaymentTransactionsForCurrentUserOrg(user.id, 20),
    getRecentBillingEventsForCurrentUserOrg(user.id, 12)
  ]);

  return (
    <section className="ui-customer-stack">
      <PageHeader
        title="Billing"
        description="Invoices and payments are organization-scoped. Activation always follows a successful QPay payment/check call — webhooks alone are not trusted."
      />

      {subscription ? (
        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Subscription
          </h2>
          <p style={{ margin: 0 }}>
            Plan: <strong>{subscription.plan.name}</strong> ({subscription.plan.code})
          </p>
          <p style={{ margin: "var(--space-2) 0 0" }}>
            Status: <strong>{subscription.status}</strong>
          </p>
          {subscription.status === "bootstrap_pending_billing" ? (
            <p className="ui-text-warning-emphasis" style={{ margin: "var(--space-2) 0 0" }}>
              Complete QPay checkout on{" "}
              <Link href="/pricing" className="ui-table__link">
                Pricing
              </Link>{" "}
              to activate billing.
            </p>
          ) : null}
        </Card>
      ) : (
        <p>No subscription row found.</p>
      )}

      <Card padded stack>
        <h2 className="ui-section-title" style={{ marginTop: 0 }}>
          Recent invoices
        </h2>
        {invoices.length === 0 ? (
          <p style={{ margin: 0 }}>No invoices yet.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "var(--text-sm)" }}>
            {invoices.map((inv) => (
              <li key={inv.id} style={{ marginBottom: "var(--space-2)" }}>
                <code>{inv.id.slice(0, 8)}…</code> · <strong>{inv.status}</strong> · {inv.amount} {inv.currency}
                {inv.paid_at ? <span className="ui-text-muted"> · paid {inv.paid_at}</span> : null}
                {inv.due_at ? <span className="ui-text-muted"> · due {inv.due_at}</span> : null}
                {typeof inv.verification_attempt_count === "number" && inv.verification_attempt_count > 0 ? (
                  <span className="ui-text-faint" style={{ display: "block", marginTop: "var(--space-1)" }}>
                    Verifications: {inv.verification_attempt_count}
                    {inv.last_verification_outcome ? ` · last: ${inv.last_verification_outcome}` : null}
                    {inv.last_verification_at ? ` @ ${inv.last_verification_at}` : null}
                  </span>
                ) : null}
                {inv.provider_last_error ? (
                  <span className="ui-text-error" style={{ display: "block", marginTop: "var(--space-1)" }}>
                    {inv.provider_last_error}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card padded stack>
        <h2 className="ui-section-title" style={{ marginTop: 0 }}>
          Payment transactions
        </h2>
        {txns.length === 0 ? (
          <p style={{ margin: 0 }}>No payment rows yet.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "var(--text-sm)" }}>
            {txns.map((t) => (
              <li key={t.id} style={{ marginBottom: "0.4rem" }}>
                <strong>{t.status}</strong> · {t.amount} {t.currency}
                {t.provider_txn_id ? (
                  <span className="ui-text-muted">
                    {" "}
                    · txn <code>{String(t.provider_txn_id).slice(0, 12)}…</code>
                  </span>
                ) : null}
                {t.last_verification_error ? (
                  <span className="ui-text-error" style={{ display: "block" }}>
                    {t.last_verification_error}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card padded stack>
        <h2 className="ui-section-title" style={{ marginTop: 0 }}>
          Billing events (your org)
        </h2>
        {events.length === 0 ? (
          <p style={{ margin: 0 }}>No events yet.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "var(--text-xs)" }}>
            {events.map((ev) => (
              <li key={ev.id} style={{ marginBottom: "0.35rem" }}>
                <strong>{ev.event_type}</strong>
                {ev.processing_error ? (
                  <span className="ui-text-error"> — {ev.processing_error}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="ui-text-muted" style={{ margin: 0 }}>
        <Link href="/pricing" className="ui-table__link">
          ← Back to pricing
        </Link>
      </p>
    </section>
  );
}
