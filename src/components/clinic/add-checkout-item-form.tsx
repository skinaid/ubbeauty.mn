"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import {
  addClinicCheckoutItemAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function AddCheckoutItemForm({ checkoutId }: { checkoutId: string }) {
  const [state, formAction, pending] = useActionState(addClinicCheckoutItemAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack" style={{ gap: "0.5rem", marginTop: "0.75rem" }}>
      <input type="hidden" name="checkoutId" value={checkoutId} />

      <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "minmax(180px, 1.6fr) repeat(3, minmax(100px, 1fr))" }}>
        <div>
          <label className="ui-label" htmlFor={`checkout-item-label-${checkoutId}`}>
            Item нэр
          </label>
          <Input id={`checkout-item-label-${checkoutId}`} name="label" placeholder="Cooling mask / Serum / Discount" />
        </div>

        <div>
          <label className="ui-label" htmlFor={`checkout-item-type-${checkoutId}`}>
            Төрөл
          </label>
          <select id={`checkout-item-type-${checkoutId}`} name="itemType" className="ui-input" defaultValue="add_on">
            <option value="add_on">Add-on</option>
            <option value="product">Product</option>
            <option value="adjustment">Discount / adjustment</option>
          </select>
        </div>

        <div>
          <label className="ui-label" htmlFor={`checkout-item-qty-${checkoutId}`}>
            Qty
          </label>
          <Input id={`checkout-item-qty-${checkoutId}`} name="quantity" type="number" min="1" step="1" defaultValue="1" />
        </div>

        <div>
          <label className="ui-label" htmlFor={`checkout-item-price-${checkoutId}`}>
            Unit price
          </label>
          <Input id={`checkout-item-price-${checkoutId}`} name="unitPrice" type="number" step="0.01" placeholder="Discount бол - утга" />
        </div>
      </div>

      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Нэмж байна..." : "Item нэмэх"}
      </Button>

      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span> : null}
    </form>
  );
}
