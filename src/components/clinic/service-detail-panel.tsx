"use client";
import { useState } from "react";
import { updateServiceDirect, deleteService } from "@/modules/clinic/actions";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_from: number;
  currency: string;
  is_bookable: boolean;
  status: string;
  location_id: string | null;
  category_id: string | null;
};

type Category = { id: string; name: string };

const STATUS_COLORS: Record<string, string> = {
  active: "#059669",
  inactive: "#9ca3af",
  archived: "#ef4444",
};
const STATUS_LABELS: Record<string, string> = {
  active: "Идэвхтэй",
  inactive: "Идэвхгүй",
  archived: "Архивласан",
};

function Badge({ color, bg, children }: { color: string; bg: string; children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-block", fontSize: "0.72rem", fontWeight: 600,
      padding: "2px 10px", borderRadius: "999px", background: bg, color,
    }}>
      {children}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <p style={{ margin: 0, fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ margin: "0.15rem 0 0", fontSize: "0.9rem", color: "#111827", lineHeight: 1.5 }}>
        {value}
      </p>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <label style={{
        display: "block", fontSize: "0.7rem", color: "#6b7280",
        textTransform: "uppercase", letterSpacing: "0.07em",
        fontWeight: 600, marginBottom: "0.3rem",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.5rem 0.75rem", fontSize: "0.875rem",
  border: "1px solid #e5e7eb", borderRadius: "0.5rem", outline: "none",
  color: "#111827", background: "#fff", boxSizing: "border-box",
  fontFamily: "inherit",
};

// ── Edit Dialog ──────────────────────────────────────────────────────────────

function EditDialog({
  service,
  categories,
  onClose,
  onSave,
}: {
  service: Service;
  categories: Category[];
  onClose: () => void;
  onSave: (updated: Service) => void;
}) {
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description ?? "");
  const [duration, setDuration] = useState(String(service.duration_minutes));
  const [price, setPrice] = useState(String(service.price_from));
  const [categoryId, setCategoryId] = useState(service.category_id ?? "");
  const [isBookable, setIsBookable] = useState(service.is_bookable);
  const [status, setStatus] = useState(service.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const fields = {
      name: name.trim(),
      description: description.trim() || null,
      duration_minutes: Number(duration),
      price_from: Number(price),
      is_bookable: isBookable,
      status,
      category_id: categoryId || null,
    };
    try {
      const result = await updateServiceDirect(service.id, fields);
      if (result.error) {
        setError(result.error);
        setSaving(false);
      } else {
        onSave({ ...service, ...fields });
      }
    } catch {
      setError("Алдаа гарлаа. Дахин оролдоно уу.");
      setSaving(false);
    }
  };

  return (
    // Overlay
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      {/* Dialog */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: "1rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          width: "100%", maxWidth: "480px",
          maxHeight: "90vh", display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Dialog header */}
        <div style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid #f3f4f6",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
            Засах — {service.name}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontSize: "1.2rem", color: "#9ca3af", lineHeight: 1, padding: "2px 6px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Dialog body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
          {error && (
            <div style={{
              marginBottom: "1rem", padding: "0.55rem 0.9rem",
              background: "#fef2f2", color: "#dc2626",
              border: "1px solid #fecaca", borderRadius: "0.5rem",
              fontSize: "0.82rem",
            }}>
              {error}
            </div>
          )}

          <FormField label="Нэр">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </FormField>

          <FormField label="Тайлбар">
            <textarea
              rows={3} value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <FormField label="Хугацаа (мин)">
              <input type="number" value={duration} min={1}
                onChange={(e) => setDuration(e.target.value)} style={inputStyle} />
            </FormField>
            <FormField label="Үнэ (₮)">
              <input type="number" value={price} min={0}
                onChange={(e) => setPrice(e.target.value)} style={inputStyle} />
            </FormField>
          </div>

          <FormField label="Категори">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Ангилалгүй</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Статус">
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="active">Идэвхтэй</option>
              <option value="inactive">Идэвхгүй</option>
              <option value="archived">Архивласан</option>
            </select>
          </FormField>

          <FormField label="Онлайн захиалга">
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input type="checkbox" checked={isBookable}
                onChange={(e) => setIsBookable(e.target.checked)}
                style={{ width: "1rem", height: "1rem", cursor: "pointer", accentColor: "#6366f1" }}
              />
              <span style={{ fontSize: "0.875rem", color: "#374151" }}>
                Онлайн захиалгад нээлттэй
              </span>
            </label>
          </FormField>
        </div>

        {/* Dialog footer */}
        <div style={{
          padding: "0.875rem 1.25rem",
          borderTop: "1px solid #f3f4f6",
          display: "flex", gap: "0.75rem", justifyContent: "flex-end",
          flexShrink: 0, background: "#fafafa",
        }}>
          <button onClick={onClose} style={{
            padding: "0.5rem 1.25rem", background: "transparent",
            border: "1px solid #e5e7eb", borderRadius: "0.5rem",
            fontSize: "0.875rem", color: "#6b7280", cursor: "pointer",
          }}>
            Болих
          </button>
          <button onClick={() => void handleSave()} disabled={saving} style={{
            padding: "0.5rem 1.5rem",
            background: saving ? "#c7d2fe" : "#6366f1",
            color: "#fff", border: "none",
            borderRadius: "0.5rem", fontSize: "0.875rem",
            fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
          }}>
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Detail Panel ────────────────────────────────────────────────────────

export function ServiceDetailPanel({
  service,
  categories,
  onBack,
  onUpdate,
  onDelete,
}: {
  service: Service;
  categories: Category[];
  onBack: () => void;
  onUpdate: (updated: Service) => void;
  onDelete: (id: string) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const categoryMap = new Map<string, string>(categories.map((c) => [c.id, c.name]));
  const categoryLabel = service.category_id
    ? (categoryMap.get(service.category_id) ?? "Ангилалгүй")
    : "Ангилалгүй";

  const handleSaveFromDialog = (updated: Service) => {
    setEditOpen(false);
    onUpdate(updated);
    setFlash({ type: "success", msg: "✓ Хадгалагдлаа" });
    setTimeout(() => setFlash(null), 3000);
  };

  const handleDelete = async () => {
    if (!confirm(`"${service.name}" үйлчилгээг устгах уу?`)) return;
    setDeleting(true);
    try {
      const result = await deleteService(service.id);
      if (result.error) {
        setFlash({ type: "error", msg: result.error });
        setDeleting(false);
      } else {
        onDelete(service.id);
        onBack();
      }
    } catch {
      setFlash({ type: "error", msg: "Устгахад алдаа гарлаа." });
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Edit dialog */}
      {editOpen && (
        <EditDialog
          service={service}
          categories={categories}
          onClose={() => setEditOpen(false)}
          onSave={handleSaveFromDialog}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{
          padding: "0.875rem 1.25rem", borderBottom: "1px solid #f3f4f6",
          display: "flex", alignItems: "center", gap: "0.75rem",
          flexShrink: 0, background: "#fff",
        }}>
          <button onClick={onBack} style={{
            background: "transparent", border: "1px solid #e5e7eb",
            borderRadius: "0.5rem", cursor: "pointer",
            padding: "4px 10px", fontSize: "0.8rem", color: "#6b7280",
          }}>
            ← Буцах
          </button>
          <h2 style={{
            margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827",
            flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {service.name}
          </h2>
          <button
            onClick={() => setEditOpen(true)}
            style={{
              background: "#6366f1", color: "#fff", border: "none",
              borderRadius: "0.5rem", cursor: "pointer",
              padding: "6px 14px", fontSize: "0.8rem", fontWeight: 600,
              flexShrink: 0,
            }}
          >
            ✏️ Засах
          </button>
        </div>

        {/* Status color bar */}
        <div style={{ height: "4px", background: STATUS_COLORS[service.status] ?? "#e5e7eb", flexShrink: 0 }} />

        {/* Flash */}
        {flash && (
          <div style={{
            margin: "0.75rem 1.25rem 0", padding: "0.55rem 0.9rem",
            borderRadius: "0.5rem", fontSize: "0.82rem", fontWeight: 500,
            background: flash.type === "success" ? "#f0fdf4" : "#fef2f2",
            color: flash.type === "success" ? "#059669" : "#dc2626",
            border: `1px solid ${flash.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            flexShrink: 0,
          }}>
            {flash.msg}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 1.25rem" }}>
          {/* Badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.25rem" }}>
            <Badge color="#6d28d9" bg="#ede9fe">{categoryLabel}</Badge>
            <Badge
              color={STATUS_COLORS[service.status] ?? "#374151"}
              bg={`${STATUS_COLORS[service.status] ?? "#e5e7eb"}18`}
            >
              {STATUS_LABELS[service.status] ?? service.status}
            </Badge>
            {service.is_bookable && (
              <Badge color="#2563eb" bg="#eff6ff">✓ Онлайн захиалга</Badge>
            )}
          </div>

          {/* Info grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: "0.5rem 2rem", marginBottom: "1.25rem",
          }}>
            <InfoRow label="Хугацаа" value={`${service.duration_minutes} мин`} />
            <InfoRow label="Үнэ" value={`₮${Number(service.price_from).toLocaleString()}`} />
          </div>

          {service.description && (
            <div style={{
              background: "#fafafa", border: "1px solid #f0f0f0",
              borderRadius: "0.75rem", padding: "1rem 1.125rem",
              marginBottom: "1.25rem",
            }}>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
                Тайлбар
              </p>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {service.description}
              </p>
            </div>
          )}

          {/* Delete */}
          <div style={{ paddingTop: "1rem", borderTop: "1px solid #f3f4f6" }}>
            <button
              onClick={() => void handleDelete()}
              disabled={deleting}
              style={{
                padding: "0.45rem 1rem", background: "transparent",
                border: "1px solid #fecaca", borderRadius: "0.5rem",
                color: "#dc2626", fontSize: "0.8rem", fontWeight: 500,
                cursor: deleting ? "not-allowed" : "pointer",
                opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting ? "Устгаж байна..." : "🗑 Үйлчилгээ устгах"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
