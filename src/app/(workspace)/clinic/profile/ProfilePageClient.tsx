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
    <div className="flex flex-col h-[calc(100vh-60px)]">
      {/* Page-level header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          Эмнэлгийн профайл
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          AI туслахтай ярилцаж профайлаа хурдан бөглөх эсвэл шинэчлэх
        </p>
      </div>

      {/* Mobile tab switcher */}
      <div className="flex md:hidden flex-shrink-0 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "profile"
              ? "text-indigo-600 border-indigo-500"
              : "text-gray-500 border-transparent hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Профайл
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "chat"
              ? "text-indigo-600 border-indigo-500"
              : "text-gray-500 border-transparent hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          ✦ AI Туслах
        </button>
      </div>

      {/* Split content area */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left panel — Profile view */}
        <div
          className={`
            w-full md:flex md:w-1/2 flex-col
            border-r border-gray-100 dark:border-gray-800
            bg-white dark:bg-gray-950
            overflow-y-auto
            ${activeTab === "profile" ? "flex" : "hidden"}
          `}
        >
          <div className="p-6 lg:p-8">
            <ClinicProfileView profile={profile} />
          </div>
        </div>

        {/* Right panel — AI Chat */}
        <div
          className={`
            w-full md:flex md:w-1/2 flex-col
            bg-gray-50 dark:bg-gray-900
            ${activeTab === "chat" ? "flex" : "hidden"}
          `}
        >
          <ClinicProfileChatPanel
            orgId={profile?.id ?? ""}
            onProfileUpdate={handleProfileUpdate}
          />
        </div>
      </div>
    </div>
  );
}
