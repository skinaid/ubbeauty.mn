"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { EditServiceForm } from "./edit-service-form";
import { deleteServiceAction } from "@/modules/clinic/actions";

export function ServiceListItem({
  service
}: {
  service: {
    id: string;
    name: string;
    duration_minutes: number;
    price_from: number;
    currency: string;
    description: string | null;
  };
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li style={{ listStyle: "none", marginBottom: "1rem" }}>
        <EditServiceForm service={service} onCancel={() => setIsEditing(false)} />
      </li>
    );
  }

  const handleDelete = async () => {
    if (window.confirm("Энэ үйлчилгээг устгах уу?")) {
      const formData = new FormData();
      formData.append("serviceId", service.id);
      await deleteServiceAction({}, formData);
    }
  };

  return (
    <li style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--ui-border)" }}>
      <div>
        <strong>{service.name}</strong>
        <span className="ui-text-muted" style={{ display: "block", fontSize: "0.875rem" }}>
          {service.duration_minutes} мин · {service.price_from} {service.currency}
        </span>
        {service.description && (
          <span className="ui-text-muted" style={{ display: "block", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            {service.description}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>Засах</Button>
        <Button variant="secondary" size="sm" onClick={handleDelete} style={{ color: "var(--ui-error)", borderColor: "var(--ui-error)" }}>Устгах</Button>
      </div>
    </li>
  );
}
