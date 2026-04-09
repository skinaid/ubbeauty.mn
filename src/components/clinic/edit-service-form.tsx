"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import {
  updateServiceAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function EditServiceForm({
  service,
  onCancel
}: {
  service: {
    id: string;
    name: string;
    duration_minutes: number;
    price_from: number;
    description: string | null;
  };
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateServiceAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack" style={{ padding: "var(--space-4)", border: "1px solid var(--ui-border)", borderRadius: "var(--radius-md)" }}>
      <input type="hidden" name="serviceId" value={service.id} />
      <div>
        <label className="ui-label" htmlFor={`service-name-${service.id}`}>
          Үйлчилгээний нэр
        </label>
        <Input id={`service-name-${service.id}`} name="name" defaultValue={service.name} required maxLength={140} />
      </div>
      <div>
        <label className="ui-label" htmlFor={`service-duration-${service.id}`}>
          Үргэлжлэх хугацаа (минут)
        </label>
        <Input id={`service-duration-${service.id}`} name="durationMinutes" type="number" min="5" step="5" defaultValue={service.duration_minutes.toString()} />
      </div>
      <div>
        <label className="ui-label" htmlFor={`service-price-${service.id}`}>
          Price from
        </label>
        <Input id={`service-price-${service.id}`} name="priceFrom" type="number" min="0" step="1000" defaultValue={service.price_from.toString()} />
      </div>
      <div>
        <label className="ui-label" htmlFor={`service-description-${service.id}`}>
          Тайлбар
        </label>
        <textarea id={`service-description-${service.id}`} name="description" className="ui-input" rows={4} defaultValue={service.description ?? ""} />
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
