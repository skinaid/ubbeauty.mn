"use client";

import { useState } from "react";
import { ClinicProfileView } from "@/components/clinic/clinic-profile-view";
import { ClinicProfileChatPanel } from "@/components/clinic/clinic-profile-chat-panel";
import type { ClinicProfile } from "@/modules/clinic/profile";

export function ProfilePageClient({
  initialProfile,
}: {
  initialProfile: ClinicProfile | null;
}) {
  const [profile, setProfile] = useState<ClinicProfile | null>(initialProfile);

  const handleProfileUpdate = (fields: Record<string, unknown>) => {
    setProfile((prev) => (prev ? { ...prev, ...fields } : prev));
  };

  return (
    <>
      <style>{`
        .clinic-profile-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          height: calc(100vh - 60px);
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .clinic-profile-split {
            grid-template-columns: 1fr;
            height: auto;
            overflow: visible;
          }
        }
      `}</style>
      <div className="clinic-profile-split">
        <div
          style={{
            borderRight: "1px solid var(--ui-border, #e5e7eb)",
            overflowY: "auto",
            padding: "2rem",
          }}
        >
          <ClinicProfileView profile={profile} />
        </div>
        <div
          style={{
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <ClinicProfileChatPanel
            orgId={profile?.id ?? ""}
            onProfileUpdate={handleProfileUpdate}
          />
        </div>
      </div>
    </>
  );
}
