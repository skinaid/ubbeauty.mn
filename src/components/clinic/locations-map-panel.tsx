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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: "0.6rem" }}>
      <p style={{ margin: 0, fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500 }}>
        {label}
      </p>
      <p style={{ margin: "0.15rem 0 0", fontSize: "0.88rem", color: "#111827", lineHeight: 1.4 }}>
        {value}
      </p>
    </div>
  );
}

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
    if (result.error) alert(result.error);
    else onDelete(id);
    setDeletingId(null);
  };

  if (locations.length === 0) {
    return (
      <div style={{ padding: "3rem 2rem", textAlign: "center", color: "#9ca3af" }}>
        <p style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>📍</p>
        <p style={{ margin: 0, fontSize: "0.9rem" }}>Салбар бүртгэлгүй байна</p>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem" }}>AI chat-аар нэмнэ үү →</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <p style={{ margin: 0, fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {locations.length} салбар бүртгэлтэй
      </p>

      {locations.map((loc) => (
        <div
          key={loc.id}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "1rem",
            overflow: "hidden",
            background: "#fff",
          }}
        >
          {/* Map */}
          {loc.latitude && loc.longitude ? (
            <iframe
              src={`https://maps.google.com/maps?q=${loc.latitude},${loc.longitude}&z=16&output=embed`}
              width="100%"
              height="220"
              style={{ border: "none", display: "block" }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div style={{
              height: "140px", background: "#f3f4f6",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: "0.25rem", color: "#9ca3af",
            }}>
              <span style={{ fontSize: "1.75rem" }}>🗺️</span>
              <span style={{ fontSize: "0.8rem" }}>Байршил тодорхойгүй</span>
            </div>
          )}

          {/* Info section */}
          <div style={{ padding: "1rem 1.125rem" }}>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
                {loc.name}
              </h3>
              <button
                onClick={() => void handleDelete(loc.id)}
                disabled={deletingId === loc.id}
                style={{
                  background: "transparent", border: "1px solid #fecaca",
                  borderRadius: "0.4rem", color: "#ef4444",
                  cursor: deletingId === loc.id ? "not-allowed" : "pointer",
                  fontSize: "0.75rem", padding: "3px 8px",
                  opacity: deletingId === loc.id ? 0.5 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {deletingId === loc.id ? "..." : "Устгах"}
              </button>
            </div>

            {/* Fields */}
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "0.875rem", display: "flex", flexDirection: "column", gap: "0" }}>
              {(loc.address_line1 || loc.district) && (
                <Field label="Хаяг" value={[loc.address_line1, loc.district, loc.city].filter(Boolean).join(", ")} />
              )}
              {loc.phone && (
                <Field label="Утас" value={loc.phone} />
              )}
              {loc.description && (
                <Field label="Тайлбар" value={loc.description} />
              )}
              {loc.latitude && loc.longitude && (
                <Field label="GPS" value={`${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`} />
              )}
              {loc.working_hours && Object.keys(loc.working_hours).length > 0 && (
                <div style={{ marginBottom: "0.6rem" }}>
                  <p style={{ margin: 0, fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500 }}>
                    Ажлын цаг
                  </p>
                  <div style={{ marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                    {Object.entries(loc.working_hours).map(([day, hours]) => (
                      <div key={day} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#374151" }}>
                        <span style={{ color: "#6b7280", minWidth: "60px" }}>{DAY_LABELS[day] ?? day}</span>
                        <span style={{ fontWeight: 500 }}>{hours}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
