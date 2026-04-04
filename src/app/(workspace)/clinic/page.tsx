import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateClinicLocationForm } from "@/components/clinic/create-clinic-location-form";
import { CreateServiceForm } from "@/components/clinic/create-service-form";
import { CreateStaffAvailabilityRuleForm } from "@/components/clinic/create-staff-availability-rule-form";
import { CreateStaffMemberForm } from "@/components/clinic/create-staff-member-form";
import { Alert, Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import {
  getClinicLocations,
  getServices,
  getStaffAvailabilityRules,
  getStaffMembers,
  isClinicFoundationMissingError
} from "@/modules/clinic/data";
import type {
  ClinicLocationRow,
  ServiceRow,
  StaffAvailabilityRuleRow,
  StaffMemberRow
} from "@/modules/clinic/types";
import { enforceClinicWorkspaceRouteAccess } from "@/modules/clinic/guard";
import { getCurrentUserOrganization } from "@/modules/organizations/data";

type SetupStep = {
  key: string;
  title: string;
  description: string;
  done: boolean;
  countLabel: string;
  helper: string;
};

export default async function ClinicProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await enforceClinicWorkspaceRouteAccess("/clinic");

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) redirect("/setup-organization");

  const clinicSlug = organization.slug;
  let locations: ClinicLocationRow[] = [];
  let services: ServiceRow[] = [];
  let staffMembers: StaffMemberRow[] = [];
  let availabilityRules: StaffAvailabilityRuleRow[] = [];
  let migrationMissing = false;

  try {
    [locations, services, staffMembers, availabilityRules] = await Promise.all([
      getClinicLocations(user.id),
      getServices(user.id),
      getStaffMembers(user.id),
      getStaffAvailabilityRules(user.id)
    ]);
  } catch (error) {
    if (isClinicFoundationMissingError(error)) {
      migrationMissing = true;
    } else {
      throw error;
    }
  }

  const weekdayLabels = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
  const staffById = new Map(staffMembers.map((staff) => [staff.id, staff]));
  const locationById = new Map(locations.map((location) => [location.id, location]));
  const goLiveReady =
    locations.length > 0 &&
    staffMembers.length > 0 &&
    services.length > 0 &&
    availabilityRules.length > 0;
  const setupSteps: SetupStep[] = [
    {
      key: "locations",
      title: "1. Салбар тохируулах",
      description: "Хэрэглэгч хаана очиж үйлчлүүлэхээ мэдэхийн тулд ядаж нэг branch бүртгэнэ.",
      done: locations.length > 0,
      countLabel: `${locations.length} location`,
      helper: locations.length > 0 ? "Салбарын үндсэн суурь бэлэн." : "Ядаж 1 салбар нэмэх хэрэгтэй."
    },
    {
      key: "staff",
      title: "2. Баг бүрдүүлэх",
      description: "Provider, front desk, manager role-уудаа оруулж schedule болон booking дээр холбох.",
      done: staffMembers.length > 0,
      countLabel: `${staffMembers.length} staff`,
      helper: staffMembers.length > 0 ? "Багийн бүртгэл бэлэн." : "Ядаж 1 provider/staff нэмэх хэрэгтэй."
    },
    {
      key: "services",
      title: "3. Үйлчилгээ нээх",
      description: "Public booking, POS, treatment record бүгд service catalog-оос хамаарна.",
      done: services.length > 0,
      countLabel: `${services.length} service`,
      helper: services.length > 0 ? "Booking-ready menu бэлэн." : "Ядаж 1 үйлчилгээ нэмэх хэрэгтэй."
    },
    {
      key: "availability",
      title: "4. Ажлын цаг холбох",
      description: "Staff + branch availability rule-гүй бол online slot бодитоор гарч ирэхгүй.",
      done: availabilityRules.length > 0,
      countLabel: `${availabilityRules.length} rule`,
      helper:
        availabilityRules.length > 0
          ? "Schedule rule-ууд холбогдсон."
          : "Ядаж 1 availability rule тохируулах хэрэгтэй."
    }
  ];
  const completedStepCount = setupSteps.filter((step) => step.done).length;
  const nextStep = setupSteps.find((step) => !step.done) ?? null;

  return (
    <section className="ui-customer-stack">
      <PageHeader
        title="Clinic Setup Wizard"
        description="Go-live хийхэд хэрэгтэй branch, staff, services, availability гэсэн 4 үндсэн алхмыг дарааллаар нь бэлдэнэ."
      />

      <Card padded stack>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "start" }}>
          <div style={{ display: "grid", gap: "0.35rem" }}>
            <strong>{organization.name}</strong>
            <span className="ui-text-muted">
              Одоогийн clinic slug: <code>{clinicSlug}</code>
            </span>
            <span className="ui-text-muted">
              Public preview:{" "}
              <Link href={`/clinics/${clinicSlug}`} className="ui-table__link">
                /clinics/{clinicSlug}
              </Link>
            </span>
          </div>
          <div style={{ display: "grid", gap: "0.25rem", justifyItems: "start" }}>
            <strong>{completedStepCount}/4 алхам дууссан</strong>
            <span className="ui-text-muted">
              {goLiveReady
                ? "Clinic public booking-д бэлэн байна."
                : nextStep
                  ? `Дараагийн алхам: ${nextStep.title}`
                  : "Wizard бэлэн."}
            </span>
          </div>
        </div>
      </Card>

      {migrationMissing ? (
        <Alert variant="warning">
          Clinic schema migration хараахан ажиллуулаагүй байна. `202604030001_clinic_mvp_foundation.sql`-ийг Supabase
          дээрээ apply хийсний дараа location, staff, service setup энд ажиллана.
        </Alert>
      ) : null}

      <div className="ui-stat-grid">
        <Card padded stack>
          <span className="ui-text-muted">Locations</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>{locations.length}</strong>
          <p style={{ margin: 0 }}>Clinic branch болон service delivery суурь</p>
        </Card>
        <Card padded stack>
          <span className="ui-text-muted">Staff</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>{staffMembers.length}</strong>
          <p style={{ margin: 0 }}>Provider, front desk, manager role-ууд</p>
        </Card>
        <Card padded stack>
          <span className="ui-text-muted">Services</span>
          <strong style={{ fontSize: "var(--text-2xl)" }}>{services.length}</strong>
          <p style={{ margin: 0 }}>Booking-ready treatment menu</p>
        </Card>
      </div>

      {!migrationMissing ? (
        <>
          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Setup progress
            </h2>
            <div style={{ display: "grid", gap: "var(--space-3)" }}>
              {setupSteps.map((step) => (
                <div
                  key={step.key}
                  className="ui-card ui-card--padded"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                    alignItems: "start",
                    flexWrap: "wrap",
                    border: step.done ? "1px solid rgba(34, 197, 94, 0.22)" : "1px solid rgba(148, 163, 184, 0.18)"
                  }}
                >
                  <div style={{ display: "grid", gap: "0.3rem", flex: 1, minWidth: "240px" }}>
                    <strong>{step.title}</strong>
                    <span className="ui-text-muted">{step.description}</span>
                    <span className="ui-text-muted">{step.helper}</span>
                  </div>
                  <div style={{ display: "grid", gap: "0.25rem", justifyItems: "start" }}>
                    <strong>{step.countLabel}</strong>
                    <span className="ui-text-muted">{step.done ? "Complete" : "Pending"}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="ui-stat-grid">
            <Card padded stack>
              <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                Алхам 1: Салбар
              </h2>
              <p className="ui-text-muted" style={{ margin: 0 }}>
                Эндээс хэрэглэгч branch/location сонгоно.
              </p>
              <CreateClinicLocationForm />
            </Card>
            <Card padded stack>
              <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                Алхам 2: Баг
              </h2>
              <p className="ui-text-muted" style={{ margin: 0 }}>
                Provider болон front desk-ээ эхэлж бүртгэнэ.
              </p>
              <CreateStaffMemberForm />
            </Card>
          </div>

          <div className="ui-stat-grid">
            <Card padded stack>
              <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                Алхам 3: Үйлчилгээ
              </h2>
              <p className="ui-text-muted" style={{ margin: 0 }}>
                Public booking болон POS энэ menu-гээс ажиллана.
              </p>
              <CreateServiceForm />
            </Card>
            <Card padded stack>
              <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                Алхам 4: Availability
              </h2>
              <p className="ui-text-muted" style={{ margin: 0 }}>
                Staff schedule-г slot generation-тэй холбох сүүлийн алхам.
              </p>
              <CreateStaffAvailabilityRuleForm staffMembers={staffMembers} locations={locations} />
            </Card>
            <Card padded stack>
              <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                Launch checklist
              </h2>
              <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                <li>{locations.length > 0 ? "Branch бэлэн" : "Branch дутуу"}</li>
                <li>{staffMembers.length > 0 ? "Staff бэлэн" : "Staff дутуу"}</li>
                <li>{services.length > 0 ? "Service menu бэлэн" : "Service menu дутуу"}</li>
                <li>{availabilityRules.length > 0 ? "Availability бэлэн" : "Availability дутуу"}</li>
              </ul>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <Link href="/schedule" className="ui-table__link">
                  Schedule
                </Link>
                <Link href="/checkout" className="ui-table__link">
                  POS
                </Link>
                <Link href={`/clinics/${clinicSlug}`} className="ui-table__link">
                  Public profile
                </Link>
              </div>
            </Card>
          </div>

          <div className="ui-stat-grid">
            <Card padded stack>
              <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                Салбарууд
              </h2>
              {locations.length === 0 ? (
                <p style={{ margin: 0 }}>Одоогоор салбар бүртгэгдээгүй байна.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                  {locations.map((location) => (
                    <li key={location.id}>
                      <strong>{location.name}</strong>
                      {location.district ? ` · ${location.district}` : ""}
                      {location.phone ? ` · ${location.phone}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card padded stack>
              <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                Ажилтнууд
              </h2>
              {staffMembers.length === 0 ? (
                <p style={{ margin: 0 }}>Одоогоор ажилтан бүртгэгдээгүй байна.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                  {staffMembers.map((staffMember) => (
                    <li key={staffMember.id}>
                      <strong>{staffMember.full_name}</strong> · {staffMember.role}
                      {staffMember.specialty ? ` · ${staffMember.specialty}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card padded stack>
              <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                Үйлчилгээнүүд
              </h2>
              {services.length === 0 ? (
                <p style={{ margin: 0 }}>Одоогоор үйлчилгээ бүртгэгдээгүй байна.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                  {services.map((service) => (
                    <li key={service.id}>
                      <strong>{service.name}</strong> · {service.duration_minutes} мин · {service.price_from}{" "}
                      {service.currency}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card padded stack>
              <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                Staff availability
              </h2>
              {availabilityRules.length === 0 ? (
                <p style={{ margin: 0 }}>Одоогоор ажлын цагийн rule бүртгэгдээгүй байна.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                  {availabilityRules.map((rule) => (
                    <li key={rule.id}>
                      <strong>{staffById.get(rule.staff_member_id)?.full_name ?? "Staff"}</strong>
                      {` · ${weekdayLabels[rule.weekday] ?? rule.weekday} · ${rule.start_local.slice(0, 5)}-${rule.end_local.slice(0, 5)}`}
                      {rule.location_id ? ` · ${locationById.get(rule.location_id)?.name ?? "Location"}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </section>
  );
}
