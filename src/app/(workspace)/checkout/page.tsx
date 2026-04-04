import Link from "next/link";
import { redirect } from "next/navigation";
import { AddCheckoutItemForm } from "@/components/clinic/add-checkout-item-form";
import { CaptureCheckoutPaymentForm } from "@/components/clinic/capture-checkout-payment-form";
import { CheckoutDraftCandidatesPanel } from "@/components/clinic/checkout-draft-candidates-panel";
import { CheckoutQuickActions } from "@/components/clinic/checkout-quick-actions";
import { CheckoutQueuePanel } from "@/components/clinic/checkout-queue-panel";
import { PrintCheckoutReceiptButton } from "@/components/clinic/print-checkout-receipt-button";
import { RefundCheckoutForm } from "@/components/clinic/refund-checkout-form";
import { RemoveCheckoutItemButton } from "@/components/clinic/remove-checkout-item-button";
import { UpdateCheckoutItemForm } from "@/components/clinic/update-checkout-item-form";
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
import { getCurrentUserOrganization } from "@/modules/organizations/data";

type CheckoutPageProps = {
  searchParams?: Promise<{
    checkoutId?: string;
  }>;
};

function getSignedCheckoutPaymentAmount(payment: { amount: number; payment_kind?: string | null }) {
  return payment.payment_kind === "refund" ? -Number(payment.amount) : Number(payment.amount);
}

function getCheckoutOutstandingAmount(checkout: ClinicCheckoutWithRelations): number {
  const total = Number(checkout.total ?? 0);
  const paid = (checkout.payments ?? []).reduce(
    (sum, payment) => sum + getSignedCheckoutPaymentAmount(payment),
    0
  );
  return Number(Math.max(total - paid, 0).toFixed(2));
}

function formatMoney(amount: number, currency: string) {
  return `${Number(amount ?? 0).toFixed(2)} ${currency}`;
}

function formatReceiptReference(checkoutId: string) {
  const shortId = checkoutId.slice(0, 8).toUpperCase();
  const datePart = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .format(new Date())
    .replaceAll("-", "");

  return `UB-${datePart}-${shortId}`;
}

