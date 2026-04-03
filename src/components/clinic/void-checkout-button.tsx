"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  voidClinicCheckoutAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function VoidCheckoutButton({ checkoutId }: { checkoutId: string }) {
  const [state, formAction, pending] = useActionState(voidClinicCheckoutAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack" style={{ gap: "0.35rem", marginTop: "0.6rem" }}>
      <input type="hidden" name="checkoutId" value={checkoutId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Void хийж байна..." : "Checkout void хийх"}
      </Button>
      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span> : null}
    </form>
  );
}
