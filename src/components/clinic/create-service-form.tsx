"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import {
  createServiceAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function CreateServiceForm() {
  const [state, formAction, pending] = useActionState(createServiceAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack">
      <div>
        <label className="ui-label" htmlFor="service-name">
          Үйлчилгээний нэр
        </label>
        <Input id="service-name" name="name" required maxLength={140} />
      </div>
      <div>
        <label className="ui-label" htmlFor="service-duration">
          Үргэлжлэх хугацаа (минут)
        </label>
        <Input id="service-duration" name="durationMinutes" type="number" min="5" step="5" defaultValue="60" />
      </div>
      <div>
        <label className="ui-label" htmlFor="service-price">
          Price from
        </label>
        <Input id="service-price" name="priceFrom" type="number" min="0" step="1000" defaultValue="0" />
      </div>
      <div>
        <label className="ui-label" htmlFor="service-description">
          Тайлбар
        </label>
        <textarea id="service-description" name="description" className="ui-input" rows={4} />
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Хадгалж байна..." : "Үйлчилгээ нэмэх"}
      </Button>
      {state.error ? <p className="ui-inline-feedback ui-inline-feedback--error">{state.error}</p> : null}
      {state.message ? <p className="ui-inline-feedback ui-inline-feedback--success">{state.message}</p> : null}
    </form>
  );
}
