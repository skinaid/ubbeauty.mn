import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getCurrentOrganizationSubscription } from "@/modules/subscriptions/data";

const MVP_BLOCKS = [
  {
    title: "Front desk",
    items: ["Today appointments", "Confirmations", "No-show recovery", "Walk-in intake"]
  },
  {
    title: "Provider operations",
    items: ["Treatment prep", "Clinical notes", "Before/after photos", "Follow-up tasks"]
  },
  {
    title: "Revenue",
    items: ["Checkout draft", "Invoice", "Payment status", "Subscription and clinic billing"]
  }
];

function getSubscriptionLabel(status?: string | null): string {
  switch (status) {
    case "active":
      return "Active";
    case "bootstrap_pending_billing":
      return "Pending activation";
    case "suspended":
      return "Suspended";
    case "expired":
      return "Expired";
    case "canceled":
      return "Canceled";
    default:
      return "Unknown";
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) {
    redirect("/setup-organization");
  }

  const subscription = await getCurrentOrganizationSubscription(user.id);

  return (
    <section className="ui-customer-stack">
      <PageHeader
        title={organization.name}
        description="UbBeauty MVP 1 clinic workspace. Энэ dashboard-аас appointment-led operating system-ийн гол модуль руу орно."
      />

      <div className="ui-stat-grid">
        <Card padded stack>
          <span className="ui-text-muted">Workspace model</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>Clinic OS</strong>
          <p style={{ margin: 0 }}>Public microsite + private admin workspace</p>
        </Card>
        <Card padded stack>
          <span className="ui-text-muted">Subscription</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>{subscription?.plan.name ?? "No plan"}</strong>
          <p style={{ margin: 0 }}>Status: {getSubscriptionLabel(subscription?.status)}</p>
        </Card>
        <Card padded stack>
          <span className="ui-text-muted">Current build phase</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>Foundation</strong>
          <p style={{ margin: 0 }}>Routing, language, modules, schema plan are being shifted to clinic domain.</p>
        </Card>
      </div>

      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        {MVP_BLOCKS.map((block) => (
          <Card key={block.title} padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              {block.title}
            </h2>
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card padded stack>
        <h2 className="ui-section-title" style={{ marginTop: 0 }}>
          Next working areas
        </h2>
        <p style={{ margin: 0 }}>
          1-р implementation wave дээр route, language, workflow foundation хийгдэж байна. Дараагийн wave нь
          appointment schema, service catalog, staff availability дээр төвлөрнө.
        </p>
        <p className="ui-text-muted" style={{ margin: 0 }}>
          Public preview: <Link href="/clinics">/clinics</Link> · Build plan:{" "}
          <Link href="/clinic" className="ui-table__link">
            Clinic Profile
          </Link>
        </p>
      </Card>
    </section>
  );
}
