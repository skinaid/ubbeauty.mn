"use client";

import { useActionState, useState } from "react";
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
  const [amountValue, setAmountValue] = useState(outstanding.toFixed(2));

  const quickAmounts = Array.from(
    new Set([
      Number(outstanding.toFixed(2)),
      Number((outstanding / 2).toFixed(2)),
      Number((outstanding / 3).toFixed(2))
    ])
  ).filter((amount) => amount > 0);

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
            value={amountValue}
            onChange={(event) => setAmountValue(event.target.value)}
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

      <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
        {quickAmounts.map((amount) => (
          <Button
            key={amount}
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setAmountValue(amount.toFixed(2))}
          >
            {amount.toFixed(2)} {currency}
          </Button>
        ))}
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
