"use client";

import { useEffect, useState } from "react";
import type { PatientDetail } from "@/modules/clinic/data";

const LIFECYCLE_BADGE_STYLES: Record<string, { background: string; color: string }> = {
  new_lead:      { background: "#eff6ff", color: "#1d4ed8" },
  consulted:     { background: "#f0fdf4", color: "#15803d" },
  active:        { background: "#ecfdf5", color: "#065f46" },
  follow_up_due: { background: "#fef9c3", color: "#854d0e" },
  at_risk:       { background: "#fef2f2", color: "#991b1b" },
  vip:           { background: "#faf5ff", color: "#7e22ce" },
  inactive:      { background: "#f9fafb", color: "#6b7280" },
};

function LifecycleBadge({ stage }: { stage: string | null | undefined }) {
  const label = stage
    ? stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Unknown";
  const styles = (stage && LIFECYCLE_BADGE_STYLES[stage]) ?? { background: "#f3f4f6", color: "#6b7280" };
  return (
    <span style={{
      ...styles,
      fontSize: "0.7rem",
      fontWeight: 600,
      padding: "0.15rem 0.5rem",
      borderRadius: "999px",
      display: "inline-block",
    }}>
      {label}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: "0.75rem",
      padding: "0.875rem 1rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
    }}>
      <span style={{ fontSize: "0.72rem", color: "#9ca3af", fontWeight: 500 }}>{label}</span>
      <strong style={{ fontSize: "1.1rem", color: "#111827", lineHeight: 1.2 }}>{value}</strong>
      {sub && <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{sub}</span>}
    </div>
  );
}

