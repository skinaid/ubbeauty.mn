"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import {
  type ClinicSetupActionState,
  updateClinicCheckoutItemAction
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

export function UpdateCheckoutItemForm({
  checkoutItemId,
  defaultLabel,
  defaultQuantity,
  defaultUnitPrice,
  itemType
}: {
  checkoutItemId: string;
  defaultLabel: string;
  defaultQuantity: number;
  defaultUnitPrice: number;
  itemType: string;
}) {
  const [state, formAction, pending] = useActionState(updateClinicCheckoutItemAction, initialState);

  return (
    <form action={formAction} className="ui-form-stack" style={{ gap: "0.45rem", width: "100%" }}>
      <input type="hidden" name="checkoutItemId" value={checkoutItemId} />

      <div
        style={{
          display: "grid",
          gap: "0.5rem",
          gridTemplateColumns: "minmax(180px, 1.8fr) repeat(2, minmax(90px, 1fr))"
        }}
      >
        <div>
          <label className="ui-label" htmlFor={`checkout-item-edit-label-${checkoutItemId}`}>
            Item нэр
          </label>
          <Input
            id={`checkout-item-edit-label-${checkoutItemId}`}
            name="label"
            defaultValue={defaultLabel}
          />
        </div>

        <div>
          <label className="ui-label" htmlFor={`checkout-item-edit-qty-${checkoutItemId}`}>
            Qty
          </label>
          <Input
            id={`checkout-item-edit-qty-${checkoutItemId}`}
            name="quantity"
            type="number"
            min="1"
            step="1"
            defaultValue={String(defaultQuantity)}
          />
        </div>

        <div>
          <label className="ui-label" htmlFor={`checkout-item-edit-price-${checkoutItemId}`}>
            Unit price
          </label>
          <Input
            id={`checkout-item-edit-price-${checkoutItemId}`}
            name="unitPrice"
            type="number"
            step="0.01"
            defaultValue={defaultUnitPrice.toFixed(2)}
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <span className="ui-text-muted">{itemType} item</span>
        <Button type="submit" variant="ghost" size="sm" disabled={pending}>
          {pending ? "Хадгалж байна..." : "Item шинэчлэх"}
        </Button>
      </div>

      {state.error ? <span className="ui-inline-feedback ui-inline-feedback--error">{state.error}</span> : null}
      {state.message ? <span className="ui-inline-feedback ui-inline-feedback--success">{state.message}</span> : null}
    </form>
  );
}
