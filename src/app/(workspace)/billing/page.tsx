import Link from "next/link";
import { redirect } from "next/navigation";
import { AddCheckoutItemForm } from "@/components/clinic/add-checkout-item-form";
import { CaptureCheckoutPaymentForm } from "@/components/clinic/capture-checkout-payment-form";
import { RefundCheckoutForm } from "@/components/clinic/refund-checkout-form";
import { VoidCheckoutButton } from "@/components/clinic/void-checkout-button";
import { Alert, Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import {
  type AppointmentWithRelations,
  type ClinicCheckoutWithRelations,
  getCheckoutDraftCandidates,
  getClinicCheckouts,
  getServices,
  isClinicFoundationMissingError
} from "@/modules/clinic/data";
import type { ClinicCheckoutItemRow } from "@/modules/clinic/types";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import {
  getRecentBillingEventsForCurrentUserOrg,
  getRecentInvoicesForCurrentUserOrg,
  getRecentPaymentTransactionsForCurrentUserOrg
} from "@/modules/billing/data";
import { getCurrentOrganizationSubscription } from "@/modules/subscriptions/data";

type BillingPageProps = {
  searchParams?: Promise<{
    checkoutStatus?: string;
  }>;
};

function getCheckoutFilterLabel(filter: string): string {
  switch (filter) {
    case "collecting":
      return "Цуглуулж буй төлбөр";
    case "paid":
      return "Бүрэн төлөгдсөн";
    default:
      return "Бүх checkout";
  }
}

function formatCheckoutLineItem(item: ClinicCheckoutItemRow): string {
  const amount = Number(item.line_total ?? 0).toFixed(2);
  return `${item.label} x${item.quantity} (${amount})`;
}

function getSignedCheckoutPaymentAmount(payment: { amount: number; payment_kind?: string | null }) {
  return payment.payment_kind === "refund" ? -Number(payment.amount) : Number(payment.amount);
}

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

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const checkoutFilter = resolvedSearchParams?.checkoutStatus === "paid"
    ? "paid"
    : resolvedSearchParams?.checkoutStatus === "collecting"
      ? "collecting"
      : "all";

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

  let clinicCheckouts: ClinicCheckoutWithRelations[] = [];
  let checkoutCandidates: AppointmentWithRelations[] = [];
  let services: Awaited<ReturnType<typeof getServices>> = [];
  let clinicPosMissing = false;

  try {
    [clinicCheckouts, checkoutCandidates, services] = await Promise.all([
      getClinicCheckouts(user.id, 20),
      getCheckoutDraftCandidates(user.id, 20),
      getServices(user.id)
    ]);
  } catch (error) {
    if (isClinicFoundationMissingError(error)) {
      clinicPosMissing = true;
    } else {
      throw error;
    }
  }

  const summary = getSubscriptionSummary(subscription?.status);
  const filteredClinicCheckouts = clinicCheckouts.filter((checkout) => {
    if (checkoutFilter === "paid") return checkout.payment_status === "paid";
    if (checkoutFilter === "collecting") return checkout.payment_status !== "paid" && checkout.status !== "voided";
    return true;
  });

  return (
    <section className="ui-customer-stack">
      <PageHeader
        title="Billing"
        description="Clinic subscription болон цаашдын POS checkout урсгалын суурь billing layer энд байрлана. Төлбөртэй төлөвлөгөөний төлбөр QPay-аар хийгдэнэ."
      />

      {clinicPosMissing ? (
        <Alert variant="warning">
          Clinic POS schema-ийн сүүлийн migration-ууд хараахан apply хийгдээгүй байна.
          `202604030002_clinic_pos_foundation.sql` болон `202604030003_clinic_checkout_payments.sql`-ийг
          ажиллуулсны дараа checkout болон payment урсгалууд энд бүрэн харагдана.
        </Alert>
      ) : null}

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
          Энд platform subscription invoice-ууд харагдаж байна. Дараагийн шатанд clinic checkout invoice-ууд тусдаа урсгалаар нэмэгдэнэ.
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

      {!clinicPosMissing ? (
        <>
          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Clinic checkout queue
            </h2>
            {checkoutCandidates.length === 0 ? (
              <p style={{ margin: 0 }}>
                Checkout draft үүсгэх completed visit одоогоор алга байна. Appointment-аа дуусгаад treatment record
                бөглөсний дараа draft үүсгэнэ.
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "var(--text-sm)" }}>
                {checkoutCandidates.map((candidate) => (
                  <li key={candidate.id} style={{ marginBottom: "0.4rem" }}>
                    <strong>{candidate.patient?.full_name ?? "Patient"}</strong> ·{" "}
                    {candidate.service?.name ?? candidate.service_id} ·{" "}
                    {new Date(candidate.scheduled_start).toLocaleString("mn-MN")}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Clinic POS drafts
            </h2>
            <p className="ui-text-muted" style={{ margin: 0 }}>
              Filter: <strong>{getCheckoutFilterLabel(checkoutFilter)}</strong>
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <Link href="/billing" className="ui-table__link">Бүгд</Link>
              <Link href="/billing?checkoutStatus=collecting" className="ui-table__link">
                Төлбөр цуглуулж буй
              </Link>
              <Link href="/billing?checkoutStatus=paid" className="ui-table__link">
                Paid
              </Link>
            </div>
            {filteredClinicCheckouts.length === 0 ? (
              <p style={{ margin: 0 }}>Одоогоор clinic checkout draft үүсээгүй байна.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "var(--text-sm)" }}>
                {filteredClinicCheckouts.map((checkout) => {
                  const paidAmount = (checkout.payments ?? []).reduce(
                    (sum, payment) => sum + getSignedCheckoutPaymentAmount(payment),
                    0
                  );
                  const outstanding = Math.max(Number(checkout.total) - paidAmount, 0);
                  const refundableAmount = Math.max(paidAmount, 0);

                  return (
                  <li id={`checkout-${checkout.id}`} key={checkout.id} style={{ marginBottom: "var(--space-3)" }}>
                    <strong>{checkout.patient?.full_name ?? "Patient"}</strong> · {checkout.total}{" "}
                    {checkout.currency} · {checkout.status}/{checkout.payment_status}
                    {checkout.appointment?.scheduled_start ? (
                      <span className="ui-text-muted">
                        {" "}· visit {new Date(checkout.appointment.scheduled_start).toLocaleDateString("mn-MN")}
                      </span>
                    ) : null}
                    {checkout.items && checkout.items.length > 0 ? (
                      <span className="ui-text-muted" style={{ display: "block", marginTop: "0.2rem" }}>
                        {checkout.items.map((item: ClinicCheckoutItemRow) => formatCheckoutLineItem(item)).join(" · ")}
                      </span>
                    ) : null}
                    <span className="ui-text-muted" style={{ display: "block", marginTop: "0.2rem" }}>
                      Subtotal: {Number(checkout.subtotal).toFixed(2)} {checkout.currency}
                      {" · "}
                      Discount: {Number(checkout.discount_total).toFixed(2)} {checkout.currency}
                      {" · "}
                      Net paid: {paidAmount.toFixed(2)} {checkout.currency}
                      {" · "}
                      Үлдэгдэл: {outstanding.toFixed(2)} {checkout.currency}
                    </span>
                    <span className="ui-text-muted" style={{ display: "block", marginTop: "0.2rem" }}>
                      Receipt summary: {checkout.items?.length ?? 0} item
                      {" · "}
                      visit {checkout.appointment?.scheduled_start
                        ? new Date(checkout.appointment.scheduled_start).toLocaleString("mn-MN")
                        : "unknown"}
                      {" · "}
                      patient {checkout.patient?.phone ?? "no phone"}
                    </span>
                    {checkout.payments && checkout.payments.length > 0 ? (
                      <span className="ui-text-muted" style={{ display: "block", marginTop: "0.2rem" }}>
                        {checkout.payments
                          .map(
                            (payment) =>
                              `${payment.payment_kind === "refund" ? "refund" : payment.payment_method} ${Number(payment.amount).toFixed(2)} ${payment.currency}`
                          )
                        .join(" · ")}
                      </span>
                    ) : null}
                    {checkout.payment_status !== "paid" ? (
                      <AddCheckoutItemForm
                        checkoutId={checkout.id}
                        currency={checkout.currency}
                        serviceCatalog={services.map((service) => ({
                          id: service.id,
                          name: service.name,
                          priceFrom: Number(service.price_from ?? 0),
                          currency: service.currency ?? checkout.currency
                        }))}
                      />
                    ) : null}
                    {outstanding > 0 ? (
                      <CaptureCheckoutPaymentForm
                        checkoutId={checkout.id}
                        currency={checkout.currency}
                        outstanding={outstanding}
                      />
                    ) : null}
                    {refundableAmount > 0 ? (
                      <RefundCheckoutForm
                        checkoutId={checkout.id}
                        currency={checkout.currency}
                        refundableAmount={refundableAmount}
                      />
                    ) : null}
                    {checkout.payment_status === "unpaid" && checkout.status !== "voided" ? (
                      <VoidCheckoutButton checkoutId={checkout.id} />
                    ) : null}
                  </li>
                )})}
              </ul>
            )}
          </Card>
        </>
      ) : null}

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
