"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  removeClinicCheckoutItemAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function RemoveCheckoutItemButton({ checkoutItemId }: { checkoutItemId: string }) {
  const [state, formAction, pending] = useActionState(removeClinicCheckoutItemAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack" style={{ gap: "0.35rem" }}>
      <input type="hidden" name="checkoutItemId" value={checkoutItemId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Хасаж байна..." : "Item хасах"}
      </Button>
      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span> : null}
    </form>
  );
}
