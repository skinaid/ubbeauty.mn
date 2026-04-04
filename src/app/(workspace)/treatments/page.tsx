import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateCheckoutDraftButton } from "@/components/clinic/create-checkout-draft-button";
import { TreatmentRecordForm } from "@/components/clinic/treatment-record-form";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
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

  const consentCompletedCount = recentRecords.filter((record) => record.consent_confirmed).length;
  const evidenceCompletedCount = recentRecords.filter(
    (record) => Boolean(record.before_photo_url || record.after_photo_url || record.before_after_asset_notes)
  ).length;
  const followUpOutcomeCount = recentRecords.filter((record) => Boolean(record.follow_up_outcome?.trim())).length;

  const complianceTone = (record: TreatmentRecordWithRelations) => {
    const hasConsent = record.consent_confirmed || Boolean(record.consent_artifact_url);
    const hasEvidence = Boolean(record.before_photo_url || record.after_photo_url || record.before_after_asset_notes);
    const hasOutcome = Boolean(record.follow_up_outcome?.trim());

    if (hasConsent && hasEvidence && hasOutcome) return "success" as const;
    if (hasConsent || hasEvidence || hasOutcome) return "warning" as const;
    return "danger" as const;
  };

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
        <div className="ui-stat-grid">
          <Card padded stack>
            <span className="ui-text-muted">Consent captured</span>
            <strong style={{ fontSize: "var(--text-2xl)" }}>{consentCompletedCount}</strong>
            <p style={{ margin: 0 }}>Recent records with consent confirmation</p>
          </Card>
          <Card padded stack>
            <span className="ui-text-muted">Evidence captured</span>
            <strong style={{ fontSize: "var(--text-2xl)" }}>{evidenceCompletedCount}</strong>
            <p style={{ margin: 0 }}>Before / after notes or references</p>
          </Card>
          <Card padded stack>
            <span className="ui-text-muted">Follow-up outcomes</span>
            <strong style={{ fontSize: "var(--text-2xl)" }}>{followUpOutcomeCount}</strong>
            <p style={{ margin: 0 }}>Outcome status recorded after treatment</p>
          </Card>
        </div>
      ) : null}

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
                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <Link href={`/patients/${appointment.patient_id}`} className="ui-table__link">
                          Patient CRM
                        </Link>
                        <Link href="/schedule" className="ui-table__link">
                          Schedule
                        </Link>
                        <Link href="/checkout" className="ui-table__link">
                          POS queue
                        </Link>
                      </div>
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
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
                {recentRecords.map((record) => (
                  <li key={record.id} className="ui-card ui-card--padded ui-card--stack">
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <strong>{record.patient?.full_name ?? "Patient"}</strong>
                      <Badge variant={complianceTone(record)}>
                        {complianceTone(record) === "success"
                          ? "Compliance OK"
                          : complianceTone(record) === "warning"
                            ? "Partial compliance"
                            : "Needs completion"}
                      </Badge>
                    </div>
                    <span className="ui-text-muted">
                      {record.service?.name ?? record.service_id}
                      {record.appointment?.scheduled_start
                        ? ` · ${new Date(record.appointment.scheduled_start).toLocaleDateString("mn-MN")}`
                        : ""}
                      {record.consent_confirmed ? " · consent confirmed" : ""}
                    </span>
                    {record.consent_artifact_url ? (
                      <span className="ui-text-muted">Consent artifact: {record.consent_artifact_url}</span>
                    ) : null}
                    {record.before_photo_url || record.after_photo_url ? (
                      <span className="ui-text-muted">
                        Evidence:
                        {record.before_photo_url ? " before" : ""}
                        {record.after_photo_url ? " / after" : ""}
                      </span>
                    ) : null}
                    {record.before_after_asset_notes ? (
                      <span className="ui-text-muted">{record.before_after_asset_notes}</span>
                    ) : null}
                    {record.follow_up_outcome ? (
                      <span className="ui-text-muted">Outcome: {record.follow_up_outcome}</span>
                    ) : null}
                    {record.complication_notes ? (
                      <span className="ui-text-warning-emphasis">
                        Complication: {record.complication_notes}
                      </span>
                    ) : null}
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      <Link href={`/patients/${record.patient_id}`} className="ui-table__link">
                        Patient CRM
                      </Link>
                      <Link href="/treatments" className="ui-table__link">
                        Treatment module
                      </Link>
                      <Link href="/checkout" className="ui-table__link">
                        POS queue
                      </Link>
                    </div>
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
                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <Link href={`/patients/${appointment.patient_id}`} className="ui-table__link">
                          Patient CRM
                        </Link>
                        <Link href="/schedule" className="ui-table__link">
                          Schedule
                        </Link>
                        <Link href="/checkout" className="ui-table__link">
                          POS queue
                        </Link>
                      </div>
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
