"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { EditStaffMemberForm } from "./edit-staff-member-form";
import { deleteStaffMemberAction } from "@/modules/clinic/actions";

export function StaffMemberListItem({
  staffMember
}: {
  staffMember: {
    id: string;
    full_name: string;
    role: string;
    specialty: string | null;
    phone: string | null;
    email: string | null;
  };
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li style={{ listStyle: "none", marginBottom: "1rem" }}>
        <EditStaffMemberForm staff={staffMember} onCancel={() => setIsEditing(false)} />
      </li>
    );
  }

  const handleDelete = async () => {
    if (window.confirm("Энэ ажилтныг устгах уу?")) {
      const formData = new FormData();
      formData.append("staffMemberId", staffMember.id);
      await deleteStaffMemberAction({}, formData);
    }
  };

  return (
    <li style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", padding: "0.5rem 0", borderBottom: "1px solid var(--ui-border)" }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <strong style={{ display: "block", overflowWrap: "break-word" }}>{staffMember.full_name}</strong>
        <span className="ui-text-muted" style={{ display: "block", fontSize: "0.875rem", overflowWrap: "break-word" }}>
          {staffMember.role}
          {staffMember.specialty ? ` · ${staffMember.specialty}` : ""}
          {staffMember.phone ? ` · ${staffMember.phone}` : ""}
        </span>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>Засах</Button>
        <Button variant="secondary" size="sm" onClick={handleDelete} style={{ color: "var(--ui-error)", borderColor: "var(--ui-error)" }}>Устгах</Button>
      </div>
    </li>
  );
}
