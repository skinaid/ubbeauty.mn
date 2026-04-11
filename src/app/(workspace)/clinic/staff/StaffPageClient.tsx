"use client";
import { useState } from "react";
import { ClinicSplitLayout } from "@/components/ui";
import { StaffListPanel } from "@/components/clinic/staff-list-panel";
import { StaffDetailPanel } from "@/components/clinic/staff-detail-panel";
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
  photo_url: string | null;
};

type Location = { id: string; name: string };

export function StaffPageClient({
  initialStaff,
  initialLocations,
  orgId,
}: {
  initialStaff: StaffMember[];
  initialLocations: Location[];
  orgId: string;
}) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  const handleStaffUpdate = (updated: StaffMember) => {
    setStaff((prev) =>
      prev.some((s) => s.id === updated.id)
        ? prev.map((s) => (s.id === updated.id ? updated : s))
        : [...prev, updated]
    );
    if (selectedStaff?.id === updated.id) {
      setSelectedStaff(updated);
    }
  };

  const handleStaffDelete = (id: string) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
    if (selectedStaff?.id === id) {
      setSelectedStaff(null);
    }
  };

  const handlePhotoUpdate = (staffId: string, photoUrl: string) => {
    setStaff((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, photo_url: photoUrl } : s))
    );
    if (selectedStaff?.id === staffId) {
      setSelectedStaff((prev) => (prev ? { ...prev, photo_url: photoUrl } : prev));
    }
  };

  const leftTabLabel = selectedStaff
    ? `👥 ${selectedStaff.full_name}`
    : `👥 Ажилтнууд (${staff.length})`;

  return (
    <ClinicSplitLayout
      title="Ажилтнууд"
      subtitle="Provider, front desk болон бусад ажилтнууд"
      leftTabLabel={leftTabLabel}
      rightTabLabel="💬 AI нэмэх"
      leftPanel={
        selectedStaff ? (
          <StaffDetailPanel
            staff={selectedStaff}
            locations={initialLocations}
            onBack={() => setSelectedStaff(null)}
            onUpdate={(updated) => {
              handleStaffUpdate(updated);
              setSelectedStaff(updated);
            }}
            onDelete={(id) => {
              handleStaffDelete(id);
              setSelectedStaff(null);
            }}
            onPhotoUpdate={handlePhotoUpdate}
          />
        ) : (
          <StaffListPanel
            staff={staff}
            onDelete={handleStaffDelete}
            onSelect={setSelectedStaff}
            onPhotoUpdate={handlePhotoUpdate}
          />
        )
      }
      rightPanel={
        <StaffChatPanel orgId={orgId} staff={staff} onStaffUpdate={handleStaffUpdate} />
      }
    />
  );
}
