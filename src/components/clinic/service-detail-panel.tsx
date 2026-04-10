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
      display: "inline-block",
      fontSize: "0.72rem",
      fontWeight: 600,
      padding: "2px 10px",
      borderRadius: "999px",
      background: bg,
      color: color,
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

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <label style={{
        display: "block",
        fontSize: "0.7rem",
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        fontWeight: 600,
        marginBottom: "0.3rem",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.45rem 0.65rem",
  fontSize: "0.875rem",
  border: "1px solid #e5e7eb",
  borderRadius: "0.5rem",
  outline: "none",
  color: "#111827",
  background: "#fff",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

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
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description ?? "");
  const [duration, setDuration] = useState(String(service.duration_minutes));
  const [price, setPrice] = useState(String(service.price_from));
  const [categoryId, setCategoryId] = useState(service.category_id ?? "");
  const [isBookable, setIsBookable] = useState(service.is_bookable);
  const [status, setStatus] = useState(service.status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const categoryMap = new Map<string, string>(categories.map((c) => [c.id, c.name]));
  const categoryLabel = service.category_id
    ? (categoryMap.get(service.category_id) ?? "Ангилалгүй")
    : "Ангилалгүй";

  const handleSave = async () => {
    setSaving(true);
    setFlash(null);
    try {
      const fields = {
        name: name.trim(),
        description: description.trim() || null,
        duration_minutes: Number(duration),
        price_from: Number(price),
        is_bookable: isBookable,
        status,
        category_id: categoryId || null,
      };
      const result = await updateServiceDirect(service.id, fields);
      if (result.error) {
        setFlash({ type: "error", msg: result.error });
      } else {
        onUpdate({ ...service, ...fields });
        setFlash({ type: "success", msg: "✓ Хадгалагдлаа" });
        setTimeout(() => setFlash(null), 3000);
      }
    } catch {
      setFlash({ type: "error", msg: "Алдаа гарлаа. Дахин оролдоно уу." });
    } finally {
      setSaving(false);
    }
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{
        padding: "0.875rem 1.25rem",
        borderBottom: "1px solid #f3f4f6",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        flexShrink: 0,
        background: "#fff",
      }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            cursor: "pointer",
            padding: "4px 10px",
            fontSize: "0.8rem",
            color: "#6b7280",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          ← Буцах
        </button>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {service.name}
        </h2>
      </div>

      {/* Status color bar */}
      <div style={{ height: "4px", background: STATUS_COLORS[service.status] ?? "#e5e7eb", flexShrink: 0 }} />

      {/* Flash message */}
      {flash && (
        <div style={{
          margin: "0.75rem 1.25rem 0",
          padding: "0.55rem 0.9rem",
          borderRadius: "0.5rem",
          fontSize: "0.82rem",
          fontWeight: 500,
          background: flash.type === "success" ? "#f0fdf4" : "#fef2f2",
          color: flash.type === "success" ? "#059669" : "#dc2626",
          border: `1px solid ${flash.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          flexShrink: 0,
        }}>
          {flash.msg}
        </div>
      )}

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.5rem",
          alignItems: "start",
        }}>
          {/* === Section 1: Info Display === */}
          <div style={{
            background: "#fafafa",
            border: "1px solid #f0f0f0",
            borderRadius: "0.875rem",
            padding: "1.25rem",
          }}>
            <p style={{
              margin: "0 0 1rem",
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}>
              Мэдээлэл
            </p>

            {/* Badges row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1rem" }}>
              {/* Category badge */}
              <Badge color="#6d28d9" bg="#ede9fe">
                {categoryLabel}
              </Badge>

              {/* Status badge */}
              <Badge
                color={STATUS_COLORS[service.status] ?? "#374151"}
                bg={`${STATUS_COLORS[service.status] ?? "#e5e7eb"}18`}
              >
                {STATUS_LABELS[service.status] ?? service.status}
              </Badge>

              {/* Online booking badge */}
              {service.is_bookable && (
                <Badge color="#2563eb" bg="#eff6ff">
                  ✓ Онлайн захиалга
                </Badge>
              )}
            </div>

            <div style={{ borderTop: "1px solid #eeeeee", paddingTop: "0.875rem" }}>
              <InfoRow label="Хугацаа" value={`${service.duration_minutes} мин`} />
              <InfoRow label="Үнэ" value={`₮${Number(service.price_from).toLocaleString()}`} />
              {service.description && (
                <div style={{ marginTop: "0.5rem" }}>
                  <p style={{ margin: 0, fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
                    Тайлбар
                  </p>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {service.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* === Section 2: Edit Form === */}
          <div style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "0.875rem",
            padding: "1.25rem",
          }}>
            <p style={{
              margin: "0 0 1rem",
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}>
              Засах
            </p>

            <FormField label="Нэр">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </FormField>

            <FormField label="Тайлбар">
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
              />
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <FormField label="Хугацаа (мин)">
                <input
                  type="number"
                  value={duration}
                  min={1}
                  onChange={(e) => setDuration(e.target.value)}
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Үнэ (₮)">
                <input
                  type="number"
                  value={price}
                  min={0}
                  onChange={(e) => setPrice(e.target.value)}
                  style={inputStyle}
                />
              </FormField>
            </div>

            <FormField label="Категори">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={selectStyle}
              >
                <option value="">Ангилалгүй</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Статус">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={selectStyle}
              >
                <option value="active">Идэвхтэй</option>
                <option value="inactive">Идэвхгүй</option>
                <option value="archived">Архивласан</option>
              </select>
            </FormField>

            <FormField label="Онлайн захиалга">
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isBookable}
                  onChange={(e) => setIsBookable(e.target.checked)}
                  style={{ width: "1rem", height: "1rem", cursor: "pointer", accentColor: "#6366f1" }}
                />
                <span style={{ fontSize: "0.875rem", color: "#374151" }}>
                  Онлайн захиалгад нээлттэй
                </span>
              </label>
            </FormField>

            <button
              onClick={() => void handleSave()}
              disabled={saving}
              style={{
                width: "100%",
                padding: "0.6rem 1rem",
                background: saving ? "#e5e7eb" : "#6366f1",
                color: saving ? "#9ca3af" : "#fff",
                border: "none",
                borderRadius: "0.6rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                transition: "background 0.15s",
                marginTop: "0.25rem",
              }}
            >
              {saving ? "Хадгалж байна..." : "Хадгалах"}
            </button>
          </div>
        </div>

        {/* Delete button at bottom */}
        <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #f3f4f6" }}>
          <button
            onClick={() => void handleDelete()}
            disabled={deleting}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              border: "1px solid #fecaca",
              borderRadius: "0.5rem",
              color: "#dc2626",
              fontSize: "0.82rem",
              fontWeight: 500,
              cursor: deleting ? "not-allowed" : "pointer",
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? "Устгаж байна..." : "🗑 Үйлчилгээ устгах"}
          </button>
        </div>
      </div>
    </div>
  );
}
