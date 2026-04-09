"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import {
  updateStaffMemberAction,
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

export function EditStaffMemberForm({
  staff,
  onCancel
}: {
  staff: {
    id: string;
    full_name: string;
    role: string;
    specialty: string | null;
    phone: string | null;
    email: string | null;
  };
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateStaffMemberAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack" style={{ padding: "var(--space-4)", border: "1px solid var(--ui-border)", borderRadius: "var(--radius-md)" }}>
      <input type="hidden" name="staffMemberId" value={staff.id} />
      <div>
        <label className="ui-label" htmlFor={`staff-name-${staff.id}`}>
          Нэр
        </label>
        <Input id={`staff-name-${staff.id}`} name="fullName" defaultValue={staff.full_name} required maxLength={120} />
      </div>
      <div>
        <label className="ui-label" htmlFor={`staff-role-${staff.id}`}>
          Role
        </label>
        <select id={`staff-role-${staff.id}`} name="role" className="ui-input" defaultValue={staff.role}>
          {ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="ui-label" htmlFor={`staff-specialty-${staff.id}`}>
          Specialty
        </label>
        <Input id={`staff-specialty-${staff.id}`} name="specialty" defaultValue={staff.specialty ?? ""} maxLength={120} />
      </div>
      <div>
        <label className="ui-label" htmlFor={`staff-phone-${staff.id}`}>
          Утас
        </label>
        <Input id={`staff-phone-${staff.id}`} name="phone" defaultValue={staff.phone ?? ""} maxLength={40} />
      </div>
      <div>
        <label className="ui-label" htmlFor={`staff-email-${staff.id}`}>
          И-мэйл
        </label>
        <Input id={`staff-email-${staff.id}`} name="email" type="email" defaultValue={staff.email ?? ""} maxLength={120} />
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Хадгалж байна..." : "Хадгалах"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Цуцлах
        </Button>
      </div>

      {state.error ? <p className="ui-inline-feedback ui-inline-feedback--error">{state.error}</p> : null}
      {state.message ? <p className="ui-inline-feedback ui-inline-feedback--success">{state.message}</p> : null}
    </form>
  );
}
