import Link from "next/link";
import { SelectPlanForm } from "@/components/billing/select-plan-form";
import { StartPaidCheckoutForm } from "@/components/billing/start-paid-checkout-form";
import { Badge, Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getCurrentOrganizationSubscription, getPublicActivePlans } from "@/modules/subscriptions/data";

function getPlanFit(planCode: string): string {
  switch (planCode) {
    case "free":
      return "Анхны clinic setup, service menu, workflow туршилтад тохирно.";
    case "starter":
      return "Нэг салбартай clinic-ийн appointment, CRM, treatment workflow эхлүүлэхэд тохирно.";
    case "growth":
      return "Илүү олон staff, илүү их patient volume, олон role-той багт тохирно.";
    default:
      return "Clinic-ийн үйл ажиллагааны өсөлт, service volume-д тааруулан сонгоно.";
  }
}

function getSubscriptionDisplay(status?: string | null): { label: string; note: string } {
  switch (status) {
    case "active":
      return {
        label: "Идэвхтэй",
        note: "Таны subscription идэвхтэй байна. Нэхэмжлэл болон төлбөрийн түүхийг Billing хэсгээс харна."
      };
    case "bootstrap_pending_billing":
      return {
        label: "Төлбөр баталгаажуулах хүлээлттэй",
        note: "Starter plan-аа идэвхжүүлэхийн тулд QPay төлбөрөө дуусгаад баталгаажуулалт хүлээнэ."
      };
    case "canceled":
      return {
        label: "Цуцлагдсан",
        note: "Төлөвлөгөө дахин идэвхжүүлэх шаардлагатай байж магадгүй. Дэлгэрэнгүйг Billing хэсгээс шалгана уу."
      };
    case "expired":
      return {
        label: "Хугацаа дууссан",
        note: "Төлбөрийн төлөвөө шалгаад шаардлагатай бол шинэ төлөвлөгөө сонгоно уу."
      };
    case "suspended":
      return {
        label: "Түр хязгаарлагдсан",
        note: "Төлбөр болон subscription төлөвөө Billing хэсгээс шалгаад дараагийн алхмаа тодруулна уу."
      };
    default:
      return {
        label: "Тодорхойгүй",
        note: "Одоогийн subscription төлөвийг Billing хэсгээс шалгана уу."
      };
  }
}

