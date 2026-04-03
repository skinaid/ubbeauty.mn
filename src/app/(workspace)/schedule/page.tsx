import Link from "next/link";
import { redirect } from "next/navigation";
import { AppointmentStatusActions } from "@/components/clinic/appointment-status-actions";
import { CreateCheckoutDraftButton } from "@/components/clinic/create-checkout-draft-button";
import { CreateAdminAppointmentForm } from "@/components/clinic/create-admin-appointment-form";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import {
  type AppointmentCheckoutSummary,
  type AppointmentWithRelations,
  getAppointmentCheckoutSummaries,
  getClinicLocations,
  getRecentAppointmentsForDesk,
  getServices,
  getStaffMembers,
  getUpcomingAppointments,
  isClinicFoundationMissingError
} from "@/modules/clinic/data";
import type { ClinicLocationRow, ServiceRow, StaffMemberRow } from "@/modules/clinic/types";
import type { AppointmentStatus } from "@/modules/clinic/types";
import { getCurrentUserOrganization } from "@/modules/organizations/data";

const APPOINTMENT_STATUSES = [
  {
    label: "Booked",
    description: "Public booking эсвэл front desk-ээс орж ирсэн шинэ цагууд эндээс эхэлнэ."
  },
  {
    label: "Confirmed",
    description: "Reminder илгээж, эмч, өрөө, treatment prep-ийг баталгаажуулна."
  },
  {
    label: "Arrived / In progress",
    description: "Check-in хийсний дараа treatment note болон POS draft-тэй холбогдоно."
  },
  {
    label: "Completed / No-show",
    description: "Visit outcome, follow-up, төлбөрийн эцсийн төлөвийг хаана."
  }
];

const NEXT_STATUS_MAP: Record<AppointmentStatus, AppointmentStatus[]> = {
  booked: ["confirmed", "canceled", "no_show"],
  confirmed: ["arrived", "canceled", "no_show"],
  arrived: ["in_progress", "completed", "canceled"],
  in_progress: ["completed", "canceled"],
  completed: [],
  canceled: [],
  no_show: []
};

function getCheckoutBadgeVariant(paymentStatus?: string) {
  switch (paymentStatus) {
    case "paid":
      return "success" as const;
    case "partial":
      return "warning" as const;
    default:
      return "info" as const;
  }
}

