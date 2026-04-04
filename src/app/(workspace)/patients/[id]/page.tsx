import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PatientFollowUpActions } from "@/components/clinic/patient-follow-up-actions";
import { PatientProfileForm } from "@/components/clinic/patient-profile-form";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import {
  getServices,
  getStaffMembers,
  getPatientDetail,
  isClinicFoundationMissingError,
  type ClinicCheckoutWithRelations
} from "@/modules/clinic/data";
import { getCurrentUserOrganization } from "@/modules/organizations/data";

function getPaymentSummary(checkout: ClinicCheckoutWithRelations) {
  const netPaid = (checkout.payments ?? []).reduce(
    (sum, payment) =>
      sum + (payment.payment_kind === "refund" ? -Number(payment.amount ?? 0) : Number(payment.amount ?? 0)),
    0
  );

  return `${netPaid.toFixed(2)}/${Number(checkout.total).toFixed(2)} ${checkout.currency}`;
}

function formatLifecycleStage(stage: string | null | undefined) {
  switch (stage) {
    case "new_lead":
      return "New lead";
    case "consulted":
      return "Consulted";
    case "active":
      return "Active";
    case "follow_up_due":
      return "Follow-up due";
    case "at_risk":
      return "At risk";
    case "vip":
      return "VIP";
    case "inactive":
      return "Inactive";
    default:
      return stage ?? "Unknown";
  }
}

