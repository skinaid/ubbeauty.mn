import { redirect } from "next/navigation";
import { CreateCheckoutDraftButton } from "@/components/clinic/create-checkout-draft-button";
import { TreatmentRecordForm } from "@/components/clinic/treatment-record-form";
import { Alert, Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import {
  type AppointmentWithRelations,
  type TreatmentRecordWithRelations,
  getCompletedAppointmentsForTreatmentQueue,
  getRecentTreatmentRecords,
  isClinicFoundationMissingError
} from "@/modules/clinic/data";
import { getCurrentUserOrganization } from "@/modules/organizations/data";

const TREATMENT_MODULES = [
  {
    title: "Consultation template",
    body: "Арьсны төлөв, goal, risk factor, consent check-уудыг стандартчилна."
  },
  {
    title: "Treatment record",
    body: "Procedure details, machine settings, product usage, provider notes-г visit бүр дээр хадгална."
  },
  {
    title: "Before / after evidence",
    body: "Фото, follow-up note, outcome status-ийг patient history-тэй холбоно."
  }
];

export default async function TreatmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) redirect("/setup-organization");

  let completedAppointments: AppointmentWithRelations[] = [];
  let recentRecords: TreatmentRecordWithRelations[] = [];
  let migrationMissing = false;

  try {
    [completedAppointments, recentRecords] = await Promise.all([
      getCompletedAppointmentsForTreatmentQueue(user.id, 12),
      getRecentTreatmentRecords(user.id, 12)
    ]);
  } catch (error) {
    if (isClinicFoundationMissingError(error)) {
      migrationMissing = true;
    } else {
      throw error;
    }
  }

  return (
    <section className="ui-customer-stack">
      <PageHeader
        title="Treatments"
        description="Treatment management нь full hospital EMR биш; харин medspa workflow-д таарсан structured treatment record байна."
      />

      {migrationMissing ? (
        <Alert variant="warning">
          Treatment schema хараахан apply хийгдээгүй байна. Migration apply хийсний дараа completed appointments энд
          treatment queue болж харагдана.
        </Alert>
      ) : null}

      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        {TREATMENT_MODULES.map((module) => (
          <Card key={module.title} padded stack>
            <h3 style={{ margin: 0, fontSize: "var(--text-lg)" }}>{module.title}</h3>
            <p style={{ margin: 0 }}>{module.body}</p>
          </Card>
        ))}
      </div>

      {!migrationMissing ? (
        <>
          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Treatment queue
            </h2>
            {completedAppointments.length === 0 ? (
              <p style={{ margin: 0 }}>
                Одоогоор treatment note үүсгэх completed appointment алга байна. Appointment-аа `completed` болгоод энд
                SOPA маягийн structured note бөглөнө.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "var(--space-3)" }}>
                {completedAppointments.map((appointment) => (
                  <Card key={appointment.id} padded stack>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <strong>{appointment.patient?.full_name ?? "Patient"}</strong>
                      <span className="ui-text-muted">
                        {appointment.service?.name ?? appointment.service_id} ·{" "}
                        {new Date(appointment.scheduled_start).toLocaleString("mn-MN")}
                      </span>
                      {appointment.staff_member?.full_name ? (
                        <span className="ui-text-muted">Provider: {appointment.staff_member.full_name}</span>
                      ) : null}
                    </div>
                    <TreatmentRecordForm appointmentId={appointment.id} />
                  </Card>
                ))}
              </div>
            )}
          </Card>

          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Recent treatment records
            </h2>
            {recentRecords.length === 0 ? (
              <p style={{ margin: 0 }}>Одоогоор treatment record хадгалагдаагүй байна.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                {recentRecords.map((record) => (
                  <li key={record.id}>
                    <strong>{record.patient?.full_name ?? "Patient"}</strong> ·{" "}
                    {record.service?.name ?? record.service_id}
                    {record.appointment?.scheduled_start
                      ? ` · ${new Date(record.appointment.scheduled_start).toLocaleDateString("mn-MN")}`
                      : ""}
                    {record.consent_confirmed ? " · consent confirmed" : ""}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card padded stack>
            <h2 className="ui-section-title" style={{ marginTop: 0 }}>
              Checkout handoff
            </h2>
            {completedAppointments.length === 0 ? (
              <p style={{ margin: 0 }}>Checkout draft үүсгэх completed appointment алга байна.</p>
            ) : (
              <div style={{ display: "grid", gap: "var(--space-3)" }}>
                {completedAppointments.map((appointment) => (
                  <Card key={`checkout-${appointment.id}`} padded stack>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <strong>{appointment.patient?.full_name ?? "Patient"}</strong>
                      <span className="ui-text-muted">
                        {appointment.service?.name ?? appointment.service_id} ·{" "}
                        {new Date(appointment.scheduled_start).toLocaleString("mn-MN")}
                      </span>
                    </div>
                    <CreateCheckoutDraftButton appointmentId={appointment.id} />
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : null}
    </section>
  );
}
