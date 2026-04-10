"use client";
import { useState } from "react";
import { deleteService } from "@/modules/clinic/actions";

type Service = {
  id: string; name: string; description: string | null;
  duration_minutes: number; price_from: number; currency: string;
  is_bookable: boolean; status: string;
};

const STATUS_COLORS: Record<string, string> = { active: "#059669", inactive: "#9ca3af", archived: "#ef4444" };
const STATUS_LABELS: Record<string, string> = { active: "Идэвхтэй", inactive: "Идэвхгүй", archived: "Архивласан" };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <p style={{ margin: 0, fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500 }}>{label}</p>
      <p style={{ margin: "0.1rem 0 0", fontSize: "0.85rem", color: "#111827", lineHeight: 1.4 }}>{value}</p>
    </div>
  );
}

export function ServicesListPanel({ services, onDelete }: { services: Service[]; onDelete: (id: string) => void }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Энэ үйлчилгээг устгах уу?")) return;
    setDeletingId(id);
    try {
      const result = await deleteService(id);
      if (result.error) {
        console.error("deleteService error:", result.error);
        alert(result.error);
      } else {
        onDelete(id);
      }
    } catch (err) {
      console.error("deleteService threw:", err);
      alert("Устгах үед алдаа гарлаа. Console-с дэлгэрэнгүй харна уу.");
    } finally {
      setDeletingId(null);
    }
  };

  if (services.length === 0) {
    return (
      <div style={{ padding: "3rem 2rem", textAlign: "center", color: "#9ca3af" }}>
        <p style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>💆</p>
        <p style={{ margin: 0, fontSize: "0.9rem" }}>Үйлчилгээ бүртгэлгүй байна</p>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem" }}>AI chat-аар нэмнэ үү →</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p style={{ margin: 0, fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {services.length} үйлчилгээ
      </p>
      {services.map((s) => (
        <div key={s.id} style={{ border: "1px solid #e5e7eb", borderRadius: "1rem", overflow: "hidden", background: "#fff" }}>
          <div style={{ height: "4px", background: STATUS_COLORS[s.status] ?? "#e5e7eb" }} />
          <div style={{ padding: "1rem 1.125rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827" }}>{s.name}</h3>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: `${STATUS_COLORS[s.status] ?? "#e5e7eb"}18`, color: STATUS_COLORS[s.status] ?? "#374151" }}>
                    {STATUS_LABELS[s.status] ?? s.status}
                  </span>
                  {s.is_bookable && (
                    <span style={{ fontSize: "0.72rem", color: "#2563eb", background: "#eff6ff", padding: "2px 8px", borderRadius: "999px", fontWeight: 500 }}>
                      ✓ Онлайн захиалга
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => void handleDelete(s.id)}
                disabled={deletingId === s.id}
                style={{ background: "transparent", border: "1px solid #fecaca", borderRadius: "0.4rem", color: "#ef4444", cursor: deletingId === s.id ? "not-allowed" : "pointer", fontSize: "0.75rem", padding: "3px 8px", opacity: deletingId === s.id ? 0.5 : 1 }}
              >
                {deletingId === s.id ? "..." : "Устгах"}
              </button>
            </div>
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "0.75rem" }}>
              <Field label="Үргэлжлэх хугацаа" value={`${s.duration_minutes} мин`} />
              <Field label="Үнэ" value={`₮${Number(s.price_from).toLocaleString()}`} />
              {s.description && <Field label="Тайлбар" value={s.description} />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