export function PatientDetailPanel({
  patientId,
  onBack,
}: {
  patientId: string;
  onBack: () => void;
}) {
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPatient(null);

    fetch("/api/patients/" + patientId)
      .then(async (res) => {
        const json = (await res.json()) as { patient?: PatientDetail; error?: string };
        if (!res.ok || json.error) {
          setError(json.error ?? "Мэдээлэл татаж чадсангүй.");
        } else if (json.patient) {
          setPatient(json.patient);
        } else {
          setError("Үйлчлүүлэгч олдсонгүй.");
        }
      })
      .catch(() => setError("Сүлжээний алдаа. Дахин оролдоно уу."))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: "0.875rem" }}>
        Уншиж байна...
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            fontSize: "0.875rem", color: "#6b7280", padding: 0, textAlign: "left",
          }}
        >
          ← Буцах
        </button>
        <p style={{ color: "#ef4444", fontSize: "0.875rem", margin: 0 }}>{error ?? "Алдаа гарлаа."}</p>
      </div>
    );
  }

  const totalEvents = patient.appointments.length + patient.treatments.length + patient.checkouts.length;

  return (
    <div style={{ overflowY: "auto", height: "100%", background: "#fafafa" }}>
      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* Back + name */}
        <div>
          <button
            onClick={onBack}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontSize: "0.8rem", color: "#6b7280", padding: 0, marginBottom: "0.6rem",
              display: "inline-flex", alignItems: "center", gap: "0.25rem",
            }}
          >
            ← Буцах
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#111827" }}>
              {patient.full_name}
            </h2>
            <LifecycleBadge stage={patient.lifecycle_stage} />
          </div>
        </div>

        {/* Stat cards — 2-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
          <StatCard
            label="Утас"
            value={patient.phone ?? "—"}
            sub={patient.email ?? undefined}
          />
          <StatCard
            label="Сүүлийн айлчлал"
            value={patient.last_visit_at ? new Date(patient.last_visit_at).toLocaleDateString("mn-MN") : "—"}
            sub={`Cancel ${patient.cancellation_count} · No-show ${patient.no_show_count}`}
          />
          <StatCard
            label="Lifecycle"
            value={patient.lifecycle_stage
              ? patient.lifecycle_stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
              : "—"}
            sub={`Channel: ${patient.preferred_contact_channel ?? "phone"}`}
          />
          <StatCard
            label="Нийт үйл явдал"
            value={String(totalEvents)}
            sub="Appt + treatment + payment"
          />
        </div>

        {/* Care preferences */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "0.75rem",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}>
          <h3 style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Care Preferences
          </h3>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151" }}>
            Preferred service:{" "}
            <strong>{patient.preferred_service_id ?? "Not set"}</strong>
          </p>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151" }}>
            Preferred provider:{" "}
            <strong>{patient.preferred_staff_member_id ?? "Not set"}</strong>
          </p>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151" }}>
            Follow-up owner:{" "}
            <strong>{patient.follow_up_owner_id ?? "Not set"}</strong>
          </p>
        </div>

        {/* Risk flags */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "0.75rem",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}>
          <h3 style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Risk Flags
          </h3>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151" }}>
            Allergy notes: <strong>{patient.allergy_notes ?? "Not set"}</strong>
          </p>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151" }}>
            Contraindications: <strong>{patient.contraindication_flags ?? "Not set"}</strong>
          </p>
        </div>

        {/* Timeline */}
        {totalEvents > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            <h3 style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Timeline
            </h3>

            {patient.appointments.map((appt) => (
              <div key={`appt-${appt.id}`} style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "0.65rem",
                padding: "0.75rem 1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.2rem",
              }}>
                <strong style={{ fontSize: "0.875rem", color: "#111827" }}>
                  Appointment · {appt.service?.name ?? appt.service_id ?? "—"}
                </strong>
                <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  {new Date(appt.scheduled_start).toLocaleString("mn-MN")} · {appt.status}
                  {appt.staff_member?.full_name ? ` · ${appt.staff_member.full_name}` : ""}
                  {appt.location?.name ? ` · ${appt.location.name}` : ""}
                </span>
              </div>
            ))}

            {patient.treatments.map((tx) => (
              <div key={`tx-${tx.id}`} style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "0.65rem",
                padding: "0.75rem 1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.2rem",
              }}>
                <strong style={{ fontSize: "0.875rem", color: "#111827" }}>
                  Treatment · {tx.service?.name ?? tx.service_id ?? "—"}
                </strong>
                <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  {tx.appointment?.scheduled_start
                    ? new Date(tx.appointment.scheduled_start).toLocaleString("mn-MN")
                    : "Visit time unknown"}
                  {tx.consent_confirmed ? " · consent ✓" : ""}
                </span>
                {tx.follow_up_plan && (
                  <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{tx.follow_up_plan}</span>
                )}
              </div>
            ))}

            {patient.checkouts.map((co) => {
              const netPaid = (co.payments ?? []).reduce(
                (sum, p) => sum + (p.payment_kind === "refund" ? -Number(p.amount ?? 0) : Number(p.amount ?? 0)),
                0
              );
              const total = Number(co.total ?? 0);
              return (
                <div key={`co-${co.id}`} style={{
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.65rem",
                  padding: "0.75rem 1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                }}>
                  <strong style={{ fontSize: "0.875rem", color: "#111827" }}>
                    Payment · {netPaid.toFixed(2)}/{total.toFixed(2)} {co.currency}
                  </strong>
                  <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    {co.status} / {co.payment_status}
                    {co.appointment?.scheduled_start
                      ? ` · ${new Date(co.appointment.scheduled_start).toLocaleString("mn-MN")}`
                      : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Follow-up summary */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "0.75rem",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}>
          <h3 style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Follow-up Summary
          </h3>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151" }}>
            Last contacted:{" "}
            <strong>
              {patient.last_contacted_at
                ? new Date(patient.last_contacted_at).toLocaleString("mn-MN")
                : "Not yet"}
            </strong>
          </p>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151" }}>
            Next follow-up:{" "}
            <strong>
              {patient.next_follow_up_at
                ? new Date(patient.next_follow_up_at).toLocaleString("mn-MN")
                : "Not scheduled"}
            </strong>
          </p>
          {patient.followUpItems.length > 0 && (
            <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              {patient.followUpItems.map((item, i) => (
                <li key={i} style={{ fontSize: "0.8rem", color: "#6b7280" }}>{item}</li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
