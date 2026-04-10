"use client";
import { useState } from "react";
import { ClinicSplitLayout } from "@/components/ui";
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

export function StaffPageClient({
  initialStaff,
  orgId,
}: {
  initialStaff: StaffMember[];
  orgId: string;
}) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);

  const handleStaffUpdate = (updated: StaffMember) => {
    setStaff((prev) =>
      prev.some((s) => s.id === updated.id)
        ? prev.map((s) => (s.id === updated.id ? updated : s))
        : [...prev, updated]
    );
  };

  const handleStaffDelete = (id: string) =>
    setStaff((prev) => prev.filter((s) => s.id !== id));

  return (
    <ClinicSplitLayout
      title="Ажилтнууд"
      subtitle="Provider, front desk болон бусад ажилтнууд"
      leftTabLabel={`👥 Ажилтнууд (${staff.length})`}
      rightTabLabel="💬 AI нэмэх"
      leftPanel={
        <StaffListPanel staff={staff} onDelete={handleStaffDelete} />
      }
      rightPanel={
        <StaffChatPanel orgId={orgId} staff={staff} onStaffUpdate={handleStaffUpdate} />
      }
    />
  );
}
