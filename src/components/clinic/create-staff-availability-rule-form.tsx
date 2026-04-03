"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import {
  createStaffAvailabilityRuleAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";
import type { ClinicLocationRow, StaffMemberRow } from "@/modules/clinic/types";

const initialState: ClinicSetupActionState = {};

const WEEKDAYS = [
  { value: 1, label: "Даваа" },
  { value: 2, label: "Мягмар" },
  { value: 3, label: "Лхагва" },
  { value: 4, label: "Пүрэв" },
  { value: 5, label: "Баасан" },
  { value: 6, label: "Бямба" },
  { value: 0, label: "Ням" }
];

export function CreateStaffAvailabilityRuleForm({
  staffMembers,
  locations
}: {
  staffMembers: StaffMemberRow[];
  locations: ClinicLocationRow[];
}) {
  const [state, formAction, pending] = useActionState(createStaffAvailabilityRuleAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack">
      <div>
        <label className="ui-label" htmlFor="availabilityStaffMemberId">
          Ажилтан
        </label>
        <select id="availabilityStaffMemberId" name="staffMemberId" className="ui-input" defaultValue="" required>
          <option value="" disabled>
            Ажилтан сонгоно уу
          </option>
          {staffMembers.map((staffMember) => (
            <option key={staffMember.id} value={staffMember.id}>
              {staffMember.full_name} · {staffMember.role}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="ui-label" htmlFor="availabilityLocationId">
          Салбар
        </label>
        <select id="availabilityLocationId" name="locationId" className="ui-input" defaultValue="">
          <option value="">Бүх салбарт</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="ui-label" htmlFor="availabilityWeekday">
          Өдөр
        </label>
        <select id="availabilityWeekday" name="weekday" className="ui-input" defaultValue="1" required>
          {WEEKDAYS.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <div>
          <label className="ui-label" htmlFor="availabilityStartLocal">
            Эхлэх цаг
          </label>
          <Input id="availabilityStartLocal" name="startLocal" type="time" defaultValue="09:00" required />
        </div>
        <div>
          <label className="ui-label" htmlFor="availabilityEndLocal">
            Дуусах цаг
          </label>
          <Input id="availabilityEndLocal" name="endLocal" type="time" defaultValue="18:00" required />
        </div>
      </div>

      <Button type="submit" variant="secondary" disabled={pending || staffMembers.length === 0}>
        {pending ? "Хадгалж байна..." : "Availability rule хадгалах"}
      </Button>

      {state.error ? <p className="ui-inline-feedback ui-inline-feedback--error">{state.error}</p> : null}
      {state.message ? <p className="ui-inline-feedback ui-inline-feedback--success">{state.message}</p> : null}
    </form>
  );
}
