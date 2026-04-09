"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import {
  refundClinicCheckoutAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function RefundCheckoutForm({
  checkoutId,
  currency,
  refundableAmount
}: {
  checkoutId: string;
  currency: string;
  refundableAmount: number;
}) {
  const [state, formAction, pending] = useActionState(refundClinicCheckoutAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack" style={{ gap: "0.5rem", marginTop: "0.6rem" }}>
      <input type="hidden" name="checkoutId" value={checkoutId} />

      <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        <div>
          <label className="ui-label" htmlFor={`refund-amount-${checkoutId}`}>
            Refund дүн
          </label>
          <Input
            id={`refund-amount-${checkoutId}`}
            name="amount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={refundableAmount.toFixed(2)}
          />
        </div>
        <div>
          <label className="ui-label" htmlFor={`refund-reference-${checkoutId}`}>
            Лавлах код
          </label>
          <Input id={`refund-reference-${checkoutId}`} name="referenceCode" placeholder={`${currency} refund ref`} />
        </div>
      </div>

      <div>
        <label className="ui-label" htmlFor={`refund-notes-${checkoutId}`}>
          Refund шалтгаан
        </label>
        <textarea id={`refund-notes-${checkoutId}`} name="notes" rows={2} className="ui-input" />
      </div>

      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Буцааж байна..." : "Refund бүртгэх"}
      </Button>

      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span> : null}
    </form>
  );
}
