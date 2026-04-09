"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { EditClinicLocationForm } from "./edit-clinic-location-form";
import { deleteClinicLocationAction } from "@/modules/clinic/actions";

export function ClinicLocationListItem({
  location
}: {
  location: {
    id: string;
    name: string;
    district: string | null;
    address_line1: string | null;
    phone: string | null;
  };
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li style={{ listStyle: "none", marginBottom: "1rem" }}>
        <EditClinicLocationForm location={location} onCancel={() => setIsEditing(false)} />
      </li>
    );
  }

  const handleDelete = async () => {
    if (window.confirm("Энэ салбарыг устгах уу?")) {
      const formData = new FormData();
      formData.append("locationId", location.id);
      await deleteClinicLocationAction({}, formData);
    }
  };

  return (
    <li style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--ui-border)" }}>
      <div>
        <strong>{location.name}</strong>
        <span className="ui-text-muted" style={{ display: "block", fontSize: "0.875rem" }}>
          {[location.district, location.address_line1, location.phone].filter(Boolean).join(" · ")}
        </span>
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>Засах</Button>
        <Button variant="secondary" size="sm" onClick={handleDelete} style={{ color: "var(--ui-error)", borderColor: "var(--ui-error)" }}>Устгах</Button>
      </div>
    </li>
  );
}
