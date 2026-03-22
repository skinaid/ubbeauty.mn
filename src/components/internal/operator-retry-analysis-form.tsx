"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { operatorRetryAnalysisJobAction, type OperatorActionState } from "@/modules/admin/actions";

const initial: OperatorActionState = {};

export function OperatorRetryAnalysisForm({ jobId }: { jobId: string }) {
  const [state, formAction, pending] = useActionState(operatorRetryAnalysisJobAction, initial);

  return (
    <form action={formAction} className="ui-form-inline">
      <input type="hidden" name="jobId" value={jobId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Running…" : "Ops: retry analysis"}
      </Button>
      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? (
        <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span>
      ) : null}
    </form>
  );
}
