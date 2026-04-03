"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import {
  createAdminAppointmentAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";
import type { ClinicLocationRow, ServiceRow, StaffMemberRow } from "@/modules/clinic/types";

const initialState: ClinicSetupActionState = {};

export function CreateAdminAppointmentForm({
  services,
  staffMembers,
  locations
}: {
  services: ServiceRow[];
  staffMembers: StaffMemberRow[];
  locations: ClinicLocationRow[];
}) {
  const [state, formAction, pending] = useActionState(createAdminAppointmentAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack">
      <div>
        <label className="ui-label" htmlFor="appointment-fullName">
          Patient нэр
        </label>
        <Input id="appointment-fullName" name="fullName" required maxLength={120} />
      </div>
      <div>
        <label className="ui-label" htmlFor="appointment-phone">
          Утас
        </label>
        <Input id="appointment-phone" name="phone" required maxLength={40} />
      </div>
      <div>
        <label className="ui-label" htmlFor="appointment-email">
          И-мэйл
        </label>
        <Input id="appointment-email" name="email" type="email" maxLength={120} />
      </div>
      <div>
        <label className="ui-label" htmlFor="appointment-serviceId">
          Үйлчилгээ
        </label>
        <select id="appointment-serviceId" name="serviceId" className="ui-input" required defaultValue="">
          <option value="" disabled>
            Үйлчилгээ сонгоно уу
          </option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} · {service.duration_minutes} мин
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="ui-label" htmlFor="appointment-scheduledStart">
          Цаг
        </label>
        <Input id="appointment-scheduledStart" name="scheduledStart" type="datetime-local" required />
      </div>
      <div>
        <label className="ui-label" htmlFor="appointment-staffMemberId">
          Provider / staff
        </label>
        <select id="appointment-staffMemberId" name="staffMemberId" className="ui-input" defaultValue="">
          <option value="">Сонгоогүй</option>
          {staffMembers.map((staffMember) => (
            <option key={staffMember.id} value={staffMember.id}>
              {staffMember.full_name} · {staffMember.role}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="ui-label" htmlFor="appointment-locationId">
          Location
        </label>
        <select id="appointment-locationId" name="locationId" className="ui-input" defaultValue="">
          <option value="">Сонгоогүй</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="ui-label" htmlFor="appointment-internalNotes">
          Internal note
        </label>
        <textarea id="appointment-internalNotes" name="internalNotes" className="ui-input" rows={4} />
      </div>
      <Button type="submit" variant="primary" disabled={pending || services.length === 0}>
        {pending ? "Үүсгэж байна..." : "Admin appointment үүсгэх"}
      </Button>
      {state.error ? <p className="ui-inline-feedback ui-inline-feedback--error">{state.error}</p> : null}
      {state.message ? <p className="ui-inline-feedback ui-inline-feedback--success">{state.message}</p> : null}
    </form>
  );
}
