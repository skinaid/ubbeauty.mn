"use client";
import { useState } from "react";
import { LocationsMapPanel } from "@/components/clinic/locations-map-panel";
import { LocationsChatPanel } from "@/components/clinic/locations-chat-panel";

type ClinicLocation = {
  id: string;
  name: string;
  address_line1: string | null;
  district: string | null;
  city: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  working_hours: Record<string, string> | null;
  description: string | null;
  status: string;
};

export function LocationsPageClient({
  initialLocations,
  orgId,
}: {
  initialLocations: ClinicLocation[];
  orgId: string;
}) {
  const [locations, setLocations] = useState<ClinicLocation[]>(initialLocations);

  const handleLocationUpdate = (updated: ClinicLocation) => {
    setLocations((prev) =>
      prev.some((l) => l.id === updated.id)
        ? prev.map((l) => (l.id === updated.id ? updated : l))
        : [...prev, updated]
    );
  };

  const handleLocationDelete = (id: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 0,
      flex: 1,
      overflow: "hidden",
      minHeight: 0,
    }}>
      <div style={{ borderRight: "1px solid #e5e7eb", overflowY: "auto" }}>
        <LocationsMapPanel
          locations={locations}
          onDelete={handleLocationDelete}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <LocationsChatPanel
          orgId={orgId}
          locations={locations}
          onLocationUpdate={handleLocationUpdate}
        />
      </div>
    </div>
  );
}
