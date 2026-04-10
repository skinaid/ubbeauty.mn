"use client";
import { useState } from "react";
import { AvailabilityListPanel } from "@/components/clinic/availability-list-panel";
import { AvailabilityChatPanel } from "@/components/clinic/availability-chat-panel";

export type AvailabilityRule = {
  id: string; staff_member_id: string; location_id: string | null;
  weekday: number; start_local: string; end_local: string; is_available: boolean;
};
export type StaffMember = { id: string; full_name: string; role: string };
export type ClinicLocation = { id: string; name: string };

type Tab = "list" | "chat";

export function AvailabilityPageClient({ initialRules, staffMembers, locations, orgId }: {
  initialRules: AvailabilityRule[]; staffMembers: StaffMember[];
  locations: ClinicLocation[]; orgId: string;
}) {
  const [rules, setRules] = useState<AvailabilityRule[]>(initialRules);
  const [activeTab, setActiveTab] = useState<Tab>("list");

  const handleRuleAdd = (rule: AvailabilityRule) => {
    setRules((prev) => [...prev, rule]);
    setActiveTab("list");
  };
  const handleRuleDelete = (id: string) => setRules((prev) => prev.filter((r) => r.id !== id));

  return (
    <>
      <style>{`
        @media (min-width: 769px) { .avail-desktop { display: grid !important; } .avail-mobile { display: none !important; } }
        @media (max-width: 768px) { .avail-desktop { display: none !important; } .avail-mobile { display: flex !important; } }
      `}</style>
      {/* Desktop */}
      <div className="avail-desktop" style={{ gridTemplateColumns: "1fr 1fr", gap: 0, flex: 1, overflow: "hidden", minHeight: 0, display: "none" }}>
        <div style={{ borderRight: "1px solid #e5e7eb", overflowY: "auto" }}>
          <AvailabilityListPanel rules={rules} staffMembers={staffMembers} locations={locations} onDelete={handleRuleDelete} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <AvailabilityChatPanel orgId={orgId} staffMembers={staffMembers} locations={locations} onRuleAdd={handleRuleAdd} />
        </div>
      </div>
      {/* Mobile */}
      <div className="avail-mobile" style={{ display: "none", flexDirection: "column", flex: 1, overflow: "hidden", minHeight: 0 }}>
        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#fff", flexShrink: 0 }}>
          {(["list", "chat"] as Tab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: "0.75rem", border: "none", background: "transparent", fontSize: "0.85rem", fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? "#111827" : "#9ca3af", borderBottom: activeTab === tab ? "2px solid #111827" : "2px solid transparent", cursor: "pointer" }}>
              {tab === "list" ? `🗓 Ажлын цаг (${rules.length})` : "💬 AI нэмэх"}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {activeTab === "list"
            ? <div style={{ flex: 1, overflowY: "auto" }}><AvailabilityListPanel rules={rules} staffMembers={staffMembers} locations={locations} onDelete={handleRuleDelete} /></div>
            : <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}><AvailabilityChatPanel orgId={orgId} staffMembers={staffMembers} locations={locations} onRuleAdd={handleRuleAdd} /></div>}
        </div>
      </div>
    </>
  );
}