export default async function PatientDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) redirect("/setup-organization");

  const { id } = await params;

  try {
    const [patient, services, staffMembers] = await Promise.all([
      getPatientDetail(user.id, id),
      getServices(user.id),
      getStaffMembers(user.id)
    ]);
    if (!patient) notFound();
    const patientTags = Array.isArray(patient.tags) ? patient.tags.map(String) : [];
    const preferredService = services.find((service) => service.id === patient.preferred_service_id);
    const preferredProvider = staffMembers.find((staff) => staff.id === patient.preferred_staff_member_id);
    const followUpOwner = staffMembers.find((staff) => staff.id === patient.follow_up_owner_id);

    return (
      <section className="ui-customer-stack">
        <PageHeader
          title={patient.full_name}
          description="Patient CRM detail view. Appointment, treatment, payment, follow-up мэдээллийг нэг timeline дээр төвлөрүүлнэ."
        />

        <p className="ui-text-muted" style={{ margin: 0 }}>
          <Link href="/patients" className="ui-table__link">
            ← Patients руу буцах
          </Link>
        </p>

        <div className="ui-stat-grid">
          <Card padded stack>
            <span className="ui-text-muted">Phone</span>
            <strong style={{ fontSize: "var(--text-xl)" }}>{patient.phone ?? "—"}</strong>
            <p style={{ margin: 0 }}>{patient.email ?? "Email бүртгэгдээгүй"}</p>
          </Card>
          <Card padded stack>
            <span className="ui-text-muted">Last visit</span>
            <strong style={{ fontSize: "var(--text-xl)" }}>
              {patient.last_visit_at ? new Date(patient.last_visit_at).toLocaleDateString("mn-MN") : "—"}
            </strong>
            <p style={{ margin: 0 }}>
              Cancel {patient.cancellation_count} · No-show {patient.no_show_count}
            </p>
          </Card>
          <Card padded stack>
            <span className="ui-text-muted">Timeline</span>
            <strong style={{ fontSize: "var(--text-xl)" }}>
              {patient.appointments.length + patient.treatments.length + patient.checkouts.length}
            </strong>
            <p style={{ margin: 0 }}>Appointment, treatment, payment events</p>
          </Card>
          <Card padded stack>
            <span className="ui-text-muted">Lifecycle</span>
            <strong style={{ fontSize: "var(--text-xl)" }}>{formatLifecycleStage(patient.lifecycle_stage)}</strong>
            <p style={{ margin: 0 }}>Preferred channel: {patient.preferred_contact_channel ?? "phone"}</p>
          </Card>
        </div>

        <div className="ui-stat-grid">
          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Care preferences
            </h2>
            <p style={{ margin: 0 }}>
              Preferred service: <strong>{preferredService?.name ?? "Not set"}</strong>
            </p>
            <p style={{ margin: 0 }}>
              Preferred provider: <strong>{preferredProvider?.full_name ?? "Not set"}</strong>
            </p>
            <p style={{ margin: 0 }}>
              Follow-up owner: <strong>{followUpOwner?.full_name ?? "Not set"}</strong>
            </p>
          </Card>

          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Risk flags
            </h2>
            <p style={{ margin: 0 }}>
              Allergy notes: <strong>{patient.allergy_notes ?? "Not set"}</strong>
            </p>
            <p style={{ margin: 0 }}>
              Contraindications: <strong>{patient.contraindication_flags ?? "Not set"}</strong>
            </p>
          </Card>
        </div>

        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Quick handoff
          </h2>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/schedule" className="ui-table__link">
              Schedule нээх
            </Link>
            <Link href="/checkout" className="ui-table__link">
              POS queue
            </Link>
            <Link href="/billing" className="ui-table__link">
              Billing workspace
            </Link>
          </div>
        </Card>

        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Profile notes
          </h2>
          {patientTags.length > 0 ? (
            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
              {patientTags.map((tag) => (
                <Badge key={tag} variant="info">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="ui-text-muted" style={{ margin: 0 }}>
              Tag хараахан нэмээгүй байна.
            </p>
          )}
          <PatientProfileForm
            patientId={patient.id}
            notes={patient.notes}
            tags={patientTags}
            lifecycleStage={patient.lifecycle_stage}
            allergyNotes={patient.allergy_notes}
            contraindicationFlags={patient.contraindication_flags}
            preferredContactChannel={patient.preferred_contact_channel}
            preferredServiceId={patient.preferred_service_id}
            preferredStaffMemberId={patient.preferred_staff_member_id}
            followUpOwnerId={patient.follow_up_owner_id}
            serviceOptions={services.map((service) => ({ id: service.id, name: service.name }))}
            staffOptions={staffMembers.map((staff) => ({ id: staff.id, full_name: staff.full_name }))}
          />
        </Card>

        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Follow-up summary
          </h2>
          <p style={{ margin: 0 }}>
            Last contacted:{" "}
            <strong>
              {patient.last_contacted_at ? new Date(patient.last_contacted_at).toLocaleString("mn-MN") : "Not yet"}
            </strong>
          </p>
          <p style={{ margin: 0 }}>
            Next follow-up:{" "}
            <strong>
              {patient.next_follow_up_at ? new Date(patient.next_follow_up_at).toLocaleString("mn-MN") : "Not scheduled"}
            </strong>
          </p>
          <PatientFollowUpActions
            patientId={patient.id}
            currentLifecycleStage={patient.lifecycle_stage}
            currentOwnerId={patient.follow_up_owner_id}
            staffOptions={staffMembers.map((staff) => ({ id: staff.id, full_name: staff.full_name }))}
          />
          {patient.followUpItems.length === 0 ? (
            <p style={{ margin: 0 }}>Treatment record дээр follow-up plan хараахан бүртгэгдээгүй байна.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
              {patient.followUpItems.map((item, index) => (
                <li key={`${patient.id}-${index}`}>{item}</li>
              ))}
            </ul>
          )}
        </Card>

        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Notification history
          </h2>
          {patient.notifications.length === 0 ? (
            <p style={{ margin: 0 }}>Reminder эсвэл follow-up delivery хараахан бүртгэгдээгүй байна.</p>
          ) : (
            <div style={{ display: "grid", gap: "var(--space-3)" }}>
              {patient.notifications.map((notification) => (
                <div key={notification.id} className="ui-card ui-card--padded ui-card--stack">
                  <strong>
                    {(notification.engagement_job?.job_type ?? "notification").replaceAll("_", " ")}
                  </strong>
                  <span className="ui-text-muted">
                    {notification.channel} · {notification.provider} · {notification.status}
                  </span>
                  <span className="ui-text-muted">
                    {new Date(notification.attempted_at).toLocaleString("mn-MN")}
                    {notification.recipient ? ` · ${notification.recipient}` : ""}
                  </span>
                  {notification.subject ? <span className="ui-text-muted">{notification.subject}</span> : null}
                  {notification.body_preview ? (
                    <span className="ui-text-muted">{notification.body_preview}</span>
                  ) : null}
                  {notification.error_message ? (
                    <span className="ui-text-warning-emphasis">{notification.error_message}</span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Timeline
          </h2>
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            {patient.appointments.map((appointment) => (
              <div key={`appt-${appointment.id}`} className="ui-card ui-card--padded ui-card--stack">
                <strong>Appointment · {appointment.service?.name ?? appointment.service_id}</strong>
                <span className="ui-text-muted">
                  {new Date(appointment.scheduled_start).toLocaleString("mn-MN")} · {appointment.status}
                  {appointment.staff_member?.full_name ? ` · ${appointment.staff_member.full_name}` : ""}
                  {appointment.location?.name ? ` · ${appointment.location.name}` : ""}
                </span>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <Link href="/schedule" className="ui-table__link">
                    Schedule нээх
                  </Link>
                  <Link href="/checkout" className="ui-table__link">
                    POS queue
                  </Link>
                </div>
              </div>
            ))}

            {patient.treatments.map((treatment) => (
              <div key={`tx-${treatment.id}`} className="ui-card ui-card--padded ui-card--stack">
                <strong>Treatment · {treatment.service?.name ?? treatment.service_id}</strong>
                <span className="ui-text-muted">
                  {treatment.appointment?.scheduled_start
                    ? new Date(treatment.appointment.scheduled_start).toLocaleString("mn-MN")
                    : "Visit time unknown"}
                  {treatment.consent_confirmed ? " · consent" : ""}
                </span>
                {treatment.consent_artifact_url ? (
                  <span className="ui-text-muted">Consent artifact: {treatment.consent_artifact_url}</span>
                ) : null}
                {treatment.follow_up_plan ? <span className="ui-text-muted">{treatment.follow_up_plan}</span> : null}
                {treatment.follow_up_outcome ? (
                  <span className="ui-text-muted">Outcome: {treatment.follow_up_outcome}</span>
                ) : null}
                {treatment.complication_notes ? (
                  <span className="ui-text-warning-emphasis">Complication: {treatment.complication_notes}</span>
                ) : null}
                {treatment.before_photo_url || treatment.after_photo_url ? (
                  <span className="ui-text-muted">
                    Evidence:
                    {treatment.before_photo_url ? " before" : ""}
                    {treatment.after_photo_url ? " / after" : ""}
                  </span>
                ) : null}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <Link href="/treatments" className="ui-table__link">
                    Treatment module
                  </Link>
                  <Link href="/checkout" className="ui-table__link">
                    POS queue
                  </Link>
                </div>
              </div>
            ))}

            {patient.checkouts.map((checkout) => (
              <div key={`co-${checkout.id}`} className="ui-card ui-card--padded ui-card--stack">
                <strong>Payment · {getPaymentSummary(checkout)}</strong>
                <span className="ui-text-muted">
                  {checkout.status}/{checkout.payment_status}
                  {checkout.appointment?.scheduled_start
                    ? ` · ${new Date(checkout.appointment.scheduled_start).toLocaleString("mn-MN")}`
                    : ""}
                </span>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <Link href={`/checkout?checkoutId=${checkout.id}`} className="ui-table__link">
                    POS дээр нээх
                  </Link>
                  <Link href={`/billing#checkout-${checkout.id}`} className="ui-table__link">
                    Billing дээр нээх
                  </Link>
                  <Link href="/schedule" className="ui-table__link">
                    Schedule
                  </Link>
                </div>
              </div>
            ))}

            {patient.notifications.map((notification) => (
              <div key={`notification-${notification.id}`} className="ui-card ui-card--padded ui-card--stack">
                <strong>
                  Notification · {(notification.engagement_job?.job_type ?? notification.channel).replaceAll("_", " ")}
                </strong>
                <span className="ui-text-muted">
                  {new Date(notification.attempted_at).toLocaleString("mn-MN")} · {notification.status}
                  {notification.recipient ? ` · ${notification.recipient}` : ""}
                </span>
                <span className="ui-text-muted">
                  {notification.channel} · {notification.provider}
                </span>
                {notification.body_preview ? (
                  <span className="ui-text-muted">{notification.body_preview}</span>
                ) : null}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <Link href="/schedule" className="ui-table__link">
                    Schedule нээх
                  </Link>
                  <Link href="/dashboard" className="ui-table__link">
                    Dashboard queue
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    );
  } catch (error) {
    if (isClinicFoundationMissingError(error)) {
      return (
        <section className="ui-customer-stack">
          <PageHeader title="Patient detail" description="Patient detail view хараахан бэлэн болоогүй байна." />
          <Alert variant="warning">
            Patient CRM migration-уудыг apply хийсний дараа энэ дэлгэц patient timeline-аа харуулна.
          </Alert>
        </section>
      );
    }

    throw error;
  }
}
