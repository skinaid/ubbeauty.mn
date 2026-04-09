"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import {
  createClinicLocationAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function CreateClinicLocationForm() {
  const [state, formAction, pending] = useActionState(createClinicLocationAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack">
      <div>
        <label className="ui-label" htmlFor="location-name">
          Салбарын нэр
        </label>
        <Input id="location-name" name="name" required maxLength={120} />
      </div>
      <div>
        <label className="ui-label" htmlFor="location-district">
          Дүүрэг
        </label>
        <Input id="location-district" name="district" maxLength={120} />
      </div>
      <div>
        <label className="ui-label" htmlFor="location-address">
          Хаяг
        </label>
        <Input id="location-address" name="addressLine1" maxLength={180} />
      </div>
      <div>
        <label className="ui-label" htmlFor="location-phone">
          Утас
        </label>
        <Input id="location-phone" name="phone" maxLength={40} />
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Хадгалж байна..." : "Салбар нэмэх"}
      </Button>
      {state.error ? <p className="ui-inline-feedback ui-inline-feedback--error">{state.error}</p> : null}
      {state.message ? <p className="ui-inline-feedback ui-inline-feedback--success">{state.message}</p> : null}
    </form>
  );
}
