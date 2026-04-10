"use client";
import { useState } from "react";
import { deleteAvailabilityRule, updateAvailabilityRule } from "@/modules/clinic/actions";
import type {
  AvailabilityRule,
  AvailabilityStaffMember as StaffMember,
  AvailabilityLocation as ClinicLocation,
} from "@/modules/clinic/availability-types";

const WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

export function AvailabilityListPanel({ rules, staffMembers, locations, onDelete, onUpdate }: {
  rules: AvailabilityRule[];
  staffMembers: StaffMember[];
  locations: ClinicLocation[];
  onDelete: (id: string) => void;
  onUpdate: (rule: AvailabilityRule) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ start_local: string; end_local: string; is_available: boolean }>({
    start_local: "", end_local: "", is_available: true,
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Энэ ажлын цагийн дүрмийг устгах уу?")) return;
    setDeletingId(id);
    const result = await deleteAvailabilityRule(id);
    if (result.error) alert(result.error); else onDelete(id);
    setDeletingId(null);
  };

  const startEdit = (rule: AvailabilityRule) => {
    setEditingId(rule.id);
    setEditFields({
      start_local: rule.start_local.slice(0, 5),
      end_local: rule.end_local.slice(0, 5),
      is_available: rule.is_available,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = async (rule: AvailabilityRule) => {
    setSavingId(rule.id);
    const result = await updateAvailabilityRule(rule.id, {
      start_local: editFields.start_local,
      end_local: editFields.end_local,
      is_available: editFields.is_available,
    });
    if (result.error) {
      alert(result.error);
    } else {
      onUpdate({ ...rule, ...editFields });
      setEditingId(null);
    }
    setSavingId(null);
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
              {sorted.map((rule) => {
                if (editingId === rule.id) {
                  return (
                    <div key={rule.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", background: "#f0f9ff", border: "1px solid #bae6fd", flexWrap: "wrap" }}>
                      <span style={{ minWidth: "52px", fontSize: "0.8rem", fontWeight: 600, color: "#0369a1" }}>
                        {WEEKDAYS[rule.weekday]}
                      </span>
                      <input
                        type="time"
                        value={editFields.start_local}
                        onChange={(e) => setEditFields((f) => ({ ...f, start_local: e.target.value }))}
                        style={{ border: "1px solid #cbd5e1", borderRadius: "0.375rem", padding: "2px 6px", fontSize: "0.82rem", fontFamily: "inherit" }}
                      />
                      <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>–</span>
                      <input
                        type="time"
                        value={editFields.end_local}
                        onChange={(e) => setEditFields((f) => ({ ...f, end_local: e.target.value }))}
                        style={{ border: "1px solid #cbd5e1", borderRadius: "0.375rem", padding: "2px 6px", fontSize: "0.82rem", fontFamily: "inherit" }}
                      />
                      <select
                        value={editFields.is_available ? "true" : "false"}
                        onChange={(e) => setEditFields((f) => ({ ...f, is_available: e.target.value === "true" }))}
                        style={{ border: "1px solid #cbd5e1", borderRadius: "0.375rem", padding: "2px 6px", fontSize: "0.82rem", fontFamily: "inherit" }}
                      >
                        <option value="true">Ажиллана</option>
                        <option value="false">Амарна</option>
                      </select>
                      <button
                        onClick={() => void handleSave(rule)}
                        disabled={savingId === rule.id}
                        style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: "0.375rem", padding: "3px 10px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", opacity: savingId === rule.id ? 0.5 : 1 }}
                      >
                        {savingId === rule.id ? "..." : "Хадгалах"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{ background: "transparent", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "0.375rem", padding: "3px 10px", fontSize: "0.78rem", cursor: "pointer" }}
                      >
                        Цуцлах
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={rule.id}
                    onClick={() => startEdit(rule)}
                    style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", background: rule.is_available ? "#f0fdf4" : "#fef2f2", cursor: "pointer" }}
                  >
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
                    <button
                      onClick={(e) => { e.stopPropagation(); void handleDelete(rule.id); }}
                      disabled={deletingId === rule.id}
                      style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "0.75rem", padding: "2px 4px", opacity: deletingId === rule.id ? 0.5 : 1 }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
