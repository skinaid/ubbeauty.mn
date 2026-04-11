"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { createAvailabilityRule, deleteAvailabilityRule, updateAvailabilityRule } from "@/modules/clinic/actions";
import { updateClinicProfile } from "@/modules/clinic/profile";
import type {
  AvailabilityRule,
  AvailabilityStaffMember as StaffMember,
  AvailabilityLocation as ClinicLocation,
} from "@/modules/clinic/availability-types";

const WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sun
const WEEKDAY_NAMES_ORDERED = WEEKDAY_ORDER.map((i) => WEEKDAYS[i]); // ["Даваа", ..., "Ням"]

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

/* ─── Org Working Hours helpers ─────────────────────────────────────── */

type DayHour = { enabled: boolean; start: string; end: string };

function parseHours(wh: Record<string, string> | null): Record<string, DayHour> {
  const result: Record<string, DayHour> = {};
  for (const day of WEEKDAY_NAMES_ORDERED) {
    const val = wh?.[day];
    if (val) {
      const idx = val.indexOf("-");
      const start = idx > 0 ? val.slice(0, idx) : "09:00";
      const end = idx > 0 ? val.slice(idx + 1) : "18:00";
      result[day] = { enabled: true, start, end };
    } else {
      result[day] = { enabled: false, start: "09:00", end: "18:00" };
    }
  }
  return result;
}

/* ─── OrgWorkingHours sub-component ─────────────────────────────────── */

