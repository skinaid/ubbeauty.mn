"use client";
import { useState } from "react";
import type { ServiceRecord } from "@/modules/clinic/service-types";

type Category = { id: string; name: string };

const STATUS_COLORS: Record<string, string> = { active: "#059669", inactive: "#9ca3af", archived: "#ef4444" };
const STATUS_LABELS: Record<string, string> = { active: "Идэвхтэй", inactive: "Идэвхгүй", archived: "Архивласан" };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <p style={{ margin: 0, fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500 }}>{label}</p>
      <p style={{ margin: "0.1rem 0 0", fontSize: "0.85rem", color: "#111827", lineHeight: 1.4 }}>{value}</p>
    </div>
  );
}

function ServiceCard({
  s,
  onSelect,
  hovered,
  onMouseEnter,
  onMouseLeave,
}: {
  s: ServiceRecord;
  onSelect: (service: ServiceRecord) => void;
  hovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <div
      onClick={() => onSelect(s)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        border: `1px solid ${hovered ? "#6366f1" : "#e5e7eb"}`,
        borderRadius: "1rem",
        overflow: "hidden",
        background: "#fff",
        cursor: "pointer",
        boxShadow: hovered ? "0 2px 8px rgba(99,102,241,0.12)" : "none",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      <div style={{ height: "4px", background: STATUS_COLORS[s.status] ?? "#e5e7eb" }} />
      <div style={{ padding: "1rem 1.125rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827" }}>{s.name}</h3>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: `${STATUS_COLORS[s.status] ?? "#e5e7eb"}18`, color: STATUS_COLORS[s.status] ?? "#374151" }}>
                {STATUS_LABELS[s.status] ?? s.status}
              </span>
              {s.is_bookable && (
                <span style={{ fontSize: "0.72rem", color: "#2563eb", background: "#eff6ff", padding: "2px 8px", borderRadius: "999px", fontWeight: 500 }}>
                  ✓ Онлайн захиалга
                </span>
              )}
            </div>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>→</span>
        </div>
        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "0.75rem" }}>
          <Field label="Үргэлжлэх хугацаа" value={`${s.duration_minutes} мин`} />
          <Field label="Үнэ" value={`₮${Number(s.price_from).toLocaleString()}`} />
          {s.description && <Field label="Тайлбар" value={s.description} />}
        </div>
      </div>
    </div>
  );
}

export function ServicesListPanel({
  services,
  categories = [],
  onDelete: _onDelete,
  onSelect,
}: {
  services: ServiceRecord[];
  categories?: Category[];
  onDelete?: (id: string) => void;
  onSelect: (service: ServiceRecord) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (services.length === 0) {
    return (
      <div style={{ padding: "3rem 2rem", textAlign: "center", color: "#9ca3af" }}>
        <p style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>💆</p>
        <p style={{ margin: 0, fontSize: "0.9rem" }}>Үйлчилгээ бүртгэлгүй байна</p>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem" }}>AI chat-аар нэмнэ үү →</p>
      </div>
    );
  }

  // Group services by category
  const categoryMap = new Map<string, string>(categories.map((c) => [c.id, c.name]));

  // Build grouped structure: Map<categoryLabel, ServiceRecord[]>
  const groups = new Map<string, ServiceRecord[]>();
  for (const svc of services) {
    const label = svc.category_id
      ? (categoryMap.get(svc.category_id) ?? "Ангилалгүй")
      : "Ангилалгүй";
    const existing = groups.get(label) ?? [];
    existing.push(svc);
    groups.set(label, existing);
  }

  // Sort: known categories first (in their original order), then "Ангилалгүй"
  const orderedLabels: string[] = [];
  for (const cat of categories) {
    if (groups.has(cat.name)) orderedLabels.push(cat.name);
  }
  if (groups.has("Ангилалгүй")) orderedLabels.push("Ангилалгүй");

  const hasCategories = categories.length > 0 || [...groups.keys()].some((k) => k !== "Ангилалгүй");

  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p style={{ margin: 0, fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {services.length} үйлчилгээ
      </p>

      {hasCategories ? (
        orderedLabels.map((label) => {
          const groupServices = groups.get(label) ?? [];
          if (groupServices.length === 0) return null;
          return (
            <div key={label}>
              {/* Category header */}
              <div style={{ marginBottom: "0.75rem", paddingBottom: "0.25rem", borderBottom: "2px solid #f3f4f6" }}>
                <p style={{
                  margin: 0,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}>
                  {label}
                  <span style={{ marginLeft: "0.5rem", fontWeight: 400, color: "#d1d5db" }}>
                    ({groupServices.length})
                  </span>
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {groupServices.map((s) => (
                  <ServiceCard
                    key={s.id}
                    s={s}
                    onSelect={onSelect}
                    hovered={hoveredId === s.id}
                    onMouseEnter={() => setHoveredId(s.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        // No categories at all — flat list
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {services.map((s) => (
            <ServiceCard
              key={s.id}
              s={s}
              onSelect={onSelect}
              hovered={hoveredId === s.id}
              onMouseEnter={() => setHoveredId(s.id)}
              onMouseLeave={() => setHoveredId(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
