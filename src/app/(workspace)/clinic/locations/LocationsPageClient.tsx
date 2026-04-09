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

type Tab = "map" | "chat";

export function LocationsPageClient({
  initialLocations,
  orgId,
}: {
  initialLocations: ClinicLocation[];
  orgId: string;
}) {
  const [locations, setLocations] = useState<ClinicLocation[]>(initialLocations);
  const [activeTab, setActiveTab] = useState<Tab>("map");

  const handleLocationUpdate = (updated: ClinicLocation) => {
    setLocations((prev) =>
      prev.some((l) => l.id === updated.id)
        ? prev.map((l) => (l.id === updated.id ? updated : l))
        : [...prev, updated]
    );
    // Auto-switch to map after save on mobile
    setActiveTab("map");
  };

  const handleLocationDelete = (id: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <>
      {/* ── Desktop: side-by-side ── */}
      <style>{`
        @media (min-width: 769px) {
          .loc-desktop { display: grid !important; }
          .loc-mobile-tabs { display: none !important; }
          .loc-mobile-panel { display: flex !important; }
        }
        @media (max-width: 768px) {
          .loc-desktop { display: none !important; }
          .loc-mobile-tabs { display: flex !important; }
        }
      `}</style>

      {/* Desktop layout */}
      <div
        className="loc-desktop"
        style={{
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          flex: 1,
          overflow: "hidden",
          minHeight: 0,
          display: "none",
        }}
      >
        <div style={{ borderRight: "1px solid #e5e7eb", overflowY: "auto" }}>
          <LocationsMapPanel locations={locations} onDelete={handleLocationDelete} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <LocationsChatPanel
            orgId={orgId}
            locations={locations}
            onLocationUpdate={handleLocationUpdate}
          />
        </div>
      </div>

      {/* Mobile layout — tab switcher */}
      <div className="loc-mobile-tabs" style={{ display: "none", flexDirection: "column", flex: 1, overflow: "hidden", minHeight: 0 }}>
        {/* Tab bar */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid #e5e7eb",
          background: "#fff",
          flexShrink: 0,
        }}>
          {(["map", "chat"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "0.75rem",
                border: "none",
                background: "transparent",
                fontSize: "0.85rem",
                fontWeight: activeTab === tab ? 700 : 400,
                color: activeTab === tab ? "#111827" : "#9ca3af",
                borderBottom: activeTab === tab ? "2px solid #111827" : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {tab === "map" ? `🗺️ Салбарууд (${locations.length})` : "💬 AI нэмэх"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {activeTab === "map" ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <LocationsMapPanel locations={locations} onDelete={handleLocationDelete} />
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <LocationsChatPanel
                orgId={orgId}
                locations={locations}
                onLocationUpdate={handleLocationUpdate}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
