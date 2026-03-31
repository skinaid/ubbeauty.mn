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

function getSubscriptionSummary(status?: string | null): { label: string; note: string; tone?: "warning" } {
  switch (status) {
    case "active":
      return {
        label: "Идэвхтэй",
        note: "Таны subscription идэвхтэй байна. Нэхэмжлэл болон төлбөрийн түүхээ доороос шалгаж болно."
      };
    case "bootstrap_pending_billing":
      return {
        label: "Төлбөр баталгаажуулах хүлээлттэй",
        note: "Starter plan-аа идэвхжүүлэхийн тулд QPay төлбөрөө дуусгаад баталгаажуулалт хүлээнэ үү.",
        tone: "warning"
      };
    case "canceled":
      return {
        label: "Цуцлагдсан",
        note: "Subscription цуцлагдсан байна. Дараагийн алхмаа Pricing хэсгээс шалгана уу.",
        tone: "warning"
      };
    case "expired":
      return {
        label: "Хугацаа дууссан",
        note: "Төлөвлөгөөний хугацаа дууссан байна. Billing болон Pricing хэсгээс төлөвөө шалгана уу.",
        tone: "warning"
      };
    case "suspended":
      return {
        label: "Түр хязгаарлагдсан",
        note: "Subscription түр хязгаарлагдсан байна. Төлбөрийн төлөвөө шалгаад шаардлагатай бол Pricing хэсгээс үргэлжлүүлнэ үү.",
        tone: "warning"
      };
    default:
      return {
        label: "Тодорхойгүй",
        note: "Subscription-ийн одоогийн төлөвийг доорх мэдээллээс шалгана уу."
      };
  }
}

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

  const summary = getSubscriptionSummary(subscription?.status);

  return (
    <section className="ui-customer-stack">
      <PageHeader
        title="Billing"
        description="Төлбөртэй төлөвлөгөөний төлбөр QPay-аар хийгдэнэ. Төлбөр баталгаажсаны дараа subscription-ийн төлөв шинэчлэгдэнэ."
      />

      {subscription ? (
        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Одоогийн төлөв
          </h2>
          <p style={{ margin: 0 }}>
            Төлөвлөгөө: <strong>{subscription.plan.name}</strong> ({subscription.plan.code})
          </p>
          <p style={{ margin: "var(--space-2) 0 0" }}>
            Төлөв: <strong>{summary.label}</strong>
          </p>
          <p style={{ margin: "var(--space-2) 0 0" }}>{summary.note}</p>
          {subscription.status === "bootstrap_pending_billing" ? (
            <p className="ui-text-warning-emphasis" style={{ margin: "var(--space-2) 0 0" }}>
              Төлбөрөө дуусгах бол <Link href="/pricing" className="ui-table__link">Pricing</Link> хэсэг рүү орно уу.
            </p>
          ) : null}
        </Card>
      ) : (
        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Subscription мэдээлэл
          </h2>
          <p style={{ margin: 0 }}>Одоогоор subscription бүртгэгдээгүй байна. Тохирох төлөвлөгөөг Pricing хэсгээс сонгож эхэлнэ үү.</p>
          <p className="ui-text-muted" style={{ margin: 0 }}>
            <Link href="/pricing" className="ui-table__link">
              Pricing руу очих
            </Link>
          </p>
        </Card>
      )}

      <Card padded stack>
        <h2 className="ui-section-title" style={{ marginTop: 0 }}>
          Сүүлийн нэхэмжлэлүүд
        </h2>
        <p className="ui-text-muted" style={{ margin: 0 }}>
          Нэхэмжлэл бүрийн төлөв, төлсөн хугацаа, баталгаажуулалтын түүх энд харагдана.
        </p>
        {invoices.length === 0 ? (
          <p style={{ margin: 0 }}>Одоогоор нэхэмжлэл үүсээгүй байна.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "var(--text-sm)" }}>
            {invoices.map((inv) => (
              <li key={inv.id} style={{ marginBottom: "var(--space-2)" }}>
                <code>{inv.id.slice(0, 8)}…</code> · <strong>{inv.status}</strong> · {inv.amount} {inv.currency}
                {inv.paid_at ? <span className="ui-text-muted"> · paid {inv.paid_at}</span> : null}
                {inv.due_at ? <span className="ui-text-muted"> · due {inv.due_at}</span> : null}
                {typeof inv.verification_attempt_count === "number" && inv.verification_attempt_count > 0 ? (
                  <span className="ui-text-faint" style={{ display: "block", marginTop: "var(--space-1)" }}>
                    Баталгаажуулалт: {inv.verification_attempt_count}
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
          Төлбөрийн мөрүүд
        </h2>
        <p className="ui-text-muted" style={{ margin: 0 }}>
          Төлбөрийн оролдлого, дүн, баталгаажуулалтын холбоотой мэдээлэл энд хадгалагдана.
        </p>
        {txns.length === 0 ? (
          <p style={{ margin: 0 }}>Одоогоор төлбөрийн мөр үүсээгүй байна.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "var(--text-sm)" }}>
            {txns.map((t) => (
              <li key={t.id} style={{ marginBottom: "0.4rem" }}>
                <strong>{t.status}</strong> · {t.amount} {t.currency}
                {t.provider_txn_id ? (
                  <span className="ui-text-muted">
                    {" "}· txn <code>{String(t.provider_txn_id).slice(0, 12)}…</code>
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
          Техникийн үйл явдлын түүх
        </h2>
        <p className="ui-text-muted" style={{ margin: 0 }}>
          Энэ хэсэг нь support болон дэлгэрэнгүй шалгалтад хэрэг болох үйл явдлын түүхийг харуулна.
        </p>
        {events.length === 0 ? (
          <p style={{ margin: 0 }}>Одоогоор event бүртгэгдээгүй байна.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "var(--text-xs)" }}>
            {events.map((ev) => (
              <li key={ev.id} style={{ marginBottom: "0.35rem" }}>
                <strong>{ev.event_type}</strong>
                {ev.processing_error ? <span className="ui-text-error"> — {ev.processing_error}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="ui-text-muted" style={{ margin: 0 }}>
        <Link href="/pricing" className="ui-table__link">
          ← Pricing руу буцах
        </Link>
      </p>
    </section>
  );
}
