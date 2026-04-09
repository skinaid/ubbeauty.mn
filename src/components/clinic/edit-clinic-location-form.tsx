"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import {
  updateClinicLocationAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function EditClinicLocationForm({
  location,
  onCancel
}: {
  location: {
    id: string;
    name: string;
    district: string | null;
    address_line1: string | null;
    phone: string | null;
  };
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateClinicLocationAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack" style={{ padding: "var(--space-4)", border: "1px solid var(--ui-border)", borderRadius: "var(--radius-md)" }}>
      <input type="hidden" name="locationId" value={location.id} />
      <div>
        <label className="ui-label" htmlFor={`location-name-${location.id}`}>
          Салбарын нэр
        </label>
        <Input id={`location-name-${location.id}`} name="name" defaultValue={location.name} required maxLength={120} />
      </div>
      <div>
        <label className="ui-label" htmlFor={`location-district-${location.id}`}>
          Дүүрэг
        </label>
        <Input id={`location-district-${location.id}`} name="district" defaultValue={location.district ?? ""} maxLength={120} />
      </div>
      <div>
        <label className="ui-label" htmlFor={`location-address-${location.id}`}>
          Хаяг
        </label>
        <Input id={`location-address-${location.id}`} name="addressLine1" defaultValue={location.address_line1 ?? ""} maxLength={180} />
      </div>
      <div>
        <label className="ui-label" htmlFor={`location-phone-${location.id}`}>
          Утас
        </label>
        <Input id={`location-phone-${location.id}`} name="phone" defaultValue={location.phone ?? ""} maxLength={40} />
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
