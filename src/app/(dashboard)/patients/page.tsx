import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import { getPatientTimelineSummaries, isClinicFoundationMissingError } from "@/modules/clinic/data";
import type {
  AppointmentWithRelations,
  ClinicCheckoutWithRelations,
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

export default async function PatientsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) redirect("/setup-organization");

  let patients: PatientTimelineSummary[] = [];
  let migrationMissing = false;

  try {
    patients = await getPatientTimelineSummaries(user.id, 20);
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
