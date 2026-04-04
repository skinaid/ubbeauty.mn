import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PatientProfileForm } from "@/components/clinic/patient-profile-form";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import {
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
    const patient = await getPatientDetail(user.id, id);
    if (!patient) notFound();
    const patientTags = Array.isArray(patient.tags) ? patient.tags.map(String) : [];

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
          />
        </Card>

        <Card padded stack>
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Follow-up summary
          </h2>
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
                {treatment.follow_up_plan ? <span className="ui-text-muted">{treatment.follow_up_plan}</span> : null}
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
