import Link from "next/link";
import { redirect } from "next/navigation";
import { PatientFollowUpActions } from "@/components/clinic/patient-follow-up-actions";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import {
  getPatientFollowUpQueue,
  getStaffMembers,
  getPatientTimelineSummaries,
  isClinicFoundationMissingError
} from "@/modules/clinic/data";
import type {
  AppointmentWithRelations,
  ClinicCheckoutWithRelations,
  PatientFollowUpQueueItem,
  PatientTimelineSummary,
  TreatmentRecordWithRelations
} from "@/modules/clinic/data";
import { getCurrentUserOrganization } from "@/modules/organizations/data";

const CRM_BLOCKS = [
  "Patient profile ба холбоо барих мэдээлэл",
  "Visit history, no-show/cancel tracking",
  "Consultation notes ба contraindication flags",
  "Follow-up reminder ба preferred treatments"
];

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

export default async function PatientsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) redirect("/setup-organization");

  let patients: PatientTimelineSummary[] = [];
  let followUpQueue: PatientFollowUpQueueItem[] = [];
  let staffOptions: Array<{ id: string; full_name: string }> = [];
  let migrationMissing = false;

  try {
    const [patientRows, followUpRows, staffMembers] = await Promise.all([
      getPatientTimelineSummaries(user.id, 20),
      getPatientFollowUpQueue(user.id, 12),
      getStaffMembers(user.id)
    ]);
    patients = patientRows;
    followUpQueue = followUpRows;
    staffOptions = staffMembers.map((staff) => ({ id: staff.id, full_name: staff.full_name }));
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
        title="Patients"
        description="Patient CRM нь clinic-ийн бүх дахин ирэлт, үйлчилгээний түүх, follow-up ажиллагааны үндсэн цөм байна."
      />

      {migrationMissing ? (
        <Alert variant="warning">
          Patient CRM schema хараахан apply хийгдээгүй байна. Migration хийгдсэний дараа patient list энд амилна.
        </Alert>
      ) : null}

      <Card padded stack>
        <h2 className="ui-section-title" style={{ marginTop: 0 }}>
          CRM MVP scope
        </h2>
        <p style={{ margin: 0 }}>
          <strong>{organization.name}</strong> patient бүрийг нэг master record-оор удирдаж, appointment, treatment,
          payment урсгалтай холбохоор төлөвлөж байна.
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
          {CRM_BLOCKS.map((block) => (
            <li key={block}>{block}</li>
          ))}
        </ul>
      </Card>

      {!migrationMissing ? (
        <Card padded stack id="follow-up-queue">
          <h2 className="ui-section-title" style={{ marginTop: 0 }}>
            Follow-up queue
          </h2>
          {followUpQueue.length === 0 ? (
            <p style={{ margin: 0 }}>Due follow-up patient одоогоор алга байна.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
              {followUpQueue.map((patient) => (
                <li key={patient.id} className="ui-card ui-card--padded ui-card--stack">
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <strong>{patient.full_name}</strong>
                    <Badge variant={patient.priority === "high" ? "warning" : "info"}>{patient.priority}</Badge>
                    <Badge variant="info">{formatLifecycleStage(patient.lifecycle_stage)}</Badge>
                  </div>
                  <span className="ui-text-muted">{patient.dueReason}</span>
                  <span className="ui-text-muted">
                    {patient.followUpOwnerName ? `Owner: ${patient.followUpOwnerName} · ` : ""}
                    {patient.suggestedAction}
                  </span>
                  <span className="ui-text-muted">
                    {patient.preferredProviderName ? `Preferred provider: ${patient.preferredProviderName} · ` : ""}
                    {patient.preferredServiceName ? `Preferred service: ${patient.preferredServiceName}` : "Preferred service not set"}
                  </span>
                  <PatientFollowUpActions
                    patientId={patient.id}
                    currentLifecycleStage={patient.lifecycle_stage}
                    currentOwnerId={patient.follow_up_owner_id}
                    staffOptions={staffOptions}
                  />
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <Link href={`/patients/${patient.id}`} className="ui-table__link">
                      Patient detail нээх
                    </Link>
                    <Link href="/notifications" className="ui-table__link">
                      Notification ops
                    </Link>
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
            Recent patients
          </h2>
          {patients.length === 0 ? (
            <p style={{ margin: 0 }}>
              Одоогоор patient бүртгэл үүсээгүй байна. Public booking эсвэл front desk intake урсгалаар patient record
              автоматаар нэмэгдэх суурь бэлэн болсон.
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
              {patients.map((patient) => (
                <li key={patient.id} style={{ marginBottom: "var(--space-3)" }}>
                  <strong>{patient.full_name}</strong>
                  <span style={{ marginLeft: "0.5rem" }}>
                    <Badge variant="info">{formatLifecycleStage(patient.lifecycle_stage)}</Badge>
                  </span>
                  {patient.phone ? ` · ${patient.phone}` : ""}
                  {patient.last_visit_at ? ` · last visit ${new Date(patient.last_visit_at).toLocaleDateString("mn-MN")}` : ""}
                  <div style={{ marginTop: "0.35rem" }}>
                    <Link href={`/patients/${patient.id}`} className="ui-table__link">
                      Patient detail нээх
                    </Link>
                  </div>
                  {patient.recentAppointments.length > 0 ? (
                    <div className="ui-text-muted" style={{ marginTop: "0.35rem" }}>
                      Appointments:{" "}
                      {patient.recentAppointments
                        .map((appointment: AppointmentWithRelations) => {
                          const date = new Date(appointment.scheduled_start).toLocaleDateString("mn-MN");
                          const serviceName = appointment.service?.name ?? "Service";
                          return `${date} (${serviceName}, ${appointment.status})`;
                        })
                        .join(" · ")}
                    </div>
                  ) : null}
                  {patient.recentTreatments.length > 0 ? (
                    <div className="ui-text-muted" style={{ marginTop: "0.35rem" }}>
                      Treatments:{" "}
                      {patient.recentTreatments
                        .map((record: TreatmentRecordWithRelations) => {
                          const serviceName = record.service?.name ?? "Treatment";
                          return record.consent_confirmed ? `${serviceName} (consent)` : serviceName;
                        })
                        .join(" · ")}
                    </div>
                  ) : null}
                  {patient.recentCheckouts.length > 0 ? (
                    <div className="ui-text-muted" style={{ marginTop: "0.35rem" }}>
                      Payments:{" "}
                      {patient.recentCheckouts
                        .map((checkout: ClinicCheckoutWithRelations) => {
                          const paidAmount = (checkout.payments ?? []).reduce(
                            (sum, payment) =>
                              sum + (payment.payment_kind === "refund" ? -Number(payment.amount ?? 0) : Number(payment.amount ?? 0)),
                            0
                          );
                          const total = Number(checkout.total ?? 0);
                          const summary =
                            checkout.payment_status === "paid"
                              ? `${paidAmount.toFixed(2)}/${total.toFixed(2)}`
                              : `${paidAmount.toFixed(2)}/${total.toFixed(2)} collecting`;
                          return `${summary} ${checkout.currency}`;
                        })
                        .join(" · ")}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </section>
  );
}
