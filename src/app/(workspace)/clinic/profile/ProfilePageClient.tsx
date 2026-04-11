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

  const handleProfileUpdate = (fields: Record<string, unknown>) => {
    setProfile((prev) => (prev ? { ...prev, ...fields } : prev));
  };

  return (
    <ClinicSplitLayout
      title="Эмнэлгийн профайл"
      subtitle="AI туслахтай ярилцаж профайлаа бөглөх"
      leftTabLabel="📋 Профайл"
      rightTabLabel="✦ AI Туслах"
      leftPanel={
        <div style={{ padding: "1.5rem 2rem" }}>
          <ClinicProfileView profile={profile} onProfileUpdate={handleProfileUpdate} />
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
