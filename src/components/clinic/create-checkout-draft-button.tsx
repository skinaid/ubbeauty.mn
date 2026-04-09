"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  createCheckoutDraftAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function CreateCheckoutDraftButton({ appointmentId }: { appointmentId: string }) {
  const [state, formAction, pending] = useActionState(createCheckoutDraftAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack" style={{ gap: "0.4rem" }}>
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <Button type="submit" variant="primary" size="sm" disabled={pending}>
        {pending ? "Үүсгэж байна..." : "Checkout draft үүсгэх"}
      </Button>
      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span> : null}
    </form>
  );
}