function OrgWorkingHoursSection({ workingHours }: { workingHours: Record<string, string> | null }) {
  const [hours, setHours] = useState<Record<string, DayHour>>(() => parseHours(workingHours));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleDay = (day: string) =>
    setHours((prev) => ({ ...prev, [day]: { ...prev[day]!, enabled: !prev[day]!.enabled } }));

  const setDayField = (day: string, field: "start" | "end", value: string) =>
    setHours((prev) => ({ ...prev, [day]: { ...prev[day]!, [field]: value } }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const toSave: Record<string, string> = {};
    for (const [day, dh] of Object.entries(hours)) {
      if (dh.enabled) toSave[day] = `${dh.start}-${dh.end}`;
    }
    const result = await updateClinicProfile({ working_hours: toSave });
    if (result.error) alert(result.error);
    else setSaved(true);
    setSaving(false);
  };

  return (
    <div
      style={{
        margin: "1.25rem 1.25rem 0",
        border: "1px solid #e5e7eb",
        borderRadius: "1rem",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "0.875rem 1.125rem",
          background: "#f8fafc",
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span style={{ fontSize: "1rem" }}>🏥</span>
        <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#111827" }}>
          Байгууллагын ерөнхий ажлын цаг
        </h3>
      </div>

      {/* Day rows */}
      <div style={{ padding: "0.75rem 1.125rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {WEEKDAY_NAMES_ORDERED.map((day) => {
          const dh = hours[day]!;
          return (
            <div
              key={day}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.4rem 0.5rem",
                borderRadius: "0.5rem",
                background: dh.enabled ? "#f0fdf4" : "#fafafa",
              }}
            >
              {/* Toggle */}
              <input
                type="checkbox"
                checked={dh.enabled}
                onChange={() => toggleDay(day)}
                style={{ cursor: "pointer", accentColor: "#059669" }}
              />
              {/* Day name */}
              <span
                style={{
                  minWidth: "52px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: dh.enabled ? "#059669" : "#9ca3af",
                }}
              >
                {day}
              </span>
              {dh.enabled ? (
                <>
                  <input
                    type="time"
                    value={dh.start}
                    onChange={(e) => setDayField(day, "start", e.target.value)}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: "0.375rem",
                      padding: "2px 6px",
                      fontSize: "0.82rem",
                      fontFamily: "inherit",
                    }}
                  />
                  <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>–</span>
                  <input
                    type="time"
                    value={dh.end}
                    onChange={(e) => setDayField(day, "end", e.target.value)}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: "0.375rem",
                      padding: "2px 6px",
                      fontSize: "0.82rem",
                      fontFamily: "inherit",
                    }}
                  />
                </>
              ) : (
                <span style={{ fontSize: "0.8rem", color: "#d1d5db", flex: 1 }}>—</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "0.75rem 1.125rem",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          style={{
            background: "#0f172a",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.45rem 1.25rem",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Хадгалж байна..." : "Хадгалах"}
        </button>
        {saved && (
          <span style={{ fontSize: "0.78rem", color: "#059669" }}>✓ Хадгалагдлаа</span>
        )}
        <span style={{ fontSize: "0.72rem", color: "#9ca3af", marginLeft: "auto" }}>
          {Object.values(hours).filter((d) => d.enabled).length}/7 өдөр
        </span>
      </div>
    </div>
  );
}

/* ─── AddRuleDialog ─────────────────────────────────────────────────── */

function AddRuleDialog({
  staffId,
  staffName,
  locations,
  onClose,
  onSaved,
}: {
  staffId: string;
  staffName: string;
  locations: ClinicLocation[];
  onClose: () => void;
  onSaved: (rule: AvailabilityRule) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [weekday, setWeekday] = useState<number>(1);
  const [startLocal, setStartLocal] = useState("09:00");
  const [endLocal, setEndLocal] = useState("18:00");
  const [locationId, setLocationId] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    const result = await createAvailabilityRule({
      staff_member_id: staffId,
      location_id: locationId,
      weekday,
      start_local: startLocal,
      end_local: endLocal,
      is_available: isAvailable,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else if (result.rule) {
      onSaved(result.rule);
      onClose();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "1rem",
          maxWidth: "420px",
          width: "calc(100% - 2rem)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#111827" }}>
            Ажлын цаг нэмэх — {staffName}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.1rem",
              color: "#6b7280",
              cursor: "pointer",
              lineHeight: 1,
              padding: "0 0.25rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            overflowY: "auto",
          }}
        >
          {/* Weekday */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280", fontWeight: 600 }}>
              Гараг
            </label>
            <select
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
              style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem", fontSize: "0.875rem", fontFamily: "inherit" }}
            >
              <option value={1}>Даваа</option>
              <option value={2}>Мягмар</option>
              <option value={3}>Лхагва</option>
              <option value={4}>Пүрэв</option>
              <option value={5}>Баасан</option>
              <option value={6}>Бямба</option>
              <option value={0}>Ням</option>
            </select>
          </div>

          {/* Start time */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280", fontWeight: 600 }}>
              Эхлэх цаг
            </label>
            <input
              type="time"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem", fontSize: "0.875rem", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>

          {/* End time */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280", fontWeight: 600 }}>
              Дуусах цаг
            </label>
            <input
              type="time"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
              style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem", fontSize: "0.875rem", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>

          {/* Location */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280", fontWeight: 600 }}>
              Байршил
            </label>
            <select
              value={locationId ?? ""}
              onChange={(e) => setLocationId(e.target.value === "" ? null : e.target.value)}
              style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem", fontSize: "0.875rem", fontFamily: "inherit" }}
            >
              <option value="">Тодорхойгүй</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          {/* Is available */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              id="add-rule-is-available"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              style={{ cursor: "pointer", accentColor: "#6366f1", width: "1rem", height: "1rem" }}
            />
            <label
              htmlFor="add-rule-is-available"
              style={{ fontSize: "0.875rem", color: "#374151", cursor: "pointer" }}
            >
              Боломжтой эсэх
            </label>
          </div>

          {/* Error */}
          {error && (
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#ef4444", background: "#fef2f2", padding: "0.5rem 0.75rem", borderRadius: "0.5rem" }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "0.875rem 1.25rem",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "#374151",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              padding: "0.45rem 1rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Болих
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={saving}
            style={{
              background: "#6366f1",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.45rem 1.25rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Main AvailabilityListPanel ─────────────────────────────────────── */

export function AvailabilityListPanel({
  rules,
  staffMembers,
  locations,
  workingHours,
  onDelete,
  onUpdate,
  onAdd,
  onAddForStaff,
}: {
  rules: AvailabilityRule[];
  staffMembers: StaffMember[];
  locations: ClinicLocation[];
  workingHours: Record<string, string> | null;
  onDelete: (id: string) => void;
  onUpdate: (rule: AvailabilityRule) => void;
  onAdd: (rule: AvailabilityRule) => void;
  onAddForStaff: (staffId: string) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addDialogStaffId, setAddDialogStaffId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{
    start_local: string;
    end_local: string;
    is_available: boolean;
  }>({ start_local: "", end_local: "", is_available: true });
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Энэ ажлын цагийн дүрмийг устгах уу?")) return;
    setDeletingId(id);
    const result = await deleteAvailabilityRule(id);
    if (result.error) alert(result.error);
    else onDelete(id);
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

  const cancelEdit = () => setEditingId(null);

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

  const locById = new Map(locations.map((l) => [l.id, l]));

  // Group rules by staff
  const rulesByStaff = new Map<string, AvailabilityRule[]>();
  for (const rule of rules) {
    const existing = rulesByStaff.get(rule.staff_member_id) ?? [];
    rulesByStaff.set(rule.staff_member_id, [...existing, rule]);
  }

  return (
    <div style={{ paddingBottom: "1.25rem" }}>
      {/* ── Org working hours ── */}
      <OrgWorkingHoursSection workingHours={workingHours} />

      {/* ── Staff list header ── */}
      <div style={{ padding: "1rem 1.25rem 0.25rem" }}>
        <p
          style={{
            margin: 0,
            fontSize: "0.65rem",
            color: "#9ca3af",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          Ажилтнуудын цаг — {staffMembers.length} ажилтан
        </p>
      </div>

      {/* ── Per-staff cards ── */}
      <div style={{ padding: "0 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {staffMembers.length === 0 && (
          <div
            style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}
          >
            Ажилтан бүртгэлгүй байна
          </div>
        )}

        {staffMembers.map((staff) => {
          const staffRules = (rulesByStaff.get(staff.id) ?? []).sort(
            (a, b) => WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday)
          );
          const configuredWeekdays = new Set(staffRules.map((r) => r.weekday));
          const unconfiguredDays = WEEKDAY_ORDER.filter((wd) => !configuredWeekdays.has(wd));
          const roleColor = ROLE_COLORS[staff.role] ?? "#6b7280";
          const roleLabel = ROLE_LABELS[staff.role] ?? staff.role;

          return (
            <div
              key={staff.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "1rem",
                overflow: "hidden",
                background: "#fff",
              }}
            >
              {/* Card header */}
              <div
                style={{
                  padding: "0.75rem 1.125rem",
                  borderBottom: "1px solid #f3f4f6",
                  background: "#f9fafb",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                }}
              >
                {/* Avatar */}
                <div style={{ position: "relative", width: "2rem", height: "2rem", flexShrink: 0 }}>
                  {staff.photo_url ? (
                    <Image
                      src={staff.photo_url}
                      alt={staff.full_name}
                      fill
                      unoptimized
                      style={{ objectFit: "cover", borderRadius: "50%" }}
                    />
                  ) : (
                    <div style={{
                      width: "2rem", height: "2rem", borderRadius: "50%",
                      background: `linear-gradient(135deg, ${roleColor}cc, ${roleColor}66)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: "0.8rem", fontWeight: 700,
                    }}>
                      {staff.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "0.92rem",
                    fontWeight: 700,
                    color: "#111827",
                    flex: 1,
                  }}
                >
                  {staff.full_name}
                </h3>
                {/* Role badge */}
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    color: roleColor,
                    background: `${roleColor}18`,
                    border: `1px solid ${roleColor}40`,
                    borderRadius: "999px",
                    padding: "2px 8px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {roleLabel}
                </span>
                {/* Day count */}
                <span
                  style={{
                    fontSize: "0.68rem",
                    color: "#9ca3af",
                    whiteSpace: "nowrap",
                  }}
                >
                  {staffRules.length}/7
                </span>
                {/* Manual add button */}
                <button
                  onClick={() => setAddDialogStaffId(staff.id)}
                  title="Гараар ажлын цаг нэмэх"
                  style={{
                    background: "#f5f3ff",
                    border: "1.5px solid #c7d2fe",
                    color: "#6366f1",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    borderRadius: "0.375rem",
                    padding: "3px 10px",
                    cursor: "pointer",
                    lineHeight: 1.5,
                    whiteSpace: "nowrap",
                  }}
                >
                  ✚ Гараар
                </button>
                {/* Add via AI button */}
                <button
                  onClick={() => onAddForStaff(staff.id)}
                  title="AI-р ажлын цаг нэмэх"
                  style={{
                    background: "#0f172a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "0.375rem",
                    padding: "3px 10px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    lineHeight: 1.5,
                  }}
                >
                  + Нэмэх
                </button>
              </div>

              {/* Rules body */}
              <div
                style={{
                  padding: "0.75rem 1.125rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {staffRules.length === 0 && unconfiguredDays.length === 0 && (
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#9ca3af" }}>
                    Тохируулаагүй
                  </p>
                )}

                {/* Configured day rows */}
                {staffRules.map((rule) => {
                  if (editingId === rule.id) {
                    return (
                      <div
                        key={rule.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "0.5rem",
                          background: "#f0f9ff",
                          border: "1px solid #bae6fd",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            minWidth: "52px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: "#0369a1",
                          }}
                        >
                          {WEEKDAYS[rule.weekday]}
                        </span>
                        <input
                          type="time"
                          value={editFields.start_local}
                          onChange={(e) =>
                            setEditFields((f) => ({ ...f, start_local: e.target.value }))
                          }
                          style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: "0.375rem",
                            padding: "2px 6px",
                            fontSize: "0.82rem",
                            fontFamily: "inherit",
                          }}
                        />
                        <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>–</span>
                        <input
                          type="time"
                          value={editFields.end_local}
                          onChange={(e) =>
                            setEditFields((f) => ({ ...f, end_local: e.target.value }))
                          }
                          style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: "0.375rem",
                            padding: "2px 6px",
                            fontSize: "0.82rem",
                            fontFamily: "inherit",
                          }}
                        />
                        <select
                          value={editFields.is_available ? "true" : "false"}
                          onChange={(e) =>
                            setEditFields((f) => ({
                              ...f,
                              is_available: e.target.value === "true",
                            }))
                          }
                          style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: "0.375rem",
                            padding: "2px 6px",
                            fontSize: "0.82rem",
                            fontFamily: "inherit",
                          }}
                        >
                          <option value="true">Ажиллана</option>
                          <option value="false">Амарна</option>
                        </select>
                        <button
                          onClick={() => void handleSave(rule)}
                          disabled={savingId === rule.id}
                          style={{
                            background: "#0f172a",
                            color: "#fff",
                            border: "none",
                            borderRadius: "0.375rem",
                            padding: "3px 10px",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            opacity: savingId === rule.id ? 0.5 : 1,
                          }}
                        >
                          {savingId === rule.id ? "..." : "Хадгалах"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{
                            background: "transparent",
                            color: "#6b7280",
                            border: "1px solid #e5e7eb",
                            borderRadius: "0.375rem",
                            padding: "3px 10px",
                            fontSize: "0.78rem",
                            cursor: "pointer",
                          }}
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
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "0.5rem",
                        background: rule.is_available ? "#f0fdf4" : "#fef2f2",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          minWidth: "52px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: rule.is_available ? "#059669" : "#ef4444",
                        }}
                      >
                        {WEEKDAYS[rule.weekday]}
                      </span>
                      <span style={{ flex: 1, fontSize: "0.85rem", color: "#111827" }}>
                        {rule.is_available
                          ? `${rule.start_local.slice(0, 5)} – ${rule.end_local.slice(0, 5)}`
                          : "Амарна"}
                      </span>
                      {rule.location_id && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "#6b7280",
                            background: "#f3f4f6",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {locById.get(rule.location_id)?.name ?? "Салбар"}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDelete(rule.id);
                        }}
                        disabled={deletingId === rule.id}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#9ca3af",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          padding: "2px 4px",
                          opacity: deletingId === rule.id ? 0.5 : 1,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}

                {/* Unconfigured days summary */}
                {unconfiguredDays.length > 0 && staffRules.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.4rem 0.75rem",
                      borderRadius: "0.5rem",
                      background: "#f9fafb",
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                      — Тохируулаагүй ({unconfiguredDays.length} өдөр:{" "}
                      {unconfiguredDays.map((wd) => WEEKDAYS[wd]).join(", ")})
                    </span>
                  </div>
                )}

                {/* Fully unconfigured staff */}
                {staffRules.length === 0 && (
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      background: "#fafafa",
                      border: "1px dashed #e5e7eb",
                      textAlign: "center",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#9ca3af" }}>
                      Тохируулаагүй — AI chat-аар нэмнэ үү
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual add dialog */}
      {addDialogStaffId && (() => {
        const s = staffMembers.find((m) => m.id === addDialogStaffId);
        if (!s) return null;
        return (
          <AddRuleDialog
            key={addDialogStaffId}
            staffId={s.id}
            staffName={s.full_name}
            locations={locations}
            onClose={() => setAddDialogStaffId(null)}
            onSaved={(rule) => {
              onAdd(rule);
              setAddDialogStaffId(null);
            }}
          />
        );
      })()}
    </div>
  );
}
