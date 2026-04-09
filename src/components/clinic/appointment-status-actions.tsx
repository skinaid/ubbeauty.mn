"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  transitionAppointmentStatusAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";
import type { AppointmentStatus } from "@/modules/clinic/types";

const initialState: ClinicSetupActionState = {};

const LABELS: Record<AppointmentStatus, string> = {
  booked: "Booked",
  confirmed: "Confirmed",
  arrived: "Arrived",
  in_progress: "In progress",
  completed: "Completed",
  canceled: "Canceled",
  no_show: "No-show"
};

export function AppointmentStatusActions({
  appointmentId,
  nextStatuses
}: {
  appointmentId: string;
  nextStatuses: AppointmentStatus[];
}) {
  const [state, formAction, pending] = useActionState(transitionAppointmentStatusAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack" style={{ gap: "0.5rem" }}>
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {nextStatuses.map((status) => (
          <Button
            key={status}
            type="submit"
            name="nextStatus"
            value={status}
            variant={status === "completed" ? "primary" : "secondary"}
            size="sm"
            disabled={pending}
          >
            {LABELS[status]}
          </Button>
        ))}
      </div>
      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span> : null}
    </form>
  );
}
