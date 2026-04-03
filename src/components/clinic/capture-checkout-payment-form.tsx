"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import {
  captureClinicCheckoutPaymentAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function CaptureCheckoutPaymentForm({
  checkoutId,
  currency,
  outstanding
}: {
  checkoutId: string;
  currency: string;
  outstanding: number;
}) {
  const [state, formAction, pending] = useActionState(captureClinicCheckoutPaymentAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack" style={{ gap: "0.5rem", marginTop: "0.6rem" }}>
      <input type="hidden" name="checkoutId" value={checkoutId} />

      <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        <div>
          <label className="ui-label" htmlFor={`amount-${checkoutId}`}>
            Төлсөн дүн
          </label>
          <Input
            id={`amount-${checkoutId}`}
            name="amount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={outstanding.toFixed(2)}
          />
        </div>

        <div>
          <label className="ui-label" htmlFor={`method-${checkoutId}`}>
            Арга
          </label>
          <select id={`method-${checkoutId}`} name="paymentMethod" className="ui-input" defaultValue="cash">
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="qpay">QPay</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="ui-label" htmlFor={`reference-${checkoutId}`}>
          Лавлах код
        </label>
        <Input id={`reference-${checkoutId}`} name="referenceCode" placeholder={`${currency} receipt / txn id`} />
      </div>

      <div>
        <label className="ui-label" htmlFor={`notes-${checkoutId}`}>
          Тэмдэглэл
        </label>
        <textarea id={`notes-${checkoutId}`} name="notes" rows={2} className="ui-input" />
      </div>

      <Button type="submit" variant="primary" size="sm" disabled={pending}>
        {pending ? "Бүртгэж байна..." : "Төлбөр бүртгэх"}
      </Button>

      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span> : null}
    </form>
  );
}
