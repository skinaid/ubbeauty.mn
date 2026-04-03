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
import { getCurrentUserOrganization } from "@/modules/organizations/data";

function buildClinicSlugPreview(name: string, organizationId: string): string {
  const latinSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (latinSlug) {
    return latinSlug;
  }

  const compactName = name.replace(/\s+/g, "").trim();
  if (compactName) {
    return `clinic-${organizationId.slice(0, 8).toLowerCase()}`;
  }

  return "clinic-profile";
}

export default async function ClinicProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) redirect("/setup-organization");

  const clinicSlug = buildClinicSlugPreview(organization.name, organization.id);
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

  return (
    <section className="ui-customer-stack">
      <PageHeader
        title="Clinic Profile"
        description="Public microsite, service menu, staff profile, booking CTA-г энэ хэсгээс удирдах бүтэц рүү шилжинэ."
      />

      <Card padded stack>
        <p style={{ margin: 0 }}>
          Одоогийн clinic slug preview: <code>{clinicSlug || "clinic-profile"}</code>
        </p>
        <p className="ui-text-muted" style={{ margin: 0 }}>
          MVP 1 дээр clinic бүр public page-тэй байж, тэндээсээ appointment захиалга авна.
        </p>
        <p style={{ margin: 0 }}>
          Public preview:{" "}
          <Link href={`/clinics/${clinicSlug || "clinic-profile"}`} className="ui-table__link">
            /clinics/{clinicSlug || "clinic-profile"}
          </Link>
        </p>
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
          <div className="ui-stat-grid">
            <Card padded stack>
              <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                Салбар нэмэх
              </h2>
              <CreateClinicLocationForm />
            </Card>
            <Card padded stack>
              <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                Ажилтан нэмэх
              </h2>
              <CreateStaffMemberForm />
            </Card>
            <Card padded stack>
              <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                Үйлчилгээ нэмэх
              </h2>
              <CreateServiceForm />
            </Card>
            <Card padded stack>
              <h2 className="ui-section-title" style={{ marginTop: 0 }}>
                Availability rule
              </h2>
              <CreateStaffAvailabilityRuleForm staffMembers={staffMembers} locations={locations} />
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
