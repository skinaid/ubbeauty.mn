"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { operatorReverifyInvoiceAction, type OperatorActionState } from "@/modules/admin/actions";

const initial: OperatorActionState = {};

export function OperatorInvoiceReverifyForm({ invoiceId }: { invoiceId: string }) {
  const [state, formAction, pending] = useActionState(operatorReverifyInvoiceAction, initial);

  return (
    <form action={formAction} className="ui-form-inline">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Verifying…" : "Re-verify QPay"}
      </Button>
      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? (
        <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span>
      ) : null}
    </form>
  );
}
