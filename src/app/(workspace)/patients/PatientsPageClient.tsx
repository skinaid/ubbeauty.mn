"use client";

import { useState } from "react";
import { ClinicSplitLayout } from "@/components/ui/clinic-split-layout";
import { PatientDetailPanel } from "@/components/clinic/patient-detail-panel";
import { PatientsChatPanel } from "@/components/clinic/patients-chat-panel";

export type PatientListItem = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  lifecycle_stage: string | null;
  last_visit_at: string | null;
  cancellation_count: number;
  no_show_count: number;
};

const LIFECYCLE_BADGE_STYLES: Record<string, { background: string; color: string }> = {
  new_lead:       { background: "#eff6ff", color: "#1d4ed8" },
  consulted:      { background: "#f0fdf4", color: "#15803d" },
  active:         { background: "#ecfdf5", color: "#065f46" },
  follow_up_due:  { background: "#fef9c3", color: "#854d0e" },
  at_risk:        { background: "#fef2f2", color: "#991b1b" },
  vip:            { background: "#faf5ff", color: "#7e22ce" },
  inactive:       { background: "#f9fafb", color: "#6b7280" },
};

function LifecycleBadge({ stage }: { stage: string | null }) {
  const label = stage
    ? stage.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Unknown";
  const styles = (stage && LIFECYCLE_BADGE_STYLES[stage]) ?? { background: "#f3f4f6", color: "#6b7280" };
  return (
    <span style={{
      ...styles,
      fontSize: "0.7rem",
      fontWeight: 600,
      padding: "0.15rem 0.5rem",
      borderRadius: "999px",
      whiteSpace: "nowrap",
      display: "inline-block",
    }}>
      {label}
    </span>
  );
}

function PatientListView({
  patients,
  onSelect,
}: {
  patients: PatientListItem[];
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(q) ||
      (p.phone ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fafafa" }}>
      {/* Toolbar */}
      <div style={{
        flexShrink: 0,
        padding: "1rem 1.25rem 0.75rem",
        borderBottom: "1px solid #e5e7eb",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
          <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600, color: "#374151" }}>
            Үйлчлүүлэгчид ({patients.length})
          </p>
          {/* TODO: implement "Шинэ үйлчлүүлэгч нэмэх" modal */}
          <button
            disabled
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#9ca3af",
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              padding: "0.3rem 0.75rem",
              cursor: "not-allowed",
            }}
          >
            + Шинэ үйлчлүүлэгч нэмэх
          </button>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Нэр эсвэл утасны дугаараар хайх..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            padding: "0.5rem 0.75rem",
            fontSize: "0.875rem",
            outline: "none",
            background: "#f9fafb",
            color: "#111827",
          }}
        />
      </div>

      {/* List */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: "2rem 1.25rem",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: "0.875rem",
          }}>
            {search ? "Хайлтад тохирох үйлчлүүлэгч олдсонгүй." : "Үйлчлүүлэгч бүртгэл алга байна."}
          </div>
        ) : (
          filtered.map((patient) => (
            <button
              key={patient.id}
              onClick={() => onSelect(patient.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                width: "100%",
                padding: "0.85rem 1.25rem",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid #f3f4f6",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {/* Avatar */}
              <div style={{
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #818cf8, #a855f7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.875rem",
                flexShrink: 0,
              }}>
                {patient.full_name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#111827" }}>
                    {patient.full_name}
                  </span>
                  <LifecycleBadge stage={patient.lifecycle_stage} />
                </div>
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                  {patient.phone && (
                    <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{patient.phone}</span>
                  )}
                  {patient.last_visit_at && (
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                      {new Date(patient.last_visit_at).toLocaleDateString("mn-MN")}
                    </span>
                  )}
                </div>
              </div>

              <span style={{ color: "#d1d5db", fontSize: "0.875rem", flexShrink: 0 }}>›</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function PatientsPageClient({
  initialPatients,
  orgId,
}: {
  initialPatients: PatientListItem[];
  orgId: string;
}) {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const leftTabLabel = selectedPatientId
    ? "👤 Дэлгэрэнгүй"
    : `👤 Жагсаалт (${initialPatients.length})`;

  const leftPanel = selectedPatientId ? (
    <PatientDetailPanel
      patientId={selectedPatientId}
      onBack={() => setSelectedPatientId(null)}
    />
  ) : (
    <PatientListView patients={initialPatients} onSelect={setSelectedPatientId} />
  );

  const rightPanel = <PatientsChatPanel orgId={orgId} />;

  return (
    <ClinicSplitLayout
      backHref="/clinic"
      title="Үйлчлүүлэгчид"
      subtitle="Харилцагчийн мэдээлэл, түүх, follow-up"
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      leftTabLabel={leftTabLabel}
      rightTabLabel="🤖 AI Туслах"
    />
  );
}
