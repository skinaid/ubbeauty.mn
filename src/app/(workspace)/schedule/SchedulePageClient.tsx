"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppointmentStatusActions } from "@/components/clinic/appointment-status-actions";
import { CreateCheckoutDraftButton } from "@/components/clinic/create-checkout-draft-button";
import { createAdminAppointmentAction, type ClinicSetupActionState } from "@/modules/clinic/actions";
import {
  getScheduleHandoffState,
  getCheckoutOpenHref,
  getBillingAuditHref,
  isScheduleHandoffEligible,
} from "@/modules/clinic/workflow-handoffs";
import type { AppointmentWithRelations } from "@/modules/clinic/data";
import type { ClinicLocationRow, ServiceRow, StaffMemberRow, AppointmentStatus } from "@/modules/clinic/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatMongolianDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
  return `${y} оны ${m} сарын ${d} · ${days[date.getDay()]}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} (${days[d.getDay()]})`;
}

function navigateDateStr(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(y, m - 1, d + delta);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

// ── constants ────────────────────────────────────────────────────────────────

const SLOT_HEIGHT = 56; // px per 30-min slot
const GRID_START_HOUR = 8;
const GRID_END_HOUR = 20;
const TOTAL_SLOTS = (GRID_END_HOUR - GRID_START_HOUR) * 2; // 24
const GRID_HEIGHT = TOTAL_SLOTS * SLOT_HEIGHT; // 1344px
const TIME_COL_WIDTH = 48;
const MIN_STAFF_COL_WIDTH = 180;

const STATUS_COLORS: Record<string, string> = {
  booked: "#6366f1",
  confirmed: "#2563eb",
  arrived: "#059669",
  in_progress: "#d97706",
  completed: "#9ca3af",
  canceled: "#ef4444",
  no_show: "#f97316",
};

const STATUS_LABELS: Record<string, string> = {
  booked: "Бүртгэгдсэн",
  confirmed: "Баталгаажсан",
  arrived: "Ирсэн",
  in_progress: "Хийгдэж байна",
  completed: "Дууссан",
  canceled: "Цуцлагдсан",
  no_show: "Ирээгүй",
};

const SOURCE_LABELS: Record<string, string> = {
  admin: "Гараар",
  online_booking: "Онлайн",
  walk_in: "Алхаж орсон",
};

const NEXT_STATUS_MAP: Record<AppointmentStatus, AppointmentStatus[]> = {
  booked: ["confirmed", "canceled", "no_show"],
  confirmed: ["arrived", "canceled", "no_show"],
  arrived: ["in_progress", "completed", "canceled"],
  in_progress: ["completed", "canceled"],
  completed: [],
  canceled: [],
  no_show: [],
};

const ROLE_GRADIENTS: Record<string, string> = {
  owner: "linear-gradient(135deg,#7c3aed,#a855f7)",
  manager: "linear-gradient(135deg,#2563eb,#60a5fa)",
  front_desk: "linear-gradient(135deg,#059669,#34d399)",
  provider: "linear-gradient(135deg,#d97706,#fbbf24)",
  assistant: "linear-gradient(135deg,#6b7280,#9ca3af)",
  billing: "linear-gradient(135deg,#dc2626,#f87171)",
};

// ── types ────────────────────────────────────────────────────────────────────

type Props = {
  initialAppointments: AppointmentWithRelations[];
  staffMembers: StaffMemberRow[];
  services: ServiceRow[];
  locations: ClinicLocationRow[];
};

// ── AddModal ─────────────────────────────────────────────────────────────────

const addInitialState: ClinicSetupActionState = {};

function AddModal({
  services,
  staffMembers,
  locations,
  prefilledStaffId,
  prefilledDateTime,
  onClose,
  onSuccess,
}: {
  services: ServiceRow[];
  staffMembers: StaffMemberRow[];
  locations: ClinicLocationRow[];
  prefilledStaffId: string;
  prefilledDateTime: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createAdminAppointmentAction, addInitialState);
  const prevMessageRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.message && state.message !== prevMessageRef.current) {
      prevMessageRef.current = state.message;
      formRef.current?.reset();
      onSuccess();
      onClose();
    }
  }, [state.message, onSuccess, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const labelStyle: React.CSSProperties = {
    fontSize: "0.7rem",
    textTransform: "uppercase" as const,
    color: "#6b7280",
    fontWeight: 600,
    letterSpacing: "0.07em",
    display: "block",
    marginBottom: "0.3rem",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    border: "1px solid #e5e7eb",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    boxSizing: "border-box",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "1rem",
          width: "480px",
          maxWidth: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid #e5e7eb",
            flexShrink: 0,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>✚ Шинэ захиалга</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.25rem",
              color: "#6b7280",
              padding: "0.25rem 0.5rem",
              borderRadius: "6px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
          <form ref={formRef} id="add-appointment-form" action={formAction} style={{ display: "grid", gap: "0.85rem" }}>
            <input type="hidden" name="source" value="admin" />

            <div>
              <label style={labelStyle}>Patient нэр *</label>
              <input name="fullName" required placeholder="Бат-Эрдэнэ" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Утас *</label>
              <input name="phone" required type="tel" placeholder="+976 9900 0000" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>И-мэйл</label>
              <input name="email" type="email" placeholder="example@mail.com" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Үйлчилгээ *</label>
              <select name="serviceId" required style={inputStyle}>
                <option value="">— Сонгоно уу —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.duration_minutes} мин
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Захиалгын цаг *</label>
              <input
                name="scheduledStart"
                required
                type="datetime-local"
                defaultValue={prefilledDateTime}
                key={prefilledDateTime}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Ажилтан</label>
              <select name="staffMemberId" style={inputStyle} defaultValue={prefilledStaffId} key={prefilledStaffId}>
                <option value="">— Сонгоогүй —</option>
                {staffMembers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Байршил</label>
              <select name="locationId" style={inputStyle}>
                <option value="">— Сонгоогүй —</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Тэмдэглэл</label>
              <textarea
                name="internalNotes"
                rows={3}
                placeholder="Дотоод тэмдэглэл..."
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            {state.error && (
              <p style={{ margin: 0, color: "#ef4444", fontSize: "0.82rem", fontWeight: 600 }}>{state.error}</p>
            )}
            {state.message && (
              <p style={{ margin: 0, color: "#059669", fontSize: "0.82rem", fontWeight: 600 }}>{state.message}</p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
            borderTop: "1px solid #e5e7eb",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              padding: "0.55rem 1.25rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            Болих
          </button>
          <button
            type="submit"
            form="add-appointment-form"
            disabled={pending}
            style={{
              background: pending ? "#a5b4fc" : "#6366f1",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.55rem 1.5rem",
              cursor: pending ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
          >
            {pending ? "Бүртгэж байна..." : "Захиалга бүртгэх"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DetailModal ───────────────────────────────────────────────────────────────

function DetailModal({
  appointment,
  onClose,
}: {
  appointment: AppointmentWithRelations;
  onClose: () => void;
}) {
  const color = STATUS_COLORS[appointment.status] ?? "#6366f1";
  const nextStatuses = NEXT_STATUS_MAP[appointment.status as AppointmentStatus] ?? [];
  const handoffEligible = isScheduleHandoffEligible(appointment.status);

  const handoffState = handoffEligible
    ? getScheduleHandoffState({
        appointment: {
          id: appointment.id,
          patient_id: appointment.patient_id,
          status: appointment.status,
        },
        checkout: undefined,
      })
    : null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "1rem",
          width: "480px",
          maxWidth: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid #e5e7eb",
            flexShrink: 0,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
            {appointment.patient?.full_name ?? "Patient"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.25rem",
              color: "#6b7280",
              padding: "0.25rem 0.5rem",
              borderRadius: "6px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "grid", gap: "1rem" }}>
          {/* Patient phone */}
          {appointment.patient?.phone && (
            <a
              href={`tel:${appointment.patient.phone}`}
              style={{ color: "#6366f1", fontSize: "0.9rem", textDecoration: "none" }}
            >
              📞 {appointment.patient.phone}
            </a>
          )}

          {/* Service/time info block */}
          <div
            style={{
              background: "#f9fafb",
              borderRadius: "8px",
              padding: "0.85rem",
              display: "grid",
              gap: "0.4rem",
            }}
          >
            <DetailRow label="Үйлчилгээ" value={appointment.service?.name ?? "—"} />
            <DetailRow
              label="Үргэлжлэх хугацаа"
              value={`${appointment.duration_minutes ?? appointment.service?.duration_minutes ?? "—"} мин`}
            />
            <DetailRow label="Цаг" value={formatDateTime(appointment.scheduled_start)} />
            {appointment.staff_member?.full_name && (
              <DetailRow label="Ажилтан" value={appointment.staff_member.full_name} />
            )}
            {appointment.location?.name && (
              <DetailRow label="Байршил" value={appointment.location.name} />
            )}
          </div>

          {/* Status + source badges */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <span
              style={{
                background: color,
                color: "#fff",
                borderRadius: "12px",
                padding: "0.2rem 0.75rem",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              {STATUS_LABELS[appointment.status] ?? appointment.status}
            </span>
            <span
              style={{
                background: "#f3f4f6",
                borderRadius: "12px",
                padding: "0.2rem 0.75rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#6b7280",
              }}
            >
              {SOURCE_LABELS[appointment.source ?? ""] ?? appointment.source ?? "—"}
            </span>
          </div>

          {/* Internal notes */}
          {appointment.internal_notes && (
            <div>
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280" }}>
                Тэмдэглэл
              </p>
              <p
                style={{
                  margin: 0,
                  background: "#f9fafb",
                  borderRadius: "6px",
                  padding: "0.6rem",
                  fontSize: "0.875rem",
                }}
              >
                {appointment.internal_notes}
              </p>
            </div>
          )}

          {/* Divider */}
          <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: 0 }} />

          {/* Status actions */}
          {nextStatuses.length > 0 && (
            <div>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280" }}>
                Статус өөрчлөх
              </p>
              <AppointmentStatusActions
                appointmentId={appointment.id}
                nextStatuses={nextStatuses}
              />
            </div>
          )}

          {/* POS handoff */}
          {handoffState && (
            <div
              style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: "8px",
                padding: "0.85rem",
                display: "grid",
                gap: "0.5rem",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: "#0369a1" }}>
                POS / Billing холбоос
              </p>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                {handoffState.links.map((link) => (
                  <Link key={link.href} href={link.href} style={{ color: "#6366f1", fontSize: "0.85rem", fontWeight: 600 }}>
                    {link.label}
                  </Link>
                ))}
              </div>
              {handoffState.kind === "draft_ready" && (
                <CreateCheckoutDraftButton appointmentId={appointment.id} />
              )}
              {handoffState.kind === "waiting_for_completion" && (
                <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  {handoffState.message}
                </span>
              )}
              {handoffState.kind === "checkout_ready" && (
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "#059669",
                    fontWeight: 600,
                    background: "#d1fae5",
                    borderRadius: "6px",
                    padding: "0.2rem 0.5rem",
                    width: "fit-content",
                  }}
                >
                  {handoffState.badgeLabel}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DetailRow helper ──────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between", fontSize: "0.85rem" }}>
      <span style={{ color: "#6b7280", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

// ── DayGridCalendar ───────────────────────────────────────────────────────────

function DayGridCalendar({
  appointments,
  staffMembers,
  selectedDate,
  selectedAppointmentId,
  onAppointmentClick,
  onSlotClick,
}: {
  appointments: AppointmentWithRelations[];
  staffMembers: StaffMemberRow[];
  selectedDate: string;
  selectedAppointmentId: string | null;
  onAppointmentClick: (apt: AppointmentWithRelations) => void;
  onSlotClick: (staffId: string, hour: number, minute: number) => void;
}) {
  // Group appointments by staff_member_id
  const byStaff = new Map<string, AppointmentWithRelations[]>();
  const unassigned: AppointmentWithRelations[] = [];

  for (const apt of appointments) {
    if (apt.staff_member_id) {
      const arr = byStaff.get(apt.staff_member_id) ?? [];
      arr.push(apt);
      byStaff.set(apt.staff_member_id, arr);
    } else {
      unassigned.push(apt);
    }
  }

  const hasUnassigned = unassigned.length > 0;
  // If no staff members defined, use a single "all appointments" column
  const useAllColumn = staffMembers.length === 0;

  // Build time slots array
  const timeSlots = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const totalMins = GRID_START_HOUR * 60 + i * 30;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return { i, h, m };
  });

  // Compute minute offset since grid start
  const minutesSinceGridStart = (dateStr: string) => {
    const d = new Date(dateStr);
    return (d.getHours() - GRID_START_HOUR) * 60 + d.getMinutes();
  };

  // Render a single staff column's appointment blocks
  const renderAppointments = (colApts: AppointmentWithRelations[], staffId: string) =>
    colApts.map((apt) => {
      const mins = minutesSinceGridStart(apt.scheduled_start);
      const duration = apt.duration_minutes ?? apt.service?.duration_minutes ?? 30;
      const topPx = (mins / 30) * SLOT_HEIGHT;
      const heightPx = Math.max((duration / 30) * SLOT_HEIGHT, SLOT_HEIGHT * 0.8);
      const statusColor = STATUS_COLORS[apt.status] ?? "#6366f1";
      const isSelected = apt.id === selectedAppointmentId;

      return (
        <div
          key={apt.id}
          onClick={(e) => {
            e.stopPropagation();
            onAppointmentClick(apt);
          }}
          style={{
            position: "absolute",
            top: topPx,
            left: 4,
            right: 4,
            height: heightPx,
            background: `${statusColor}20`,
            borderLeft: `3px solid ${statusColor}`,
            borderRadius: 6,
            padding: "3px 6px",
            cursor: "pointer",
            overflow: "hidden",
            boxShadow: isSelected
              ? `0 0 0 2px ${statusColor}, 0 4px 12px rgba(0,0,0,0.2)`
              : "0 1px 3px rgba(0,0,0,0.08)",
            zIndex: isSelected ? 2 : 1,
            transition: "box-shadow 0.15s",
            display: "flex",
            flexDirection: "column",
            gap: "1px",
          }}
        >
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#1a1c20",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {apt.patient?.full_name ?? "Patient"}
          </span>
          {heightPx >= SLOT_HEIGHT * 0.9 && (
            <span
              style={{
                fontSize: "0.65rem",
                color: "#6b7280",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {apt.service?.name ?? ""}
            </span>
          )}
          {heightPx >= SLOT_HEIGHT * 1.2 && (
            <span
              style={{
                fontSize: "0.62rem",
                color: "#9ca3af",
                whiteSpace: "nowrap",
              }}
            >
              {formatTime(apt.scheduled_start)}
              {" – "}
              {(() => {
                const startD = new Date(apt.scheduled_start);
                const endD = new Date(startD.getTime() + duration * 60000);
                return `${String(endD.getHours()).padStart(2, "0")}:${String(endD.getMinutes()).padStart(2, "0")}`;
              })()}
            </span>
          )}
        </div>
      );
    });

  // Column header for a staff member
  const renderStaffHeader = (staff: StaffMemberRow) => {
    const gradient = ROLE_GRADIENTS[staff.role] ?? ROLE_GRADIENTS.provider;
    const initials = staff.full_name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
    return (
      <div
        key={staff.id}
        style={{
          flex: 1,
          minWidth: MIN_STAFF_COL_WIDTH,
          borderRight: "1px solid #e5e7eb",
          padding: "0.6rem 0.75rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: gradient,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.78rem",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials || "?"}
        </div>
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {staff.full_name}
          </div>
          {staff.specialty && (
            <div
              style={{
                fontSize: "0.7rem",
                color: "#9ca3af",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {staff.specialty}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowX: "auto" }}>
      {/* Column headers (sticky) */}
      <div
        style={{
          display: "flex",
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          flexShrink: 0,
        }}
      >
        {/* Time column header spacer */}
        <div
          style={{
            width: TIME_COL_WIDTH,
            minWidth: TIME_COL_WIDTH,
            flexShrink: 0,
            borderRight: "1px solid #e5e7eb",
          }}
        />
        {/* Staff headers */}
        {useAllColumn ? (
          <div
            style={{
              flex: 1,
              minWidth: MIN_STAFF_COL_WIDTH,
              padding: "0.6rem 0.75rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "#6b7280",
            }}
          >
            Бүх захиалга
          </div>
        ) : (
          <>
            {staffMembers.map(renderStaffHeader)}
            {hasUnassigned && (
              <div
                style={{
                  flex: 1,
                  minWidth: MIN_STAFF_COL_WIDTH,
                  borderLeft: "1px solid #e5e7eb",
                  padding: "0.6rem 0.75rem",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                Ажилтангүй
              </div>
            )}
          </>
        )}
      </div>

      {/* Grid body */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Time column */}
        <div
          style={{
            width: TIME_COL_WIDTH,
            minWidth: TIME_COL_WIDTH,
            flexShrink: 0,
            position: "relative",
            height: GRID_HEIGHT,
            borderRight: "1px solid #e5e7eb",
          }}
        >
          {timeSlots.map(({ i, h, m }) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: i * SLOT_HEIGHT,
                left: 0,
                right: 0,
                height: SLOT_HEIGHT,
                borderBottom: `1px solid ${m === 0 ? "#e5e7eb" : "#f3f4f6"}`,
                display: "flex",
                alignItems: "flex-start",
                paddingTop: "2px",
                paddingLeft: "4px",
              }}
            >
              {m === 0 && (
                <span style={{ fontSize: "0.62rem", color: "#9ca3af", fontWeight: 600 }}>
                  {String(h).padStart(2, "0")}:00
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Staff grid columns */}
        {useAllColumn ? (
          <div
            style={{
              flex: 1,
              minWidth: MIN_STAFF_COL_WIDTH,
              position: "relative",
              height: GRID_HEIGHT,
            }}
          >
            {/* Slot rows (clickable bg) */}
            {timeSlots.map(({ i, h, m }) => (
              <div
                key={i}
                onClick={() => onSlotClick("", h, m)}
                style={{
                  position: "absolute",
                  top: i * SLOT_HEIGHT,
                  left: 0,
                  right: 0,
                  height: SLOT_HEIGHT,
                  borderBottom: `1px solid ${m === 0 ? "#e5e7eb" : "#f3f4f6"}`,
                  cursor: "pointer",
                }}
              />
            ))}
            {renderAppointments(appointments, "")}
          </div>
        ) : (
          <>
            {staffMembers.map((staff) => {
              const colApts = byStaff.get(staff.id) ?? [];
              return (
                <div
                  key={staff.id}
                  style={{
                    flex: 1,
                    minWidth: MIN_STAFF_COL_WIDTH,
                    position: "relative",
                    height: GRID_HEIGHT,
                    borderRight: "1px solid #e5e7eb",
                  }}
                >
                  {timeSlots.map(({ i, h, m }) => (
                    <div
                      key={i}
                      onClick={() => onSlotClick(staff.id, h, m)}
                      style={{
                        position: "absolute",
                        top: i * SLOT_HEIGHT,
                        left: 0,
                        right: 0,
                        height: SLOT_HEIGHT,
                        borderBottom: `1px solid ${m === 0 ? "#e5e7eb" : "#f3f4f6"}`,
                        cursor: "pointer",
                      }}
                    />
                  ))}
                  {renderAppointments(colApts, staff.id)}
                </div>
              );
            })}
            {hasUnassigned && (
              <div
                style={{
                  flex: 1,
                  minWidth: MIN_STAFF_COL_WIDTH,
                  position: "relative",
                  height: GRID_HEIGHT,
                  borderLeft: "1px solid #e5e7eb",
                }}
              >
                {timeSlots.map(({ i, h, m }) => (
                  <div
                    key={i}
                    onClick={() => onSlotClick("", h, m)}
                    style={{
                      position: "absolute",
                      top: i * SLOT_HEIGHT,
                      left: 0,
                      right: 0,
                      height: SLOT_HEIGHT,
                      borderBottom: `1px solid ${m === 0 ? "#e5e7eb" : "#f3f4f6"}`,
                      cursor: "pointer",
                    }}
                  />
                ))}
                {renderAppointments(unassigned, "")}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── SchedulePageClient (main) ─────────────────────────────────────────────────

export function SchedulePageClient({ initialAppointments, staffMembers, services, locations }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>(initialAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [prefilledStaffId, setPrefilledStaffId] = useState<string>("");
  const [prefilledDateTime, setPrefilledDateTime] = useState<string>("");
  const [, startTransition] = useTransition();

  const isToday = selectedDate === getTodayString();

  // Mount check (for portals)
  useEffect(() => {
    setMounted(true);
  }, []);

  // App-shell override: remove padding, make flex column
  useEffect(() => {
    const main = document.querySelector(".app-shell__main");
    main?.classList.add("app-shell__main--schedule");
    return () => main?.classList.remove("app-shell__main--schedule");
  }, []);

  const fetchAppointments = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/clinic/appointments-by-date?date=${date}`);
      if (!res.ok) return;
      const json = (await res.json()) as { appointments: AppointmentWithRelations[] };
      setAppointments(json.appointments);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchAppointments(selectedDate);
  }, [selectedDate, fetchAppointments]);

  const navigateDate = (delta: number) => {
    const next = delta === 0 ? getTodayString() : navigateDateStr(selectedDate, delta);
    setSelectedDate(next);
    setSelectedAppointment(null);
  };

  const handleAppointmentClick = (apt: AppointmentWithRelations) => {
    setSelectedAppointment(apt);
  };

  const handleSlotClick = (staffId: string, hour: number, minute: number) => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d, hour, minute);
    const pad = (n: number) => String(n).padStart(2, "0");
    const dtStr = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    setPrefilledStaffId(staffId);
    setPrefilledDateTime(dtStr);
    setShowAddModal(true);
  };

  const handleAddClick = () => {
    setPrefilledStaffId("");
    setPrefilledDateTime("");
    setShowAddModal(true);
  };

  const onAddSuccess = () => {
    startTransition(() => {
      fetchAppointments(selectedDate);
      router.refresh();
    });
  };

  return (
    <div className="schedule-root" style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff" }}>
      {/* ── Top header (sticky) ── */}
      <div
        style={{
          flexShrink: 0,
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "0.65rem 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        {/* Single row: back + date nav + count + add button */}
        <Link
          href="/clinic"
          style={{ color: "#9ca3af", fontSize: "0.8rem", textDecoration: "none", fontWeight: 500, flexShrink: 0 }}
        >
          ←
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", flex: 1 }}>
          <button
            onClick={() => navigateDate(-1)}
            style={{
              background: "none",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              padding: "0.3rem 0.65rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontFamily: "inherit",
            }}
          >
            ←
          </button>
          <span style={{ fontWeight: 600, fontSize: "0.95rem", minWidth: 220, textAlign: "center" }}>
            {formatMongolianDate(selectedDate)}
          </span>
          <button
            onClick={() => navigateDate(1)}
            style={{
              background: "none",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              padding: "0.3rem 0.65rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontFamily: "inherit",
            }}
          >
            →
          </button>
          {!isToday && (
            <button
              onClick={() => navigateDate(0)}
              style={{
                background: "#6366f1",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "0.3rem 0.75rem",
                cursor: "pointer",
                fontSize: "0.82rem",
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              Өнөөдөр
            </button>
          )}

          <span
            style={{
              marginLeft: "0.25rem",
              background: "#f3f4f6",
              borderRadius: "10px",
              padding: "0.15rem 0.65rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#6b7280",
            }}
          >
            {appointments.length} захиалга
          </span>

          <button
            onClick={handleAddClick}
            style={{
              marginLeft: "auto",
              background: "#6366f1",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "0.45rem 1rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            + Захиалга нэмэх
          </button>
        </div>
      </div>  {/* end single-row header */}

      {/* ── Full-width day grid (scrollable) ── */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
        {appointments.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
              padding: "4rem 1rem",
              color: "#9ca3af",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "3rem" }}>📅</span>
            <p style={{ margin: 0, fontSize: "1rem", color: "#6b7280" }}>Энэ өдрийн захиалга байхгүй байна</p>
          </div>
        )}
        {(appointments.length > 0 || staffMembers.length > 0) && (
          <DayGridCalendar
            appointments={appointments}
            staffMembers={staffMembers}
            selectedDate={selectedDate}
            selectedAppointmentId={selectedAppointment?.id ?? null}
            onAppointmentClick={handleAppointmentClick}
            onSlotClick={handleSlotClick}
          />
        )}
      </div>

      {/* ── Modals (portals) ── */}
      {mounted && showAddModal &&
        createPortal(
          <AddModal
            services={services}
            staffMembers={staffMembers}
            locations={locations}
            prefilledStaffId={prefilledStaffId}
            prefilledDateTime={prefilledDateTime}
            onClose={() => setShowAddModal(false)}
            onSuccess={onAddSuccess}
          />,
          document.body
        )}

      {mounted && selectedAppointment &&
        createPortal(
          <DetailModal
            appointment={selectedAppointment}
            onClose={() => setSelectedAppointment(null)}
          />,
          document.body
        )}
    </div>
  );
}
