"use client";
import { useState } from "react";
import { deleteClinicLocation } from "@/modules/clinic/actions";

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

const DAY_LABELS: Record<string, string> = {
  mon: "Даваа", tue: "Мягмар", wed: "Лхагва",
  thu: "Пүрэв", fri: "Баасан", sat: "Бямба", sun: "Ням",
};

export function LocationsMapPanel({
  locations,
  onDelete,
}: {
  locations: ClinicLocation[];
  onDelete: (id: string) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Энэ салбарыг устгах уу?")) return;
    setDeletingId(id);
    const result = await deleteClinicLocation(id);
    if (result.error) {
      alert(result.error);
    } else {
      onDelete(id);
    }
    setDeletingId(null);
  };

  if (locations.length === 0) {
    return (
      <div style={{ padding: "3rem 2rem", textAlign: "center", color: "#9ca3af" }}>
        <p style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>📍</p>
        <p style={{ margin: 0, fontSize: "0.9rem" }}>Салбар бүртгэлгүй байна</p>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem" }}>Баруун талын AI chat-аар нэмнэ үү</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <p style={{ margin: 0, fontSize: "0.7rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {locations.length} салбар
      </p>
      {locations.map((loc) => (
        <div key={loc.id} style={{ border: "1px solid #e5e7eb", borderRadius: "0.75rem", overflow: "hidden" }}>
          {/* Map embed */}
          {loc.latitude && loc.longitude ? (
            <iframe
              src={`https://maps.google.com/maps?q=${loc.latitude},${loc.longitude}&z=16&output=embed`}
              width="100%"
              height="200"
              style={{ border: "none", display: "block" }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div style={{
              height: "160px", background: "#f9fafb", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#9ca3af", fontSize: "0.85rem", flexDirection: "column", gap: "0.25rem",
            }}>
              <span style={{ fontSize: "1.5rem" }}>🗺️</span>
              <span>Байршил тодорхойгүй</span>
            </div>
          )}
          {/* Info */}
          <div style={{ padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>{loc.name}</h3>
              <button
                onClick={() => void handleDelete(loc.id)}
                disabled={deletingId === loc.id}
                style={{
                  background: "transparent", border: "none", color: "#ef4444",
                  cursor: "pointer", fontSize: "0.75rem", padding: "2px 6px",
                  opacity: deletingId === loc.id ? 0.5 : 1,
                }}
              >
                {deletingId === loc.id ? "..." : "🗑"}
              </button>
            </div>
            {(loc.address_line1 || loc.district) && (
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.85rem", color: "#374151" }}>
                📍 {[loc.address_line1, loc.district, loc.city].filter(Boolean).join(", ")}
              </p>
            )}
            {loc.phone && (
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.85rem", color: "#374151" }}>
                📞 {loc.phone}
              </p>
            )}
            {loc.description && (
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", color: "#6b7280" }}>{loc.description}</p>
            )}
            {loc.working_hours && (
              <div style={{ marginTop: "0.5rem" }}>
                <p style={{ margin: "0 0 0.25rem", fontSize: "0.7rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ажлын цаг</p>
                {Object.entries(loc.working_hours).map(([day, hours]) => (
                  <p key={day} style={{ margin: "0.1rem 0", fontSize: "0.8rem", color: "#374151" }}>
                    {DAY_LABELS[day] ?? day}: {hours}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
