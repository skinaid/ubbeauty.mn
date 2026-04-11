"use client";

import { useState } from "react";
import { ClinicSplitLayout } from "@/components/ui";
import { ClinicProfileView } from "@/components/clinic/clinic-profile-view";
import { ClinicProfileChatPanel } from "@/components/clinic/clinic-profile-chat-panel";
import type { ClinicProfile } from "@/modules/clinic/profile";

export function ProfilePageClient({
  initialProfile,
}: {
  initialProfile: ClinicProfile | null;
}) {
  const [profile, setProfile] = useState<ClinicProfile | null>(initialProfile);
  const [editOpen, setEditOpen] = useState(false);

  const handleProfileUpdate = (fields: Record<string, unknown>) => {
    setProfile((prev) => (prev ? { ...prev, ...fields } : prev));
  };

  return (
    <ClinicSplitLayout
      title="Эмнэлгийн профайл"
      subtitle="AI туслахтай ярилцаж профайлаа бөглөх"
      leftTabLabel="📋 Профайл"
      rightTabLabel="✦ AI Туслах"
      headerActions={
        profile ? (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            style={{
              background: "#f5f3ff", border: "1.5px solid #c7d2fe",
              borderRadius: "0.5rem", padding: "0.35rem 0.75rem",
              cursor: "pointer", fontSize: "0.8rem", color: "#6366f1",
              fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem",
            }}
          >
            ✏️ Засах
          </button>
        ) : undefined
      }
      leftPanel={
        <div style={{ padding: "1.5rem 2rem" }}>
          <ClinicProfileView
            profile={profile}
            onProfileUpdate={handleProfileUpdate}
            editOpen={editOpen}
            onEditClose={() => setEditOpen(false)}
          />
        </div>
      }
      rightPanel={
        <ClinicProfileChatPanel
          orgId={profile?.id ?? ""}
          onProfileUpdate={handleProfileUpdate}
        />
      }
    />
  );
}
