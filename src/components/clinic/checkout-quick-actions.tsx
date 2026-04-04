"use client";

import { useEffect } from "react";
import { Button, Card } from "@/components/ui";

function focusElement(selector: string) {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) return;
  element.focus();
  if ("select" in element && typeof element.select === "function") {
    element.select();
  }
}

export function CheckoutQuickActions({
  canPrint
}: {
  canPrint: boolean;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === "q") {
        event.preventDefault();
        focusElement("#checkout-queue-search");
      }
      if (key === "a") {
        event.preventDefault();
        focusElement('input[id^="checkout-item-label-"]');
      }
      if (key === "p") {
        event.preventDefault();
        focusElement('input[id^="amount-"]');
      }
      if (key === "d") {
        event.preventDefault();
        focusElement("#checkout-draft-search");
      }
      if (key === "r" && canPrint) {
        event.preventDefault();
        window.print();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canPrint]);

  return (
    <Card padded stack className="checkout-print-hidden">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "start", flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: "0.2rem" }}>
          <strong>Cashier quick actions</strong>
          <span className="ui-text-muted">Keyboard shortcut ашиглаад queue, cart, төлбөр, receipt рүү шууд үсэрнэ.</span>
        </div>
        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
          <Button type="button" variant="ghost" size="sm" onClick={() => focusElement("#checkout-queue-search")}>
            Queue search
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => focusElement('input[id^="checkout-item-label-"]')}>
            Add item
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => focusElement('input[id^="amount-"]')}>
            Payment
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => focusElement("#checkout-draft-search")}>
            Drafts
          </Button>
          {canPrint ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
              Print
            </Button>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <span className="ui-text-muted">`Alt+Q` queue search</span>
        <span className="ui-text-muted">`Alt+A` add item</span>
        <span className="ui-text-muted">`Alt+P` payment</span>
        <span className="ui-text-muted">`Alt+D` draft search</span>
        {canPrint ? <span className="ui-text-muted">`Alt+R` receipt print</span> : null}
      </div>
    </Card>
  );
}
