"use client";

import { Button } from "@/components/ui";

export function PrintCheckoutReceiptButton() {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
      Receipt хэвлэх
    </Button>
  );
}
