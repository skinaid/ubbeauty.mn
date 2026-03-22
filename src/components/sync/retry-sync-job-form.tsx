"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { retrySyncJobAction, type SyncActionState } from "@/modules/sync/actions";

type RetrySyncJobFormProps = {
  jobId: string;
};

const initial: SyncActionState = {};

export function RetrySyncJobForm({ jobId }: RetrySyncJobFormProps) {
  const [state, formAction, pending] = useActionState(retrySyncJobAction, initial);

  return (
    <form action={formAction} className="ui-form-inline">
      <input type="hidden" name="jobId" value={jobId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Retrying…" : "Retry sync"}
      </Button>
      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? (
        <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span>
      ) : null}
    </form>
  );
}