export default async function AppointmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) redirect("/setup-organization");

  let appointments: AppointmentWithRelations[] = [];
  let recentAppointments: AppointmentWithRelations[] = [];
  let locations: ClinicLocationRow[] = [];
  let services: ServiceRow[] = [];
  let staffMembers: StaffMemberRow[] = [];
  let checkoutSummaries: AppointmentCheckoutSummary[] = [];
  let migrationMissing = false;

  try {
    [appointments, recentAppointments, locations, services, staffMembers] = await Promise.all([
      getUpcomingAppointments(user.id, 20),
      getRecentAppointmentsForDesk(user.id, 30),
      getClinicLocations(user.id),
      getServices(user.id),
      getStaffMembers(user.id)
    ]);
    checkoutSummaries = await getAppointmentCheckoutSummaries(
      user.id,
      Array.from(new Set([...appointments, ...recentAppointments].map((appointment) => appointment.id)))
    );
  } catch (error) {
    if (isClinicFoundationMissingError(error)) {
      migrationMissing = true;
    } else {
      throw error;
    }
  }

  const checkoutByAppointmentId = new Map(checkoutSummaries.map((checkout) => [checkout.appointment_id, checkout]));
  const handoffAppointments = recentAppointments.filter((appointment) =>
    ["completed", "in_progress", "arrived"].includes(appointment.status)
  );

  return (
    <section className="ui-customer-stack">
      <PageHeader
        title="Appointments"
        description="MVP 1-ийн scheduling module. Online booking, front-desk confirmation, treatment room coordination нэг урсгалд орно."
      />

      {migrationMissing ? (
        <Alert variant="warning">
          Appointment module schema хараахан apply хийгдээгүй байна. Clinic migration-аа ажиллуулсны дараа энд live
          calendar data харагдана.
        </Alert>
      ) : null}

      <Card padded stack>
        <h2 className="ui-section-title" style={{ marginTop: 0 }}>
          Одоогийн хэрэгжилтийн зорилго
        </h2>
        <p style={{ margin: 0 }}>
          <strong>{organization.name}</strong>-ийн appointment workflow-ийг үйлчилгээ, ажилтан, үргэлжлэх хугацаа,
          buffer time, статусын шилжилт дээр суурилж барина.
        </p>
        <p className="ui-text-muted" style={{ margin: 0 }}>
          Дараагийн schema pass дээр `services`, `staff`, `appointments`, `availability` хүснэгтүүд орж ирнэ.
        </p>
      </Card>

      {!migrationMissing ? (
        <div className="ui-stat-grid">
          <Card padded stack>
            <span className="ui-text-muted">Services ready</span>
            <strong style={{ fontSize: "var(--text-2xl)" }}>{services.length}</strong>
            <p style={{ margin: 0 }}>Bookable treatment menu</p>
          </Card>
          <Card padded stack>
            <span className="ui-text-muted">Providers / staff</span>
            <strong style={{ fontSize: "var(--text-2xl)" }}>{staffMembers.length}</strong>
            <p style={{ margin: 0 }}>Scheduling хийх боломжтой баг</p>
          </Card>
          <Card padded stack>
            <span className="ui-text-muted">Locations</span>
            <strong style={{ fontSize: "var(--text-2xl)" }}>{locations.length}</strong>
            <p style={{ margin: 0 }}>Branch / room routing foundation</p>
          </Card>
        </div>
      ) : null}

      {!migrationMissing ? (
        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Front desk appointment create
          </h2>
          {services.length === 0 ? (
            <p style={{ margin: 0 }}>
              Эхлээд <Link href="/clinic">clinic setup</Link> хэсгээс service үүсгэнэ үү.
            </p>
          ) : (
            <CreateAdminAppointmentForm
              services={services}
              staffMembers={staffMembers}
              locations={locations}
            />
          )}
        </Card>
      ) : null}

      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        {APPOINTMENT_STATUSES.map((item) => (
          <Card key={item.label} padded stack>
            <h3 style={{ margin: 0, fontSize: "var(--text-lg)" }}>{item.label}</h3>
            <p style={{ margin: 0 }}>{item.description}</p>
          </Card>
        ))}
      </div>

      {!migrationMissing ? (
        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Upcoming appointments
          </h2>
          {appointments.length === 0 ? (
            <p style={{ margin: 0 }}>
              Одоогоор appointment үүсээгүй байна. Эхлээд <Link href="/clinic">service, staff, location</Link> setup-аа
              хийсний дараа public booking эсвэл admin booking урсгал руу орно.
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
              {appointments.map((appointment) => (
                <li key={appointment.id} className="ui-card ui-card--padded ui-card--stack">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <strong>{appointment.patient?.full_name ?? "Patient"}</strong>
                      <span className="ui-text-muted">
                        {appointment.service?.name ?? appointment.service_id} ·{" "}
                        {new Date(appointment.scheduled_start).toLocaleString("mn-MN")}
                      </span>
                      <span className="ui-text-muted">
                        Status: {appointment.status}
                        {appointment.staff_member?.full_name ? ` · ${appointment.staff_member.full_name}` : ""}
                        {appointment.location?.name ? ` · ${appointment.location.name}` : ""}
                      </span>
                      {checkoutByAppointmentId.get(appointment.id) ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                          <Badge
                            variant={getCheckoutBadgeVariant(checkoutByAppointmentId.get(appointment.id)?.payment_status)}
                          >
                            Checkout {checkoutByAppointmentId.get(appointment.id)?.payment_status}
                          </Badge>
                          <Link
                            href={`/billing?checkoutStatus=collecting#checkout-${checkoutByAppointmentId.get(appointment.id)?.id}`}
                            className="ui-table__link"
                          >
                            Billing нээх
                          </Link>
                        </span>
                      ) : null}
                      {appointment.patient?.phone ? (
                        <span className="ui-text-muted">Patient phone: {appointment.patient.phone}</span>
                      ) : null}
                    </div>
                    {NEXT_STATUS_MAP[appointment.status as AppointmentStatus].length > 0 ? (
                      <AppointmentStatusActions
                        appointmentId={appointment.id}
                        nextStatuses={NEXT_STATUS_MAP[appointment.status as AppointmentStatus]}
                      />
                    ) : (
                      <span className="ui-text-muted">Final status</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {!migrationMissing ? (
        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Billing handoff
          </h2>
          {handoffAppointments.length === 0 ? (
            <p style={{ margin: 0 }}>
              Completed эсвэл check-in болсон visit одоогоор алга байна.
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
              {handoffAppointments.slice(0, 10).map((appointment) => {
                const checkout = checkoutByAppointmentId.get(appointment.id);

                return (
                  <li key={appointment.id} className="ui-card ui-card--padded ui-card--stack">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                      <div style={{ display: "grid", gap: "0.35rem" }}>
                        <strong>{appointment.patient?.full_name ?? "Patient"}</strong>
                        <span className="ui-text-muted">
                          {appointment.service?.name ?? appointment.service_id} ·{" "}
                          {new Date(appointment.scheduled_start).toLocaleString("mn-MN")}
                        </span>
                        <span className="ui-text-muted">
                          Visit status: {appointment.status}
                          {checkout ? ` · checkout ${checkout.payment_status}` : " · checkout үүсээгүй"}
                        </span>
                      </div>

                      {checkout ? (
                        <div style={{ display: "grid", gap: "0.45rem", justifyItems: "start" }}>
                          <Badge variant={getCheckoutBadgeVariant(checkout.payment_status)}>
                            {checkout.status} / {checkout.payment_status}
                          </Badge>
                          <Link
                            href={`/billing?checkoutStatus=${checkout.payment_status === "paid" ? "paid" : "collecting"}#checkout-${checkout.id}`}
                            className="ui-table__link"
                          >
                            Checkout нээх
                          </Link>
                        </div>
                      ) : appointment.status === "completed" ? (
                        <CreateCheckoutDraftButton appointmentId={appointment.id} />
                      ) : (
                        <span className="ui-text-muted">Checkout нь completed дээр идэвхжинэ</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}

      <p className="ui-text-muted" style={{ margin: 0 }}>
        Public booking experience-г урьдчилж харах бол <Link href="/clinics">clinic directory</Link> руу орно уу.
      </p>
    </section>
  );
}
