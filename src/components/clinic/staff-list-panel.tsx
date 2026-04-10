"use client";
import { useState } from "react";

type StaffMember = {
  id: string;
  full_name: string;
  role: string;
  specialty: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  accepts_online_booking: boolean;
  status: string;
  location_id: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Эзэмшигч",
  manager: "Менежер",
  front_desk: "Хүлээн авагч",
  provider: "Мэргэжилтэн",
  assistant: "Туслах",
  billing: "Тооцоо",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "#7c3aed",
  manager: "#2563eb",
  front_desk: "#059669",
  provider: "#d97706",
  assistant: "#6b7280",
  billing: "#dc2626",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <p style={{ margin: 0, fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500 }}>{label}</p>
      <p style={{ margin: "0.1rem 0 0", fontSize: "0.85rem", color: "#111827", lineHeight: 1.4 }}>{value}</p>
    </div>
  );
}

export function StaffListPanel({
  staff,
  onDelete,
  onSelect,
}: {
  staff: StaffMember[];
  onDelete: (id: string) => void;
  onSelect: (staff: StaffMember) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  void onDelete; // kept for compatibility

  if (staff.length === 0) {
    return (
      <div style={{ padding: "3rem 2rem", textAlign: "center", color: "#9ca3af" }}>
        <p style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>👥</p>
        <p style={{ margin: 0, fontSize: "0.9rem" }}>Ажилтан бүртгэлгүй байна</p>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem" }}>AI chat-аар нэмнэ үү →</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p style={{ margin: 0, fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {staff.length} ажилтан
      </p>
      {staff.map((s) => (
        <div
          key={s.id}
          onClick={() => onSelect(s)}
          onMouseEnter={() => setHoveredId(s.id)}
          onMouseLeave={() => setHoveredId(null)}
          style={{
            border: hoveredId === s.id ? "1px solid #6366f1" : "1px solid #e5e7eb",
            borderRadius: "1rem", overflow: "hidden", background: "#fff",
            cursor: "pointer",
            boxShadow: hoveredId === s.id ? "0 4px 16px rgba(99,102,241,0.12)" : "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
        >
          {/* Role color bar */}
          <div style={{ height: "4px", background: ROLE_COLORS[s.role] ?? "#e5e7eb" }} />
          <div style={{ padding: "1rem 1.125rem" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827" }}>{s.full_name}</h3>
                <span style={{
                  display: "inline-block", marginTop: "0.2rem",
                  fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px",
                  borderRadius: "999px",
                  background: `${ROLE_COLORS[s.role] ?? "#e5e7eb"}18`,
                  color: ROLE_COLORS[s.role] ?? "#374151",
                }}>
                  {ROLE_LABELS[s.role] ?? s.role}
                </span>
              </div>
              <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>→</span>
            </div>
            {/* Fields */}
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "0.75rem" }}>
              {s.specialty && <Field label="Мэргэжил" value={s.specialty} />}
              {s.phone && <Field label="Утас" value={s.phone} />}
              {s.email && <Field label="И-мэйл" value={s.email} />}
              {s.bio && <Field label="Танилцуулга" value={s.bio} />}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
                {s.accepts_online_booking && (
                  <span style={{ fontSize: "0.72rem", color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "999px", fontWeight: 500 }}>
                    ✓ Онлайн захиалга
                  </span>
                )}
                {s.status === "inactive" && (
                  <span style={{ fontSize: "0.72rem", color: "#9ca3af", background: "#f9fafb", padding: "2px 8px", borderRadius: "999px" }}>
                    Идэвхгүй
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
