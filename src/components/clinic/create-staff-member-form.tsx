"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import {
  createStaffMemberAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

const ROLES = [
  { value: "provider", label: "Provider" },
  { value: "front_desk", label: "Front desk" },
  { value: "manager", label: "Manager" },
  { value: "assistant", label: "Assistant" },
  { value: "billing", label: "Billing" }
];

export function CreateStaffMemberForm() {
  const [state, formAction, pending] = useActionState(createStaffMemberAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack">
      <div>
        <label className="ui-label" htmlFor="staff-name">
          Нэр
        </label>
        <Input id="staff-name" name="fullName" required maxLength={120} />
      </div>
      <div>
        <label className="ui-label" htmlFor="staff-role">
          Role
        </label>
        <select id="staff-role" name="role" className="ui-input" defaultValue="provider">
          {ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="ui-label" htmlFor="staff-specialty">
          Specialty
        </label>
        <Input id="staff-specialty" name="specialty" maxLength={120} />
      </div>
      <div>
        <label className="ui-label" htmlFor="staff-phone">
          Утас
        </label>
        <Input id="staff-phone" name="phone" maxLength={40} />
      </div>
      <div>
        <label className="ui-label" htmlFor="staff-email">
          И-мэйл
        </label>
        <Input id="staff-email" name="email" type="email" maxLength={120} />
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Хадгалж байна..." : "Ажилтан нэмэх"}
      </Button>
      {state.error ? <p className="ui-inline-feedback ui-inline-feedback--error">{state.error}</p> : null}
      {state.message ? <p className="ui-inline-feedback ui-inline-feedback--success">{state.message}</p> : null}
    </form>
  );
}
