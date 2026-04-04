"use client";

import { Button } from "@/components/ui";

export function PrintReportButton() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => window.print()}
    >
      Print view
    </Button>
  );
}
