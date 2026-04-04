"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  retryClinicEngagementJobAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function RetryClinicEngagementJobButton({
  jobId,
  mode = "retry_now"
}: {
  jobId: string;
  mode?: "retry_now" | "requeue";
}) {
  const [state, formAction, pending] = useActionState(retryClinicEngagementJobAction, initialState);

  return (
    <form
      action={formAction}
      className="ui-form-stack"
      style={{ gap: "0.35rem" }}
      data-smoke-form="notification-retry"
      data-retry-mode={mode}
      data-job-id={jobId}
    >
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="mode" value={mode} />
      <Button type="submit" variant={mode === "retry_now" ? "secondary" : "ghost"} size="sm" disabled={pending}>
        {pending
          ? mode === "retry_now"
            ? "Retry хийж байна..."
            : "Requeue хийж байна..."
          : mode === "retry_now"
            ? "Retry now"
            : "Requeue"}
      </Button>
      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span> : null}
    </form>
  );
}
