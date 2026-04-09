"use client";

import { useActionState, useMemo, useState } from "react";
import { Button, Input } from "@/components/ui";
import {
  addClinicCheckoutItemAction,
  type ClinicSetupActionState
} from "@/modules/clinic/actions";

const initialState: ClinicSetupActionState = {};

type CheckoutCatalogItem = {
  id: string;
  name: string;
  priceFrom: number;
  currency: string;
};

const discountPresets = [
  { label: "Loyalty -10k", amount: -10000 },
  { label: "Promo -20k", amount: -20000 },
  { label: "Bundle -50k", amount: -50000 }
];

export function AddCheckoutItemForm({
  checkoutId,
  currency,
  serviceCatalog
}: {
  checkoutId: string;
  currency: string;
  serviceCatalog: CheckoutCatalogItem[];
}) {
  const [state, formAction, pending] = useActionState(addClinicCheckoutItemAction, initialState);
  const [labelValue, setLabelValue] = useState("");
  const [itemTypeValue, setItemTypeValue] = useState("add_on");
  const [quantityValue, setQuantityValue] = useState("1");
  const [unitPriceValue, setUnitPriceValue] = useState("");

  const quickServicePresets = useMemo(
    () => serviceCatalog.filter((service) => service.currency === currency).slice(0, 4),
    [currency, serviceCatalog]
  );

  const serviceLookup = useMemo(
    () =>
      new Map(
        serviceCatalog.map((service) => [
          service.id,
          service
        ])
      ),
    [serviceCatalog]
  );

  const applyServicePreset = (serviceId: string) => {
    const selected = serviceLookup.get(serviceId);
    if (!selected) return;

    setLabelValue(selected.name);
    setItemTypeValue("service");
    setQuantityValue("1");
    setUnitPriceValue(selected.priceFrom.toFixed(2));
  };

  const applyDiscountPreset = (preset: (typeof discountPresets)[number]) => {
    setLabelValue(preset.label);
    setItemTypeValue("adjustment");
    setQuantityValue("1");
    setUnitPriceValue(preset.amount.toFixed(2));
  };

  return (
    <form action={formAction} className="ui-form-stack" style={{ gap: "0.5rem", marginTop: "0.75rem" }}>
      <input type="hidden" name="checkoutId" value={checkoutId} />

      {quickServicePresets.length > 0 ? (
        <div style={{ display: "grid", gap: "0.35rem" }}>
          <span className="ui-text-muted">Service presets</span>
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
            {quickServicePresets.map((service) => (
              <Button
                key={service.id}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => applyServicePreset(service.id)}
              >
                {service.name} · {service.priceFrom.toFixed(0)} {service.currency}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: "0.35rem" }}>
        <span className="ui-text-muted">Quick discount</span>
        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
          {discountPresets.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => applyDiscountPreset(preset)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {serviceCatalog.length > 0 ? (
        <div>
          <label className="ui-label" htmlFor={`checkout-service-preset-${checkoutId}`}>
            Service catalog
          </label>
          <select
            id={`checkout-service-preset-${checkoutId}`}
            className="ui-input"
            defaultValue=""
            onChange={(event) => {
              if (!event.target.value) return;
              applyServicePreset(event.target.value);
            }}
          >
            <option value="">Service-ээс сонгоод cart руу оруулах</option>
            {serviceCatalog.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {service.priceFrom.toFixed(2)} {service.currency}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "minmax(180px, 1.6fr) repeat(3, minmax(100px, 1fr))" }}>
        <div>
          <label className="ui-label" htmlFor={`checkout-item-label-${checkoutId}`}>
            Item нэр
          </label>
          <Input
            id={`checkout-item-label-${checkoutId}`}
            name="label"
            list={`checkout-item-label-options-${checkoutId}`}
            placeholder="Cooling mask / Serum / Discount"
            value={labelValue}
            onChange={(event) => setLabelValue(event.target.value)}
          />
          <datalist id={`checkout-item-label-options-${checkoutId}`}>
            {serviceCatalog.map((service) => (
              <option key={service.id} value={service.name} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="ui-label" htmlFor={`checkout-item-type-${checkoutId}`}>
            Төрөл
          </label>
          <select
            id={`checkout-item-type-${checkoutId}`}
            name="itemType"
            className="ui-input"
            value={itemTypeValue}
            onChange={(event) => setItemTypeValue(event.target.value)}
          >
            <option value="service">Service</option>
            <option value="add_on">Add-on</option>
            <option value="product">Product</option>
            <option value="adjustment">Discount / adjustment</option>
          </select>
        </div>

        <div>
          <label className="ui-label" htmlFor={`checkout-item-qty-${checkoutId}`}>
            Qty
          </label>
          <Input
            id={`checkout-item-qty-${checkoutId}`}
            name="quantity"
            type="number"
            min="1"
            step="1"
            value={quantityValue}
            onChange={(event) => setQuantityValue(event.target.value)}
          />
        </div>

        <div>
          <label className="ui-label" htmlFor={`checkout-item-price-${checkoutId}`}>
            Unit price
          </label>
          <Input
            id={`checkout-item-price-${checkoutId}`}
            name="unitPrice"
            type="number"
            step="0.01"
            placeholder="Discount бол - утга"
            value={unitPriceValue}
            onChange={(event) => setUnitPriceValue(event.target.value)}
          />
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
