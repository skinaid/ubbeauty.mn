"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { ClinicSplitLayout } from "@/components/ui";
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
import Link from "next/link";

// ── helpers ─────────────────────────────────────────────────────────────────

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatMongolianDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD — parse as local midnight to avoid UTC offset issues
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

// ── status config ────────────────────────────────────────────────────────────

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

// ── time grid constants ──────────────────────────────────────────────────────

const SLOT_HEIGHT = 48; // px per 30-min slot
const GRID_START_HOUR = 8; // 08:00
const GRID_END_HOUR = 20; // 20:00
const TOTAL_SLOTS = (GRID_END_HOUR - GRID_START_HOUR) * 2; // 24 slots

function minutesSinceGridStart(dateStr: string): number {
  const d = new Date(dateStr);
  return (d.getHours() - GRID_START_HOUR) * 60 + d.getMinutes();
}

// ── types ────────────────────────────────────────────────────────────────────

type Props = {
  initialAppointments: AppointmentWithRelations[];
  staffMembers: StaffMemberRow[];
  services: ServiceRow[];
  locations: ClinicLocationRow[];
};

// ── main component ───────────────────────────────────────────────────────────

export function SchedulePageClient({ initialAppointments, staffMembers, services, locations }: Props) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>(initialAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [, startTransition] = useTransition();

  // Prefill state for the add form when clicking an empty slot
  const [prefilledStaffId, setPrefilledStaffId] = useState<string>("");
  const [prefilledDateTime, setPrefilledDateTime] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"left" | "right">("left");

  const isToday = selectedDate === getTodayString();

  const fetchAppointments = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/clinic/appointments-by-date?date=${date}`);
      if (!res.ok) return;
      const json = (await res.json()) as { appointments: AppointmentWithRelations[] };
      setAppointments(json.appointments);
    } catch {
      // silently fail — keep previous data
    }
  }, []);

  useEffect(() => {
    fetchAppointments(selectedDate);
  }, [selectedDate, fetchAppointments]);

  const navigateDate = (delta: number) => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const next = new Date(y, m - 1, d + delta);
    const str = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    setSelectedDate(str);
    setSelectedAppointment(null);
  };

  const handleAppointmentClick = (apt: AppointmentWithRelations) => {
    setSelectedAppointment(apt);
    setActiveTab("right");
  };

  const handleSlotClick = (staffId: string, hour: number, minute: number) => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d, hour, minute);
    const pad = (n: number) => String(n).padStart(2, "0");
    const dtStr = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    setPrefilledStaffId(staffId);
    setPrefilledDateTime(dtStr);
    setSelectedAppointment(null);
    setActiveTab("right");
  };

  const onAddSuccess = () => {
    startTransition(() => {
      fetchAppointments(selectedDate);
      router.refresh();
    });
  };

  const leftPanel = (
    <ScheduleLeftPanel
      selectedDate={selectedDate}
      isToday={isToday}
      appointments={appointments}
      staffMembers={staffMembers}
      onNavigate={navigateDate}
      onAppointmentClick={handleAppointmentClick}
      onSlotClick={handleSlotClick}
      onAddClick={() => {
        setSelectedAppointment(null);
        setPrefilledStaffId("");
        setPrefilledDateTime("");
        setActiveTab("right");
      }}
      selectedAppointmentId={selectedAppointment?.id ?? null}
    />
  );

  const rightPanel = selectedAppointment ? (
    <ScheduleDetailPanel
      appointment={selectedAppointment}
      onBack={() => setSelectedAppointment(null)}
    />
  ) : (
    <ScheduleAddPanel
      services={services}
      staffMembers={staffMembers}
      locations={locations}
      prefilledStaffId={prefilledStaffId}
      prefilledDateTime={prefilledDateTime}
      onSuccess={onAddSuccess}
    />
  );

  return (
    <ClinicSplitLayout
      backHref="/clinic"
      title="Цаг захиалга"
      subtitle="Өдрийн цагийн хуваарь, захиалга бүртгэл"
      leftTabLabel="📅 Хуваарь"
      rightTabLabel="✦ Захиалга"
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  );
}

// ── ScheduleLeftPanel ────────────────────────────────────────────────────────

function ScheduleLeftPanel({
  selectedDate,
  isToday,
  appointments,
  staffMembers,
  onNavigate,
  onAppointmentClick,
  onSlotClick,
  onAddClick,
  selectedAppointmentId,
}: {
  selectedDate: string;
  isToday: boolean;
  appointments: AppointmentWithRelations[];
  staffMembers: StaffMemberRow[];
  onNavigate: (delta: number) => void;
  onAppointmentClick: (apt: AppointmentWithRelations) => void;
  onSlotClick: (staffId: string, hour: number, minute: number) => void;
  onAddClick: () => void;
  selectedAppointmentId: string | null;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--color-surface, #fff)",
          borderBottom: "1px solid var(--color-border, #e5e7eb)",
          padding: "0.75rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {/* Date navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => onNavigate(-1)}
            style={{
              background: "none",
              border: "1px solid var(--color-border, #e5e7eb)",
              borderRadius: "6px",
              padding: "0.3rem 0.6rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            ← Өмнөх
          </button>
          <button
            onClick={() => onNavigate(0) /* reset to today */}
            disabled={isToday}
            style={{
              background: isToday ? "#6366f1" : "none",
              color: isToday ? "#fff" : "inherit",
              border: "1px solid var(--color-border, #e5e7eb)",
              borderRadius: "6px",
              padding: "0.3rem 0.75rem",
              cursor: isToday ? "default" : "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            Өнөөдөр
          </button>
          <button
            onClick={() => onNavigate(1)}
            style={{
              background: "none",
              border: "1px solid var(--color-border, #e5e7eb)",
              borderRadius: "6px",
              padding: "0.3rem 0.6rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Дараа →
          </button>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.8rem",
              background: "#6366f1",
              color: "#fff",
              borderRadius: "12px",
              padding: "0.15rem 0.6rem",
              fontWeight: 600,
            }}
          >
            {appointments.length} захиалга
          </span>
        </div>

        {/* Date display + add button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{formatMongolianDate(selectedDate)}</span>
          <button
            onClick={onAddClick}
            style={{
              background: "#6366f1",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "0.4rem 0.85rem",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            + Захиалга нэмэх
          </button>
        </div>
      </div>

      {/* Day view body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {appointments.length === 0 && (
          <EmptyDayState onAddClick={onAddClick} />
        )}
        {staffMembers.length > 0 ? (
          <DayGridView
            appointments={appointments}
            staffMembers={staffMembers}
            selectedDate={selectedDate}
            onAppointmentClick={onAppointmentClick}
            onSlotClick={onSlotClick}
            selectedAppointmentId={selectedAppointmentId}
          />
        ) : (
          <AppointmentListView
            appointments={appointments}
            onAppointmentClick={onAppointmentClick}
            selectedAppointmentId={selectedAppointmentId}
          />
        )}
      </div>
    </div>
  );
}

// ── EmptyDayState ─────────────────────────────────────────────────────────────

function EmptyDayState({ onAddClick }: { onAddClick: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "3rem 1rem",
        color: "var(--color-text-muted, #6b7280)",
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: "2.5rem" }}>📅</span>
      <p style={{ margin: 0, fontSize: "1rem" }}>Өнөөдөр захиалга байхгүй байна</p>
      <button
        onClick={onAddClick}
        style={{
          background: "#6366f1",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          padding: "0.5rem 1.25rem",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "0.875rem",
        }}
      >
        + Шинэ захиалга нэмэх
      </button>
    </div>
  );
}

// ── DayGridView ───────────────────────────────────────────────────────────────

function DayGridView({
  appointments,
  staffMembers,
  selectedDate,
  onAppointmentClick,
  onSlotClick,
  selectedAppointmentId,
}: {
  appointments: AppointmentWithRelations[];
  staffMembers: StaffMemberRow[];
  selectedDate: string;
  onAppointmentClick: (apt: AppointmentWithRelations) => void;
  onSlotClick: (staffId: string, hour: number, minute: number) => void;
  selectedAppointmentId: string | null;
}) {
  const TIME_COL_WIDTH = 54;
  const STAFF_COL_WIDTH = 140;
  const totalGridHeight = TOTAL_SLOTS * SLOT_HEIGHT;

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

  // Include a column for unassigned if any
  const hasUnassigned = unassigned.length > 0;

  return (
    <div style={{ overflowX: "auto", minWidth: 0 }}>
      {/* Header row: time + staff columns */}
      <div
        style={{
          display: "flex",
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "var(--color-surface, #fff)",
          borderBottom: "1px solid var(--color-border, #e5e7eb)",
        }}
      >
        {/* Time column header */}
        <div
          style={{
            width: TIME_COL_WIDTH,
            minWidth: TIME_COL_WIDTH,
            flexShrink: 0,
            padding: "0.5rem 0.25rem",
            fontSize: "0.7rem",
            color: "var(--color-text-muted, #6b7280)",
            borderRight: "1px solid var(--color-border, #e5e7eb)",
          }}
        />
        {/* Staff columns */}
        {staffMembers.map((staff) => (
          <div
            key={staff.id}
            style={{
              width: STAFF_COL_WIDTH,
              minWidth: STAFF_COL_WIDTH,
              flexShrink: 0,
              padding: "0.5rem 0.25rem",
              borderRight: "1px solid var(--color-border, #e5e7eb)",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "#6366f1",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {staff.full_name.charAt(0).toUpperCase()}
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {staff.full_name}
            </span>
          </div>
        ))}
        {hasUnassigned && (
          <div
            style={{
              width: STAFF_COL_WIDTH,
              minWidth: STAFF_COL_WIDTH,
              flexShrink: 0,
              padding: "0.5rem 0.25rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--color-text-muted, #6b7280)",
            }}
          >
            Ажилтангүй
          </div>
        )}
      </div>

      {/* Grid body */}
      <div style={{ display: "flex", position: "relative" }}>
        {/* Time labels */}
        <div
          style={{
            width: TIME_COL_WIDTH,
            minWidth: TIME_COL_WIDTH,
            flexShrink: 0,
            position: "relative",
            height: totalGridHeight,
            borderRight: "1px solid var(--color-border, #e5e7eb)",
          }}
        >
          {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
            const totalMins = GRID_START_HOUR * 60 + i * 30;
            const h = Math.floor(totalMins / 60);
            const m = totalMins % 60;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: i * SLOT_HEIGHT,
                  left: 0,
                  right: 0,
                  height: SLOT_HEIGHT,
                  borderBottom: "1px solid var(--color-border, #f0f0f0)",
                  display: "flex",
                  alignItems: "flex-start",
                  paddingTop: "2px",
                  paddingLeft: "4px",
                }}
              >
                {m === 0 && (
                  <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted, #9ca3af)", fontWeight: 600 }}>
                    {String(h).padStart(2, "0")}:00
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Staff columns */}
        {staffMembers.map((staff) => {
          const staffApts = byStaff.get(staff.id) ?? [];
          return (
            <StaffColumn
              key={staff.id}
              staffId={staff.id}
              appointments={staffApts}
              totalGridHeight={totalGridHeight}
              colWidth={STAFF_COL_WIDTH}
              selectedDate={selectedDate}
              onAppointmentClick={onAppointmentClick}
              onSlotClick={onSlotClick}
              selectedAppointmentId={selectedAppointmentId}
            />
          );
        })}

        {/* Unassigned column */}
        {hasUnassigned && (
          <StaffColumn
            staffId=""
            appointments={unassigned}
            totalGridHeight={totalGridHeight}
            colWidth={STAFF_COL_WIDTH}
            selectedDate={selectedDate}
            onAppointmentClick={onAppointmentClick}
            onSlotClick={onSlotClick}
            selectedAppointmentId={selectedAppointmentId}
          />
        )}
      </div>
    </div>
  );
}

// ── StaffColumn ───────────────────────────────────────────────────────────────

function StaffColumn({
  staffId,
  appointments,
  totalGridHeight,
  colWidth,
  selectedDate,
  onAppointmentClick,
  onSlotClick,
  selectedAppointmentId,
}: {
  staffId: string;
  appointments: AppointmentWithRelations[];
  totalGridHeight: number;
  colWidth: number;
  selectedDate: string;
  onAppointmentClick: (apt: AppointmentWithRelations) => void;
  onSlotClick: (staffId: string, hour: number, minute: number) => void;
  selectedAppointmentId: string | null;
}) {
  return (
    <div
      style={{
        width: colWidth,
        minWidth: colWidth,
        flexShrink: 0,
        position: "relative",
        height: totalGridHeight,
        borderRight: "1px solid var(--color-border, #e5e7eb)",
      }}
    >
      {/* Background slot rows (clickable) */}
      {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
        const totalMins = GRID_START_HOUR * 60 + i * 30;
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        return (
          <div
            key={i}
            onClick={() => onSlotClick(staffId, h, m)}
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
        );
      })}

      {/* Appointment blocks */}
      {appointments.map((apt) => {
        const mins = minutesSinceGridStart(apt.scheduled_start);
        const duration = apt.duration_minutes ?? apt.service?.duration_minutes ?? 30;
        const top = (mins / 30) * SLOT_HEIGHT;
        const height = Math.max((duration / 30) * SLOT_HEIGHT, SLOT_HEIGHT * 0.5);
        const color = STATUS_COLORS[apt.status] ?? "#6366f1";
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
              top,
              left: 3,
              right: 3,
              height,
              background: color,
              opacity: isSelected ? 1 : 0.88,
              borderRadius: 6,
              padding: "3px 6px",
              cursor: "pointer",
              overflow: "hidden",
              boxShadow: isSelected ? `0 0 0 2px #1e1b4b, 0 2px 8px rgba(0,0,0,0.25)` : `0 1px 3px rgba(0,0,0,0.15)`,
              zIndex: isSelected ? 2 : 1,
              transition: "box-shadow 0.15s",
              display: "flex",
              flexDirection: "column",
              gap: "1px",
            }}
          >
            <span
              style={{
                color: "#fff",
                fontSize: "0.7rem",
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {apt.patient?.full_name ?? "Patient"}
            </span>
            {height >= SLOT_HEIGHT && (
              <span
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontSize: "0.62rem",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {apt.service?.name ?? ""}
              </span>
            )}
            {/* Status dot */}
            <span
              style={{
                position: "absolute",
                top: 3,
                right: 4,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.7)",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── AppointmentListView (fallback when no staff) ──────────────────────────────

function AppointmentListView({
  appointments,
  onAppointmentClick,
  selectedAppointmentId,
}: {
  appointments: AppointmentWithRelations[];
  onAppointmentClick: (apt: AppointmentWithRelations) => void;
  selectedAppointmentId: string | null;
}) {
  if (appointments.length === 0) return null;
  return (
    <ul style={{ margin: 0, padding: "0.5rem", listStyle: "none", display: "grid", gap: "0.5rem" }}>
      {appointments.map((apt) => {
        const color = STATUS_COLORS[apt.status] ?? "#6366f1";
        const isSelected = apt.id === selectedAppointmentId;
        return (
          <li
            key={apt.id}
            onClick={() => onAppointmentClick(apt)}
            style={{
              borderLeft: `4px solid ${color}`,
              padding: "0.6rem 0.75rem",
              borderRadius: "6px",
              background: isSelected ? "rgba(99,102,241,0.06)" : "var(--color-surface-secondary, #f9fafb)",
              cursor: "pointer",
              display: "grid",
              gap: "0.2rem",
              boxShadow: isSelected ? "0 0 0 2px #6366f1" : "none",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>{apt.patient?.full_name ?? "Patient"}</span>
            <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted, #6b7280)" }}>
              {formatTime(apt.scheduled_start)} · {apt.service?.name ?? "Үйлчилгээ"}
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                color: "#fff",
                background: color,
                borderRadius: "10px",
                padding: "0.1rem 0.4rem",
                width: "fit-content",
              }}
            >
              {STATUS_LABELS[apt.status] ?? apt.status}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ── ScheduleAddPanel ──────────────────────────────────────────────────────────

const addInitialState: ClinicSetupActionState = {};

function ScheduleAddPanel({
  services,
  staffMembers,
  locations,
  prefilledStaffId,
  prefilledDateTime,
  onSuccess,
}: {
  services: ServiceRow[];
  staffMembers: StaffMemberRow[];
  locations: ClinicLocationRow[];
  prefilledStaffId: string;
  prefilledDateTime: string;
  onSuccess: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createAdminAppointmentAction, addInitialState);

  // Call onSuccess when state.message is set (indicating success)
  const prevMessageRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (state.message && state.message !== prevMessageRef.current) {
      prevMessageRef.current = state.message;
      formRef.current?.reset();
      onSuccess();
    }
  }, [state.message, onSuccess]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.45rem 0.6rem",
    border: "1px solid var(--color-border, #e5e7eb)",
    borderRadius: "6px",
    fontSize: "0.875rem",
    boxSizing: "border-box",
    background: "var(--color-surface, #fff)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--color-text-muted, #6b7280)",
    display: "block",
    marginBottom: "0.2rem",
  };

  return (
    <div style={{ padding: "1.25rem" }}>
      <h2 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: 700 }}>Шинэ захиалга</h2>
      <form ref={formRef} action={formAction} style={{ display: "grid", gap: "0.85rem" }}>
        <input type="hidden" name="source" value="admin" />

        <label style={labelStyle}>
          Patient нэр *
          <input name="fullName" required placeholder="Бат-Эрдэнэ" style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Утас *
          <input name="phone" required type="tel" placeholder="+976 9900 0000" style={inputStyle} />
        </label>

        <label style={labelStyle}>
          И-мэйл
          <input name="email" type="email" placeholder="example@mail.com" style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Үйлчилгээ *
          <select name="serviceId" required style={inputStyle}>
            <option value="">— Сонгоно уу —</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Цаг *
          <input
            name="scheduledStart"
            required
            type="datetime-local"
            defaultValue={prefilledDateTime}
            key={prefilledDateTime}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Ажилтан
          <select name="staffMemberId" style={inputStyle} defaultValue={prefilledStaffId} key={prefilledStaffId}>
            <option value="">— Сонгоогүй —</option>
            {staffMembers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Байршил
          <select name="locationId" style={inputStyle}>
            <option value="">— Сонгоогүй —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Тэмдэглэл
          <textarea
            name="internalNotes"
            rows={3}
            placeholder="Дотоод тэмдэглэл..."
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </label>

        {state.error && (
          <p style={{ margin: 0, color: "#ef4444", fontSize: "0.82rem", fontWeight: 600 }}>{state.error}</p>
        )}
        {state.message && (
          <p style={{ margin: 0, color: "#059669", fontSize: "0.82rem", fontWeight: 600 }}>{state.message}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{
            background: pending ? "#a5b4fc" : "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "0.6rem 1.25rem",
            fontSize: "0.9rem",
            fontWeight: 700,
            cursor: pending ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {pending ? "Бүртгэж байна..." : "Захиалга бүртгэх"}
        </button>
      </form>
    </div>
  );
}

// ── ScheduleDetailPanel ───────────────────────────────────────────────────────

function ScheduleDetailPanel({
  appointment,
  onBack,
}: {
  appointment: AppointmentWithRelations;
  onBack: () => void;
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

  return (
    <div style={{ padding: "1.25rem", display: "grid", gap: "1.25rem" }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#6366f1",
          fontWeight: 600,
          fontSize: "0.875rem",
          padding: 0,
          textAlign: "left",
        }}
      >
        ← Буцах
      </button>

      {/* Patient info */}
      <div style={{ display: "grid", gap: "0.35rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
          {appointment.patient?.full_name ?? "Patient"}
        </h2>
        {appointment.patient?.phone && (
          <a
            href={`tel:${appointment.patient.phone}`}
            style={{ color: "#6366f1", fontSize: "0.9rem", textDecoration: "none" }}
          >
            📞 {appointment.patient.phone}
          </a>
        )}
      </div>

      {/* Service & time */}
      <div
        style={{
          background: "var(--color-surface-secondary, #f9fafb)",
          borderRadius: "8px",
          padding: "0.85rem",
          display: "grid",
          gap: "0.4rem",
        }}
      >
        <DetailRow label="Үйлчилгээ" value={appointment.service?.name ?? "—"} />
        <DetailRow label="Үргэлжлэх хугацаа" value={`${appointment.duration_minutes ?? appointment.service?.duration_minutes ?? "—"} мин`} />
        <DetailRow label="Цаг" value={formatDateTime(appointment.scheduled_start)} />
        {appointment.staff_member?.full_name && (
          <DetailRow label="Ажилтан" value={appointment.staff_member.full_name} />
        )}
        {appointment.location?.name && (
          <DetailRow label="Байршил" value={appointment.location.name} />
        )}
      </div>

      {/* Status & source badges */}
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
            background: "var(--color-surface-secondary, #f3f4f6)",
            borderRadius: "12px",
            padding: "0.2rem 0.75rem",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--color-text-muted, #6b7280)",
          }}
        >
          {SOURCE_LABELS[appointment.source ?? ""] ?? appointment.source ?? "—"}
        </span>
      </div>

      {/* Internal notes */}
      {appointment.internal_notes && (
        <div>
          <p style={{ margin: "0 0 0.25rem", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-text-muted, #6b7280)" }}>
            Тэмдэглэл
          </p>
          <p
            style={{
              margin: 0,
              background: "var(--color-surface-secondary, #f9fafb)",
              borderRadius: "6px",
              padding: "0.6rem",
              fontSize: "0.875rem",
            }}
          >
            {appointment.internal_notes}
          </p>
        </div>
      )}

      {/* Status action buttons */}
      {nextStatuses.length > 0 && (
        <div>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-text-muted, #6b7280)" }}>
            Статус шилжүүлэх
          </p>
          <AppointmentStatusActions
            appointmentId={appointment.id}
            nextStatuses={nextStatuses}
          />
        </div>
      )}

      {/* POS handoff section */}
      {handoffState && (
        <div
          style={{
            background: "var(--color-surface-secondary, #f0f9ff)",
            border: "1px solid #bae6fd",
            borderRadius: "8px",
            padding: "0.85rem",
            display: "grid",
            gap: "0.5rem",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: "#0369a1" }}>POS / Billing холбоос</p>
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
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #6b7280)" }}>
              {handoffState.message}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── DetailRow helper ──────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between", fontSize: "0.85rem" }}>
      <span style={{ color: "var(--color-text-muted, #6b7280)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}
