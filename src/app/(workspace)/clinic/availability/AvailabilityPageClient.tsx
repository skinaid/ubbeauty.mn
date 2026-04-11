"use client";
import { useState } from "react";
import { ClinicSplitLayout } from "@/components/ui";
import { AvailabilityListPanel } from "@/components/clinic/availability-list-panel";
import { AvailabilityChatPanel } from "@/components/clinic/availability-chat-panel";
import type {
  AvailabilityRule,
  AvailabilityStaffMember as StaffMember,
  AvailabilityLocation as ClinicLocation,
} from "@/modules/clinic/availability-types";

// Re-export for any consumers that import AvailabilityRule from this file
export type { AvailabilityRule } from "@/modules/clinic/availability-types";

export function AvailabilityPageClient({
  initialRules,
  staffMembers,
  locations,
  orgId,
  initialWorkingHours,
}: {
  initialRules: AvailabilityRule[];
  staffMembers: StaffMember[];
  locations: ClinicLocation[];
  orgId: string;
  initialWorkingHours: Record<string, string> | null;
}) {
  const [rules, setRules] = useState<AvailabilityRule[]>(initialRules);
  const [focusedStaffId, setFocusedStaffId] = useState<string | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<"left" | "right">("left");

  const handleRuleAdd = (rule: AvailabilityRule) =>
    setRules((prev) => [...prev, rule]);

  const handleRuleDelete = (id: string) =>
    setRules((prev) => prev.filter((r) => r.id !== id));

  const handleRuleUpdate = (updated: AvailabilityRule) =>
    setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

  const handleAddForStaff = (staffId: string) => {
    setFocusedStaffId(staffId);
    // Switch to chat tab on mobile
    setActiveMobileTab("right");
  };

  return (
    <ClinicSplitLayout
      title="Ажлын цаг"
      subtitle="Staff болон салбарын ажиллах цагийн тохиргоо"
      leftTabLabel={`🗓 Ажлын цаг (${rules.length})`}
      rightTabLabel="💬 AI нэмэх"
      activeTab={activeMobileTab}
      onTabChange={setActiveMobileTab}
      leftPanel={
        <AvailabilityListPanel
          rules={rules}
          staffMembers={staffMembers}
          locations={locations}
          workingHours={initialWorkingHours}
          onDelete={handleRuleDelete}
          onUpdate={handleRuleUpdate}
          onAdd={handleRuleAdd}
          onAddForStaff={handleAddForStaff}
        />
      }
      rightPanel={
        <AvailabilityChatPanel
          orgId={orgId}
          staffMembers={staffMembers}
          locations={locations}
          onRuleAdd={handleRuleAdd}
          focusedStaffId={focusedStaffId}
        />
      }
    />
  );
}
