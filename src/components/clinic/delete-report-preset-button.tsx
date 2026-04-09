"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  deleteClinicReportPresetAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function DeleteReportPresetButton({ presetId }: { presetId: string }) {
  const [state, formAction, pending] = useActionState(deleteClinicReportPresetAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: "0.35rem" }}>
      <input type="hidden" name="presetId" value={presetId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Устгаж байна..." : "Delete"}
      </Button>
      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
    </form>
  );
}
