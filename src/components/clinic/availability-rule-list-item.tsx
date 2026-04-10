"use client";

import { Button } from "@/components/ui";
import { deleteStaffAvailabilityRuleAction } from "@/modules/clinic/actions";

export function AvailabilityRuleListItem({
  rule,
  staffName,
  locationName,
  weekdayLabel
}: {
  rule: {
    id: string;
    start_local: string;
    end_local: string;
  };
  staffName: string;
  locationName: string;
  weekdayLabel: string;
}) {
  const handleDelete = async () => {
    if (window.confirm("Энэ цагийн тохиргоог устгах уу?")) {
      const formData = new FormData();
      formData.append("ruleId", rule.id);
      await deleteStaffAvailabilityRuleAction({}, formData);
    }
  };

  return (
    <li style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", padding: "0.5rem 0", borderBottom: "1px solid var(--ui-border)" }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <strong style={{ display: "block", overflowWrap: "break-word" }}>{staffName}</strong>
        <span className="ui-text-muted" style={{ display: "block", fontSize: "0.875rem", overflowWrap: "break-word" }}>
          {weekdayLabel} · {rule.start_local.slice(0, 5)} - {rule.end_local.slice(0, 5)}
          {locationName ? ` · ${locationName}` : ""}
        </span>
      </div>
      <div style={{ flexShrink: 0 }}>
        <Button variant="secondary" size="sm" onClick={handleDelete} style={{ color: "var(--ui-error)", borderColor: "var(--ui-error)" }}>Устгах</Button>
      </div>
    </li>
  );
}
