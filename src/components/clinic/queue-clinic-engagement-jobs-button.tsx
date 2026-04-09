"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  queueClinicEngagementJobsAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function QueueClinicEngagementJobsButton() {
  const [state, formAction, pending] = useActionState(queueClinicEngagementJobsAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack" style={{ gap: "0.45rem" }}>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Queue бэлдэж байна..." : "Reminder queue refresh"}
      </Button>
      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span> : null}
    </form>
  );
}