export default async function RetailCheckoutPage({ searchParams }: CheckoutPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) {
    redirect("/setup-organization");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  let clinicPosMissing = false;
  let checkouts: ClinicCheckoutWithRelations[] = [];
  let checkoutCandidates: AppointmentWithRelations[] = [];
  let services: Awaited<ReturnType<typeof getServices>> = [];

  try {
    [checkouts, checkoutCandidates, services] = await Promise.all([
      getClinicCheckouts(user.id, 20),
      getCheckoutDraftCandidates(user.id, 12),
      getServices(user.id)
    ]);
  } catch (error) {
    if (isClinicFoundationMissingError(error)) {
      clinicPosMissing = true;
    } else {
      throw error;
    }
  }

  const activeCheckout =
    checkouts.find((checkout) => checkout.id === resolvedSearchParams?.checkoutId) ??
    checkouts.find((checkout) => checkout.status !== "voided" && checkout.payment_status !== "paid") ??
    checkouts[0] ??
    null;

  const outstanding = activeCheckout ? getCheckoutOutstandingAmount(activeCheckout) : 0;
  const paidAmount = activeCheckout
    ? (activeCheckout.payments ?? []).reduce((sum, payment) => sum + getSignedCheckoutPaymentAmount(payment), 0)
    : 0;
  const refundableAmount = Math.max(paidAmount, 0);
  const receiptReference = activeCheckout ? formatReceiptReference(activeCheckout.id) : null;
  const receiptGeneratedAt = new Date().toLocaleString("mn-MN");

  return (
    <section className="ui-customer-stack">
      <PageHeader
        title="Checkout POS"
        description="Cashier болон front desk-д зориулсан active cart, payment till, draft queue-г нэг дэлгэц дээр нэгтгэсэн кассын орчин."
      />

      {!clinicPosMissing ? <CheckoutQuickActions canPrint={Boolean(activeCheckout)} /> : null}

      {clinicPosMissing ? (
        <Alert variant="warning">
          Clinic POS migration бүрэн apply хийгдээгүй байна. `202604030002_clinic_pos_foundation.sql`,
          `202604030003_clinic_checkout_payments.sql`, `202604030004_clinic_checkout_refunds.sql`-ийг ажиллуулсны дараа
          энэ дэлгэц бүрэн ажиллана.
        </Alert>
      ) : null}

      {!clinicPosMissing ? (
        <>
          <div className="ui-stat-grid">
            <Card padded stack>
              <span className="ui-text-muted">Active drafts</span>
              <strong style={{ fontSize: "var(--text-2xl)" }}>{checkouts.length}</strong>
              <p style={{ margin: 0 }}>Checkout queue-д байгаа нийт cart</p>
            </Card>
            <Card padded stack>
              <span className="ui-text-muted">Collecting</span>
              <strong style={{ fontSize: "var(--text-2xl)" }}>
                {checkouts.filter((checkout) => checkout.payment_status !== "paid" && checkout.status !== "voided").length}
              </strong>
              <p style={{ margin: 0 }}>Төлбөр хүлээж буй checkout</p>
            </Card>
            <Card padded stack>
              <span className="ui-text-muted">Draft candidates</span>
              <strong style={{ fontSize: "var(--text-2xl)" }}>{checkoutCandidates.length}</strong>
              <p style={{ margin: 0 }}>Checkout draft үүсгэх боломжтой visit</p>
            </Card>
          </div>

          <div className="ui-stat-grid" style={{ alignItems: "start" }}>
            <CheckoutQueuePanel checkouts={checkouts} activeCheckoutId={activeCheckout?.id} />

            <Card padded stack>
              <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                Active cart
              </h2>
              {!activeCheckout ? (
                <p style={{ margin: 0 }}>Queue-с checkout сонгоно уу.</p>
              ) : (
                <>
                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    <strong>{activeCheckout.patient?.full_name ?? "Patient"}</strong>
                    <span className="ui-text-muted">
                      {activeCheckout.appointment?.scheduled_start
                        ? new Date(activeCheckout.appointment.scheduled_start).toLocaleString("mn-MN")
                        : "Visit time unknown"}
                    </span>
                    <span className="ui-text-muted">
                      Status: {activeCheckout.status}/{activeCheckout.payment_status}
                    </span>
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      <Link href={`/patients/${activeCheckout.patient_id}`} className="ui-table__link">
                        Patient CRM нээх
                      </Link>
                      <Link href="/schedule" className="ui-table__link">
                        Schedule нээх
                      </Link>
                      <Link href={`/billing#checkout-${activeCheckout.id}`} className="ui-table__link">
                        Billing нээх
                      </Link>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    {(activeCheckout.items ?? []).map((item) => (
                      <div
                        key={item.id}
                        className="ui-card ui-card--padded"
                        style={{ display: "grid", gap: "0.65rem" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "start", flexWrap: "wrap" }}>
                          <div style={{ display: "grid", gap: "0.25rem" }}>
                            <strong>{item.label}</strong>
                            <span className="ui-text-muted">{item.item_type} · qty {item.quantity}</span>
                          </div>
                          <strong>{formatMoney(Number(item.line_total ?? 0), activeCheckout.currency)}</strong>
                        </div>

                        {activeCheckout.payment_status !== "paid" ? (
                          <UpdateCheckoutItemForm
                            checkoutItemId={item.id}
                            defaultLabel={item.label}
                            defaultQuantity={item.quantity}
                            defaultUnitPrice={Number(item.unit_price ?? 0)}
                            itemType={item.item_type}
                          />
                        ) : null}

                        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                          <span className="ui-text-muted">
                            Unit {formatMoney(Number(item.unit_price ?? 0), activeCheckout.currency)}
                          </span>
                          {activeCheckout.payment_status !== "paid" ? (
                            <RemoveCheckoutItemButton checkoutItemId={item.id} />
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  {activeCheckout.payment_status !== "paid" ? (
                    <AddCheckoutItemForm
                      checkoutId={activeCheckout.id}
                      currency={activeCheckout.currency}
                      serviceCatalog={services.map((service) => ({
                        id: service.id,
                        name: service.name,
                        priceFrom: Number(service.price_from ?? 0),
                        currency: service.currency ?? activeCheckout.currency
                      }))}
                    />
                  ) : null}
                </>
              )}
            </Card>

            <Card padded stack className="checkout-print-hidden">
              <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                Payment till
              </h2>
              {!activeCheckout ? (
                <p style={{ margin: 0 }}>Payment till нээхийн тулд active checkout сонгоно уу.</p>
              ) : (
                <>
                  <div style={{ display: "grid", gap: "0.45rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                      <span className="ui-text-muted">Subtotal</span>
                      <strong>{Number(activeCheckout.subtotal ?? 0).toFixed(2)} {activeCheckout.currency}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                      <span className="ui-text-muted">Discount</span>
                      <strong>{Number(activeCheckout.discount_total ?? 0).toFixed(2)} {activeCheckout.currency}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                      <span className="ui-text-muted">Net paid</span>
                      <strong>{paidAmount.toFixed(2)} {activeCheckout.currency}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "1.1rem" }}>
                      <span>Total due</span>
                      <strong>{outstanding.toFixed(2)} {activeCheckout.currency}</strong>
                    </div>
                  </div>

                  {outstanding > 0 ? (
                    <CaptureCheckoutPaymentForm
                      checkoutId={activeCheckout.id}
                      currency={activeCheckout.currency}
                      outstanding={outstanding}
                    />
                  ) : null}

                  {refundableAmount > 0 ? (
                    <RefundCheckoutForm
                      checkoutId={activeCheckout.id}
                      currency={activeCheckout.currency}
                      refundableAmount={refundableAmount}
                    />
                  ) : null}

                  {activeCheckout.payment_status === "unpaid" && activeCheckout.status !== "voided" ? (
                    <VoidCheckoutButton checkoutId={activeCheckout.id} />
                  ) : null}
                </>
              )}
            </Card>
          </div>

          <div className="ui-stat-grid" style={{ alignItems: "start" }}>
            <Card padded stack className="checkout-print-hidden">
              <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                Payment log
              </h2>
              {!activeCheckout ? (
                <p style={{ margin: 0 }}>Payment history харахын тулд checkout сонгоно уу.</p>
              ) : activeCheckout.payments && activeCheckout.payments.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                  {activeCheckout.payments.map((payment) => (
                    <li key={payment.id}>
                      {payment.payment_kind === "refund" ? "refund" : payment.payment_method} ·{" "}
                      {Number(payment.amount).toFixed(2)} {payment.currency}
                      {payment.paid_at ? ` · ${new Date(payment.paid_at).toLocaleString("mn-MN")}` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0 }}>Одоогоор payment log алга байна.</p>
              )}
            </Card>

            <CheckoutDraftCandidatesPanel candidates={checkoutCandidates} />
          </div>

          <Card padded stack className="checkout-receipt-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: "0.25rem" }}>
                <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                  Receipt summary
                </h2>
                <span className="ui-text-muted">
                  Payment хийгдсэний дараа cashier receipt preview-г эндээс харж, шууд хэвлэнэ.
                </span>
              </div>
              {activeCheckout ? <PrintCheckoutReceiptButton /> : null}
            </div>

            {!activeCheckout ? (
              <p style={{ margin: 0 }}>Receipt үүсгэхийн тулд queue-с checkout сонгоно уу.</p>
            ) : (
              <div className="checkout-receipt-summary">
                <div className="checkout-receipt-summary__brand">
                  <div style={{ display: "grid", gap: "0.2rem" }}>
                    <span className="checkout-receipt-summary__eyebrow">UbBeauty clinic receipt</span>
                    <strong>{organization.name}</strong>
                    <span className="ui-text-muted">Cashier checkout summary</span>
                  </div>
                  <div className="checkout-receipt-summary__reference">
                    <span className="ui-text-muted">Receipt ref</span>
                    <strong>{receiptReference}</strong>
                    <span className="ui-text-muted">Generated {receiptGeneratedAt}</span>
                  </div>
                </div>

                <div className="checkout-receipt-summary__meta">
                  <div>
                    <span className="ui-text-muted">Patient</span>
                    <strong>{activeCheckout.patient?.full_name ?? "Patient"}</strong>
                    <Link href={`/patients/${activeCheckout.patient_id}`} className="ui-table__link">
                      CRM profile
                    </Link>
                  </div>
                  <div>
                    <span className="ui-text-muted">Visit</span>
                    <strong>
                      {activeCheckout.appointment?.scheduled_start
                        ? new Date(activeCheckout.appointment.scheduled_start).toLocaleString("mn-MN")
                        : "Visit time unknown"}
                    </strong>
                    <Link href="/schedule" className="ui-table__link">
                      Schedule
                    </Link>
                  </div>
                  <div>
                    <span className="ui-text-muted">Checkout</span>
                    <strong>{activeCheckout.id.slice(0, 8).toUpperCase()}</strong>
                    <Link href={`/billing#checkout-${activeCheckout.id}`} className="ui-table__link">
                      Billing audit
                    </Link>
                  </div>
                  <div>
                    <span className="ui-text-muted">Status</span>
                    <strong>{activeCheckout.payment_status}</strong>
                  </div>
                </div>

                <div style={{ display: "grid", gap: "0.65rem" }}>
                  {(activeCheckout.items ?? []).map((item) => (
                    <div
                      key={`receipt-${item.id}`}
                      className="checkout-receipt-summary__row"
                    >
                      <div style={{ display: "grid", gap: "0.15rem" }}>
                        <strong>{item.label}</strong>
                        <span className="ui-text-muted">
                          {item.item_type} · {item.quantity} x {formatMoney(Number(item.unit_price ?? 0), activeCheckout.currency)}
                        </span>
                      </div>
                      <strong>{formatMoney(Number(item.line_total ?? 0), activeCheckout.currency)}</strong>
                    </div>
                  ))}
                </div>

                <div className="checkout-receipt-summary__totals">
                  <div className="checkout-receipt-summary__row">
                    <span className="ui-text-muted">Subtotal</span>
                    <strong>{formatMoney(Number(activeCheckout.subtotal ?? 0), activeCheckout.currency)}</strong>
                  </div>
                  <div className="checkout-receipt-summary__row">
                    <span className="ui-text-muted">Discount</span>
                    <strong>{formatMoney(Number(activeCheckout.discount_total ?? 0), activeCheckout.currency)}</strong>
                  </div>
                  <div className="checkout-receipt-summary__row">
                    <span className="ui-text-muted">Net paid</span>
                    <strong>{formatMoney(paidAmount, activeCheckout.currency)}</strong>
                  </div>
                  <div className="checkout-receipt-summary__row checkout-receipt-summary__row--total">
                    <span>Total due</span>
                    <strong>{formatMoney(outstanding, activeCheckout.currency)}</strong>
                  </div>
                </div>

                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <strong>Payment entries</strong>
                  {activeCheckout.payments && activeCheckout.payments.length > 0 ? (
                    activeCheckout.payments.map((payment) => (
                      <div key={`receipt-payment-${payment.id}`} className="checkout-receipt-summary__row">
                        <div style={{ display: "grid", gap: "0.15rem" }}>
                          <span className="ui-text-muted">
                            {payment.payment_kind === "refund" ? "refund" : payment.payment_method}
                            {payment.paid_at ? ` · ${new Date(payment.paid_at).toLocaleString("mn-MN")}` : ""}
                          </span>
                          {payment.reference_code ? (
                            <span className="ui-text-muted">Ref: {payment.reference_code}</span>
                          ) : null}
                        </div>
                        <strong>{formatMoney(Number(payment.amount ?? 0), payment.currency)}</strong>
                      </div>
                    ))
                  ) : (
                    <span className="ui-text-muted">Одоогоор payment entry алга байна.</span>
                  )}
                </div>
              </div>
            )}
          </Card>

          <p className="ui-text-muted checkout-print-hidden" style={{ margin: 0 }}>
            Billing audit ба platform subscription мэдээлэл:{" "}
            <Link href="/billing" className="ui-table__link">
              /billing
            </Link>
          </p>
        </>
      ) : null}
    </section>
  );
}
