"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  executeDueClinicEngagementJobsAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function ExecuteDueClinicEngagementJobsButton() {
  const [state, formAction, pending] = useActionState(executeDueClinicEngagementJobsAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack" style={{ gap: "0.45rem" }}>
      <Button type="submit" variant="primary" size="sm" disabled={pending}>
        {pending ? "Due jobs боловсруулж байна..." : "Due jobs ажиллуулах"}
      </Button>
      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span> : null}
    </form>
  );
}
