"use client";
import { useState } from "react";
import { deleteAvailabilityRule } from "@/modules/clinic/actions";

type AvailabilityRule = { id: string; staff_member_id: string; location_id: string | null; weekday: number; start_local: string; end_local: string; is_available: boolean };
type StaffMember = { id: string; full_name: string; role: string };
type ClinicLocation = { id: string; name: string };

const WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

export function AvailabilityListPanel({ rules, staffMembers, locations, onDelete }: {
  rules: AvailabilityRule[]; staffMembers: StaffMember[]; locations: ClinicLocation[]; onDelete: (id: string) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Энэ ажлын цагийн дүрмийг устгах уу?")) return;
    setDeletingId(id);
    const result = await deleteAvailabilityRule(id);
    if (result.error) alert(result.error); else onDelete(id);
    setDeletingId(null);
  };

  const staffById = new Map(staffMembers.map((s) => [s.id, s]));
  const locById = new Map(locations.map((l) => [l.id, l]));

  // Group by staff member
  const byStaff = new Map<string, AvailabilityRule[]>();
  for (const rule of rules) {
    const existing = byStaff.get(rule.staff_member_id) ?? [];
    byStaff.set(rule.staff_member_id, [...existing, rule]);
  }

  if (rules.length === 0) {
    return (
      <div style={{ padding: "3rem 2rem", textAlign: "center", color: "#9ca3af" }}>
        <p style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>🗓</p>
        <p style={{ margin: 0, fontSize: "0.9rem" }}>Ажлын цаг тохируулаагүй байна</p>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem" }}>AI chat-аар нэмнэ үү →</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <p style={{ margin: 0, fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {rules.length} дүрэм
      </p>
      {Array.from(byStaff.entries()).map(([staffId, staffRules]) => {
        const staff = staffById.get(staffId);
        const sorted = [...staffRules].sort((a, b) => WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday));
        return (
          <div key={staffId} style={{ border: "1px solid #e5e7eb", borderRadius: "1rem", overflow: "hidden", background: "#fff" }}>
            <div style={{ padding: "0.875rem 1.125rem", borderBottom: "1px solid #f3f4f6", background: "#f9fafb" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#111827" }}>
                {staff?.full_name ?? "Ажилтан"}
              </h3>
            </div>
            <div style={{ padding: "0.75rem 1.125rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {sorted.map((rule) => (
                <div key={rule.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", background: rule.is_available ? "#f0fdf4" : "#fef2f2" }}>
                  <span style={{ minWidth: "52px", fontSize: "0.8rem", fontWeight: 600, color: rule.is_available ? "#059669" : "#ef4444" }}>
                    {WEEKDAYS[rule.weekday]}
                  </span>
                  <span style={{ flex: 1, fontSize: "0.85rem", color: "#111827" }}>
                    {rule.is_available ? `${rule.start_local.slice(0,5)} – ${rule.end_local.slice(0,5)}` : "Амарна"}
                  </span>
                  {rule.location_id && (
                    <span style={{ fontSize: "0.72rem", color: "#6b7280", background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>
                      {locById.get(rule.location_id)?.name ?? "Салбар"}
                    </span>
                  )}
                  <button onClick={() => void handleDelete(rule.id)} disabled={deletingId === rule.id}
                    style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "0.75rem", padding: "2px 4px", opacity: deletingId === rule.id ? 0.5 : 1 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