export default async function PricingPage() {
  const [plans, user] = await Promise.all([getPublicActivePlans(), getCurrentUser()]);
  const organization = user ? await getCurrentUserOrganization(user.id) : null;
  const subscription = user ? await getCurrentOrganizationSubscription(user.id) : null;
  const subscriptionDisplay = getSubscriptionDisplay(subscription?.status);

  return (
    <main className="ui-page-main">
      {user ? (
        <p className="ui-text-muted" style={{ margin: 0 }}>
          <Link href="/dashboard">← Dashboard</Link>
          {organization ? (
            <>
              {" · "}
              <Link href="/billing">Billing</Link>
            </>
          ) : null}
        </p>
      ) : null}

      <PageHeader
        title="Төлөвлөгөө ба төлбөр"
        description={
          <>
            UbBeauty-ийн төлөвлөгөөнүүд нь clinic workspace, team size, operational growth-ийг дэмжих subscription
            суурь болно. Төлбөртэй төлөвлөгөөний төлбөрийг <strong>QPay</strong>-аар хийж, баталгаажсаны дараа
            subscription идэвхжинэ.
          </>
        }
      />

      <section style={{ display: "grid", gap: "var(--space-4)" }}>
        <Card padded stack>
          <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 600 }}>Төлбөр хэрхэн явагдах вэ?</h2>
          <ol style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "var(--space-2)" }}>
            <li>Clinic-ийнхээ stage-д тохирох төлөвлөгөөг сонгоно.</li>
            <li>Төлбөртэй төлөвлөгөө бол QPay нэхэмжлэл үүсгээд төлнө.</li>
            <li>UbBeauty төлбөр баталгаажсаны дараа subscription-ийг идэвхжүүлнэ.</li>
          </ol>
          <p className="ui-text-muted" style={{ margin: 0 }}>
            Төлбөрийн явц, нэхэмжлэл, баталгаажуулалтын төлөвийг <Link href="/billing">Billing</Link> хэсгээс харж
            болно.
          </p>
        </Card>

        {user && organization ? (
          <Card padded stack>
            <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 600 }}>Одоогийн subscription</h2>
            {subscription ? (
              <>
                <p style={{ margin: 0 }}>
                  <strong>{subscription.plan.name}</strong> ({subscription.plan.code}) · <strong>{subscriptionDisplay.label}</strong>
                </p>
                <p className="ui-text-muted" style={{ margin: 0 }}>
                  {subscriptionDisplay.note}
                </p>
              </>
            ) : (
              <p style={{ margin: 0 }}>Одоогоор subscription бүртгэгдээгүй байна. Тохирох төлөвлөгөөгөө сонгоод эхэлнэ үү.</p>
            )}
            <p className="ui-text-muted" style={{ margin: 0 }}>
              <Link href="/billing">Billing</Link> хэсэгт нэхэмжлэл, төлбөрийн төлөв, сүүлийн түүх харагдана.
            </p>
          </Card>
        ) : (
          <Card padded stack>
            <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 600 }}>Эхлэхийн өмнө</h2>
            <p style={{ margin: 0 }}>
              Эхлээд <Link href="/login">нэвтэрч</Link>, байгууллагаа үүсгээд дараа нь төлөвлөгөөгөө сонгон төлбөрөө
              үргэлжлүүлнэ.
            </p>
          </Card>
        )}
      </section>

      <section style={{ display: "grid", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
        {plans.map((plan) => {
          const paid = Number(plan.price_monthly) > 0;
          const isCurrentPlan = subscription?.plan_id === plan.id;
          const isActive = subscription?.status === "active";
          const isBootstrap = subscription?.status === "bootstrap_pending_billing";
          const blocked = subscription && ["canceled", "expired", "suspended"].includes(subscription.status);

          const alreadyThisActivePlan = Boolean(subscription && isActive && isCurrentPlan);

          const canStarterCheckout = Boolean(organization && subscription && paid && plan.code === "starter" && isBootstrap);

          const canPaidPlanCheckout =
            Boolean(organization && subscription && paid && plan.code !== "starter" && !blocked) && !alreadyThisActivePlan;

          const showCheckout = canStarterCheckout || canPaidPlanCheckout;

          return (
            <Card key={plan.id} padded stack>
              <div style={{ display: "grid", gap: "var(--space-2)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: "var(--text-lg)" }}>{plan.name}</h3>
                  {alreadyThisActivePlan ? <Badge variant="success">Одоогийн төлөвлөгөө</Badge> : null}
                </div>
                <p style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 600 }}>
                  {plan.price_monthly} {plan.currency} / сар
                </p>
                <p className="ui-text-muted" style={{ margin: 0 }}>
                  {getPlanFit(plan.code)}
                </p>
              </div>

              <div style={{ display: "grid", gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
                <p style={{ margin: 0 }}>Clinic capacity slot: <strong>{plan.max_pages}</strong></p>
                <p style={{ margin: 0 }}>Daily operations quota: <strong>{plan.syncs_per_day}</strong></p>
                <p style={{ margin: 0 }}>Monthly AI / automation quota: <strong>{plan.monthly_ai_reports}</strong></p>
              </div>

              {plan.code === "starter" && isBootstrap && paid ? (
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                  Энэ төлөвлөгөөг идэвхжүүлэхийн тулд QPay төлбөрөө дуусгаад баталгаажуулалт хүлээнэ.
                </p>
              ) : null}

              {!paid && organization ? (
                <SelectPlanForm
                  organizationId={organization.id}
                  planCode={plan.code}
                  isCurrentPlan={Boolean(isCurrentPlan && isActive)}
                  isSelectable
                />
              ) : null}

              {showCheckout && organization && subscription ? (
                <StartPaidCheckoutForm organizationId={organization.id} planId={plan.id} planLabel={plan.name} />
              ) : null}

              {paid && organization && subscription && !showCheckout && !alreadyThisActivePlan ? (
                <p className="ui-text-muted" style={{ margin: 0, fontSize: "var(--text-xs)" }}>
                  {plan.code === "starter" && !isBootstrap
                    ? "Starter төлөвлөгөөний төлбөр энэ үед нээлттэй биш байна. Billing хэсгээс одоогийн төлвөө шалгана уу."
                    : blocked
                      ? "Одоогийн subscription төлөвөөс шалтгаалаад энэ төлөвлөгөөний төлбөрийг одоогоор эхлүүлэх боломжгүй байна."
                      : "Одоогийн нөхцөлд энэ мөрөөс төлбөр эхлүүлэх боломжгүй байна. Billing хэсгээс дэлгэрэнгүй шалгана уу."}
                </p>
              ) : null}

              {!organization && paid ? (
                <p className="ui-text-muted" style={{ margin: 0, fontSize: "var(--text-xs)" }}>
                  Энэ төлөвлөгөөг сонгож төлбөрөө үргэлжлүүлэхийн тулд эхлээд нэвтэрнэ үү.
                </p>
              ) : null}
            </Card>
          );
        })}
      </section>
    </main>
  );
}
