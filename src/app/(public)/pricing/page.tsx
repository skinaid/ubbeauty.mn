import Link from "next/link";
import { SelectPlanForm } from "@/components/billing/select-plan-form";
import { StartPaidCheckoutForm } from "@/components/billing/start-paid-checkout-form";
import { Badge, Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getCurrentOrganizationSubscription, getPublicActivePlans } from "@/modules/subscriptions/data";

export default async function PricingPage() {
  const [plans, user] = await Promise.all([getPublicActivePlans(), getCurrentUser()]);
  const organization = user ? await getCurrentUserOrganization(user.id) : null;
  const subscription = user ? await getCurrentOrganizationSubscription(user.id) : null;

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
        title="Pricing"
        description={
          <>
            Paid plans use <strong>QPay</strong>: we create an invoice, you pay via QR or bank deeplinks, then we verify with
            QPay before activating your subscription. No silent plan changes.
          </>
        }
      />

      {user && organization ? (
        <Card padded stack>
          <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 600 }}>Current subscription</h2>
          {subscription ? (
            <p style={{ margin: 0 }}>
              {subscription.plan.name} ({subscription.plan.code}) — <strong>{subscription.status}</strong>
            </p>
          ) : (
            <p style={{ margin: 0 }}>No subscription found yet.</p>
          )}
          <p className="ui-text-muted" style={{ margin: 0 }}>
            <Link href="/billing">Billing</Link> shows invoices and payment status.
          </p>
        </Card>
      ) : (
        <Card padded stack>
          <p style={{ margin: 0 }}>
            <Link href="/login">Sign in</Link> to start checkout for your organization.
          </p>
        </Card>
      )}

      <section style={{ display: "grid", gap: "var(--space-4)" }}>
        {plans.map((plan) => {
          const paid = Number(plan.price_monthly) > 0;
          const isCurrentPlan = subscription?.plan_id === plan.id;
          const isActive = subscription?.status === "active";
          const isBootstrap = subscription?.status === "bootstrap_pending_billing";
          const blocked =
            subscription &&
            ["canceled", "expired", "suspended"].includes(subscription.status);

          const alreadyThisActivePlan = Boolean(subscription && isActive && isCurrentPlan);

          const canStarterCheckout =
            Boolean(organization && subscription && paid && plan.code === "starter" && isBootstrap);

          const canPaidPlanCheckout =
            Boolean(organization && subscription && paid && plan.code !== "starter" && !blocked) &&
            !alreadyThisActivePlan;

          const showCheckout = canStarterCheckout || canPaidPlanCheckout;

          return (
            <Card key={plan.id} padded stack>
              <h3 style={{ margin: 0, fontSize: "var(--text-lg)" }}>{plan.name}</h3>
              <p style={{ margin: 0 }}>
                {plan.price_monthly} {plan.currency} / month
              </p>
              <p style={{ margin: 0 }}>Max pages: {plan.max_pages}</p>
              <p style={{ margin: 0 }}>Syncs per day: {plan.syncs_per_day}</p>
              <p style={{ margin: 0 }}>Monthly AI reports: {plan.monthly_ai_reports}</p>

              {alreadyThisActivePlan ? (
                <Badge variant="success">Current active plan</Badge>
              ) : null}

              {plan.code === "starter" && isBootstrap && paid ? (
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                  Your org is in <code>bootstrap_pending_billing</code>. Pay the starter invoice via QPay to move to{" "}
                  <code>active</code>.
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
                    ? "Starter QPay checkout is only available in bootstrap_pending_billing."
                    : blocked
                      ? "Subscription is not in a payable state."
                      : "Checkout unavailable for this row."}
                </p>
              ) : null}

              {!organization && paid ? (
                <p className="ui-text-muted" style={{ margin: 0, fontSize: "var(--text-xs)" }}>
                  Sign in to pay for this plan.
                </p>
              ) : null}
            </Card>
          );
        })}
      </section>
    </main>
  );
}
