"use client";
import { useState } from "react";
import { ClinicSplitLayout } from "@/components/ui";
import { AvailabilityListPanel } from "@/components/clinic/availability-list-panel";
import { AvailabilityChatPanel } from "@/components/clinic/availability-chat-panel";

export type AvailabilityRule = {
  id: string;
  staff_member_id: string;
  location_id: string | null;
  weekday: number;
  start_local: string;
  end_local: string;
  is_available: boolean;
};
export type StaffMember = { id: string; full_name: string; role: string };
export type ClinicLocation = { id: string; name: string };

export function AvailabilityPageClient({
  initialRules,
  staffMembers,
  locations,
  orgId,
}: {
  initialRules: AvailabilityRule[];
  staffMembers: StaffMember[];
  locations: ClinicLocation[];
  orgId: string;
}) {
  const [rules, setRules] = useState<AvailabilityRule[]>(initialRules);

  const handleRuleAdd = (rule: AvailabilityRule) =>
    setRules((prev) => [...prev, rule]);

  const handleRuleDelete = (id: string) =>
    setRules((prev) => prev.filter((r) => r.id !== id));

  return (
    <ClinicSplitLayout
      title="Ажлын цаг"
      subtitle="Staff болон салбарын ажиллах цагийн тохиргоо"
      leftTabLabel={`🗓 Ажлын цаг (${rules.length})`}
      rightTabLabel="💬 AI нэмэх"
      leftPanel={
        <AvailabilityListPanel
          rules={rules}
          staffMembers={staffMembers}
          locations={locations}
          onDelete={handleRuleDelete}
        />
      }
      rightPanel={
        <AvailabilityChatPanel
          orgId={orgId}
          staffMembers={staffMembers}
          locations={locations}
          onRuleAdd={handleRuleAdd}
        />
      }
    />
  );
}
