"use client";
import { useState } from "react";
import { StaffListPanel } from "@/components/clinic/staff-list-panel";
import { StaffChatPanel } from "@/components/clinic/staff-chat-panel";

type StaffMember = {
  id: string;
  full_name: string;
  role: string;
  specialty: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  accepts_online_booking: boolean;
  status: string;
  location_id: string | null;
};

type Tab = "list" | "chat";

export function StaffPageClient({ initialStaff, orgId }: { initialStaff: StaffMember[]; orgId: string }) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [activeTab, setActiveTab] = useState<Tab>("list");

  const handleStaffUpdate = (updated: StaffMember) => {
    setStaff((prev) =>
      prev.some((s) => s.id === updated.id)
        ? prev.map((s) => (s.id === updated.id ? updated : s))
        : [...prev, updated]
    );
    setActiveTab("list");
  };

  const handleStaffDelete = (id: string) => setStaff((prev) => prev.filter((s) => s.id !== id));

  return (
    <>
      <style>{`
        @media (min-width: 769px) {
          .staff-desktop { display: grid !important; }
          .staff-mobile-tabs { display: none !important; }
        }
        @media (max-width: 768px) {
          .staff-desktop { display: none !important; }
          .staff-mobile-tabs { display: flex !important; }
        }
      `}</style>

      {/* Desktop */}
      <div className="staff-desktop" style={{ gridTemplateColumns: "1fr 1fr", gap: 0, flex: 1, overflow: "hidden", minHeight: 0, display: "none" }}>
        <div style={{ borderRight: "1px solid #e5e7eb", overflowY: "auto" }}>
          <StaffListPanel staff={staff} onDelete={handleStaffDelete} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <StaffChatPanel orgId={orgId} staff={staff} onStaffUpdate={handleStaffUpdate} />
        </div>
      </div>

      {/* Mobile */}
      <div className="staff-mobile-tabs" style={{ display: "none", flexDirection: "column", flex: 1, overflow: "hidden", minHeight: 0 }}>
        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#fff", flexShrink: 0 }}>
          {(["list", "chat"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "0.75rem",
                border: "none",
                background: "transparent",
                fontSize: "0.85rem",
                fontWeight: activeTab === tab ? 700 : 400,
                color: activeTab === tab ? "#111827" : "#9ca3af",
                borderBottom: activeTab === tab ? "2px solid #111827" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              {tab === "list" ? `👥 Ажилтнууд (${staff.length})` : "💬 AI нэмэх"}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {activeTab === "list" ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <StaffListPanel staff={staff} onDelete={handleStaffDelete} />
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <StaffChatPanel orgId={orgId} staff={staff} onStaffUpdate={handleStaffUpdate} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
