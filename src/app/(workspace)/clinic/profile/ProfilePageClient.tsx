"use client";

import { useState } from "react";
import { ClinicProfileView } from "@/components/clinic/clinic-profile-view";
import { ClinicProfileChatPanel } from "@/components/clinic/clinic-profile-chat-panel";
import type { ClinicProfile } from "@/modules/clinic/profile";

type Tab = "profile" | "chat";

export function ProfilePageClient({
  initialProfile,
}: {
  initialProfile: ClinicProfile | null;
}) {
  const [profile, setProfile] = useState<ClinicProfile | null>(initialProfile);
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const handleProfileUpdate = (fields: Record<string, unknown>) => {
    setProfile((prev) => (prev ? { ...prev, ...fields } : prev));
  };

  return (
    <>
      <style>{`
        @media (min-width: 769px) {
          .profile-desktop { display: grid !important; }
          .profile-mobile-tabs { display: none !important; }
        }
        @media (max-width: 768px) {
          .profile-desktop { display: none !important; }
          .profile-mobile-tabs { display: flex !important; }
        }
      `}</style>

      {/* Desktop: side-by-side */}
      <div
        className="profile-desktop"
        style={{
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          flex: 1,
          overflow: "hidden",
          minHeight: 0,
          display: "none",
        }}
      >
        <div style={{ borderRight: "1px solid #e5e7eb", overflowY: "auto" }}>
          <div style={{ padding: "1.5rem 2rem" }}>
            <ClinicProfileView profile={profile} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <ClinicProfileChatPanel
            orgId={profile?.id ?? ""}
            onProfileUpdate={handleProfileUpdate}
          />
        </div>
      </div>

      {/* Mobile: tab switcher */}
      <div
        className="profile-mobile-tabs"
        style={{ display: "none", flexDirection: "column", flex: 1, overflow: "hidden", minHeight: 0 }}
      >
        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#fff", flexShrink: 0 }}>
          {(["profile", "chat"] as Tab[]).map((tab) => (
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
                transition: "all 0.15s",
              }}
            >
              {tab === "profile" ? "📋 Профайл" : "✦ AI Туслах"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {activeTab === "profile" ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
              <ClinicProfileView profile={profile} />
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <ClinicProfileChatPanel
                orgId={profile?.id ?? ""}
                onProfileUpdate={handleProfileUpdate}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
