"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  seedDemoClinicDataAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

type SeedDemoClinicDataButtonProps = {
  disabled?: boolean;
  disabledReason?: string | null;
};

export function SeedDemoClinicDataButton({
  disabled = false,
  disabledReason
}: SeedDemoClinicDataButtonProps) {
  const [state, formAction, pending] = useActionState(seedDemoClinicDataAction, initialState);
  const isDisabled = pending || disabled;

  return (
    <form action={formAction} className="ui-form-stack" style={{ gap: "0.5rem" }}>
      <Button type="submit" variant="secondary" size="sm" disabled={isDisabled}>
        {pending ? "Demo data үүсгэж байна..." : "Demo clinic data үүсгэх"}
      </Button>
      {disabledReason ? <span className="ui-inline-feedback">{disabledReason}</span> : null}
      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span> : null}
    </form>
  );
}
