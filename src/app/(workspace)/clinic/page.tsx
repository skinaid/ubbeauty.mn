import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import {
  getClinicLocations,
  getServices,
  getStaffAvailabilityRules,
  getStaffMembers,
  isClinicFoundationMissingError,
} from "@/modules/clinic/data";
import { enforceClinicWorkspaceRouteAccess } from "@/modules/clinic/guard";
import { getCurrentUserOrganization } from "@/modules/organizations/data";

export default async function ClinicHubPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await enforceClinicWorkspaceRouteAccess("/clinic");

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) redirect("/setup-organization");

  let locationCount = 0;
  let staffCount = 0;
  let serviceCount = 0;
  let availabilityCount = 0;

  try {
    const [locations, staff, services, rules] = await Promise.all([
      getClinicLocations(user.id),
      getStaffMembers(user.id),
      getServices(user.id),
      getStaffAvailabilityRules(user.id),
    ]);
    locationCount = locations.length;
    staffCount = staff.length;
    serviceCount = services.length;
    availabilityCount = rules.length;
  } catch (err) {
    if (!isClinicFoundationMissingError(err)) throw err;
  }

  const cards = [
    {
      href: "/clinic/profile",
      emoji: "📝",
      title: "Профайл",
      description: "Эмнэлгийн нэр, тайлбар, холбоо барих мэдээлэл",
      stat: null,
      statLabel: null,
    },
    {
      href: "/clinic/locations",
      emoji: "📍",
      title: "Байршил",
      description: "Салбар, хаяг, дүүрэг, утас",
      stat: locationCount,
      statLabel: "салбар",
    },
    {
      href: "/clinic/staff",
      emoji: "👥",
      title: "Ажилтан",
      description: "Provider, front desk болон бусад ажилтнууд",
      stat: staffCount,
      statLabel: "ажилтан",
    },
    {
      href: "/clinic/services",
      emoji: "💆",
      title: "Үйлчилгээ",
      description: "Booking болон POS-д харагдах үйлчилгээний жагсаалт",
      stat: serviceCount,
      statLabel: "үйлчилгээ",
    },
    {
      href: "/clinic/availability",
      emoji: "🗓",
      title: "Ажлын цаг",
      description: "Staff болон салбарын ажиллах цагийн тохиргоо",
      stat: availabilityCount,
      statLabel: "цагийн rule",
    },
  ];

  return (
    <section className="ui-customer-stack">
      <PageHeader
        title={organization.name ?? "Clinic Hub"}
        description="Эмнэлгийн тохиргоо болон удирдлагын төв"
      />

      <div className="clinic-hub-grid">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="clinic-hub-card">
            <div className="clinic-hub-card__icon">{card.emoji}</div>
            <div className="clinic-hub-card__body">
              <h2 className="clinic-hub-card__title">{card.title}</h2>
              <p className="clinic-hub-card__desc">{card.description}</p>
            </div>
            {card.stat !== null && (
              <div className="clinic-hub-card__stat">
                <span className="clinic-hub-card__stat-num">{card.stat}</span>
                <span className="clinic-hub-card__stat-label">{card.statLabel}</span>
              </div>
            )}
            <span className="clinic-hub-card__arrow">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
