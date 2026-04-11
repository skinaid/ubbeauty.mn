"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { updateServiceDirect, deleteService } from "@/modules/clinic/actions";
import type { ServiceRecord } from "@/modules/clinic/service-types";

type Category = { id: string; name: string };

type ActiveTab = "info" | "cost" | "sales";

type SalesPeriod = "7d" | "30d" | "90d" | "1y" | "all";

type SalesItem = {
  id: string;
  created_at: string;
  patient_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  payment_status: string;
  currency: string;
};

type SalesSummary = {
  totalRevenue: number;
  totalSold: number;
  avgPrice: number;
  currency: string;
};

type SalesData = {
  summary: SalesSummary;
  items: SalesItem[];
};

type CostItem = {
  id: string;
  name: string;
  amount: number;
};

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

const PERIOD_LABELS: Record<SalesPeriod, string> = {
  "7d": "7 хоног",
  "30d": "30 хоног",
  "90d": "3 сар",
  "1y": "1 жил",
  all: "Бүгд",
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: "Төлсөн", color: "#059669", bg: "#f0fdf4" },
  unpaid: { label: "Төлөөгүй", color: "#dc2626", bg: "#fef2f2" },
  partial: { label: "Хэсэгчлэн", color: "#d97706", bg: "#fffbeb" },
  refunded: { label: "Буцаасан", color: "#6b7280", bg: "#f9fafb" },
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

// ── Image Upload Area ────────────────────────────────────────────────────────

function ImageUploadArea({
  service,
  onImageUpdate,
}: {
  service: ServiceRecord;
  onImageUpdate?: (serviceId: string, imageUrl: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Зөвхөн зураг оруулна уу.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      // 1. Get signed upload URL
      const postRes = await fetch("/api/clinic/service-image-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          fileName: file.name,
          mimeType: file.type,
        }),
      });
      const postData = await postRes.json() as { uploadUrl?: string; publicUrl?: string; error?: string };
      if (!postRes.ok || !postData.uploadUrl || !postData.publicUrl) {
        throw new Error(postData.error ?? "Upload URL авахад алдаа гарлаа");
      }

      // 2. PUT to Supabase Storage
      const putRes = await fetch(postData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Файл байршуулахад алдаа гарлаа");

      // 3. PATCH to save URL in DB
      const patchRes = await fetch("/api/clinic/service-image-upload", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, imageUrl: postData.publicUrl }),
      });
      const patchData = await patchRes.json() as { ok?: boolean; error?: string };
      if (!patchRes.ok || !patchData.ok) {
        throw new Error(patchData.error ?? "URL хадгалахад алдаа гарлаа");
      }

      onImageUpdate?.(service.id, postData.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  const triggerPicker = () => fileInputRef.current?.click();

  const inputId = `svc-img-${service.id}`;

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/*"
        disabled={uploading}
        style={{ display: "none" }}
        onChange={handleInputChange}
      />

      {service.image_url ? (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "180px",
            borderRadius: "0.75rem",
            overflow: "hidden",
            opacity: uploading ? 0.5 : 1,
            transition: "opacity 0.2s",
          }}
        >
          <Image
            src={service.image_url}
            alt={service.name}
            fill
            unoptimized
            style={{ objectFit: "cover" }}
          />
          <label
            htmlFor={inputId}
            style={{
              position: "absolute",
              bottom: "0.5rem",
              right: "0.5rem",
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              borderRadius: "0.5rem",
              padding: "4px 10px",
              fontSize: "0.75rem",
              cursor: uploading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              userSelect: "none",
            }}
          >
            {uploading ? "Байршуулж байна..." : "📷 Зураг солих"}
          </label>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          style={{
            display: "flex",
            height: "120px",
            border: "2px dashed #d1d5db",
            borderRadius: "0.75rem",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: uploading ? "not-allowed" : "pointer",
            opacity: uploading ? 0.5 : 1,
            transition: "opacity 0.2s, border-color 0.15s",
            gap: "0.4rem",
          }}
          onMouseEnter={(e) => {
            if (!uploading) (e.currentTarget as HTMLLabelElement).style.borderColor = "#6366f1";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLLabelElement).style.borderColor = "#d1d5db";
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>📷</span>
          <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 500 }}>
            {uploading ? "Байршуулж байна..." : "Зураг нэмэх"}
          </span>
        </label>
      )}

      {error && (
        <p style={{ margin: "0.4rem 0 0", fontSize: "0.75rem", color: "#dc2626" }}>{error}</p>
      )}
    </div>
  );
}

// ── Edit Dialog ──────────────────────────────────────────────────────────────

function EditDialog({
  service,
  categories,
  onClose,
  onSave,
}: {
  service: ServiceRecord;
  categories: Category[];
  onClose: () => void;
  onSave: (updated: ServiceRecord) => void;
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
        onSave({ ...service, ...fields } as ServiceRecord);
      }
    } catch {
      setError("Алдаа гарлаа. Дахин оролдоно уу.");
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
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

// ── Өртөг (Cost) Tab ─────────────────────────────────────────────────────────

let costIdCounter = 0;

function CostTab({ service }: { service: ServiceRecord }) {
  const [items, setItems] = useState<CostItem[]>(() => {
    try {
      const saved = localStorage.getItem("cost-" + service.id);
      return saved ? JSON.parse(saved) as CostItem[] : [];
    } catch {
      return [];
    }
  });

  const persistItems = (newItems: CostItem[]) => {
    try {
      localStorage.setItem("cost-" + service.id, JSON.stringify(newItems));
    } catch { /* ignore */ }
    setItems(newItems);
  };

  const addItem = () => {
    costIdCounter += 1;
    persistItems([...items, { id: String(costIdCounter), name: "", amount: 0 }]);
  };

  const updateItem = (id: string, field: "name" | "amount", value: string | number) => {
    persistItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeItem = (id: string) => {
    persistItems(items.filter((item) => item.id !== id));
  };

  const totalCost = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const priceFrom = Number(service.price_from) || 0;
  const profit = priceFrom - totalCost;
  const profitPct = priceFrom > 0 ? ((profit / priceFrom) * 100).toFixed(1) : "0.0";
  const profitColor = profit >= 0 ? "#059669" : "#dc2626";
  const profitBg = profit >= 0 ? "#f0fdf4" : "#fef2f2";

  return (
    <div style={{ padding: "1.5rem 1.25rem" }}>
      <p style={{ margin: "0 0 0.25rem", fontSize: "0.95rem", fontWeight: 700, color: "#111827" }}>
        Үйлчилгээний өртгийн тооцоолол
      </p>
      <p style={{ margin: "0 0 1.5rem", fontSize: "0.8rem", color: "#6b7280" }}>
        Тухайн үйлчилгээг үзүүлэхэд гарах зардлыг оруулж, ашгийн дүнг тооцоол.
      </p>

      {/* Cost rows */}
      {items.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          {/* Header */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 130px 32px",
            gap: "0.5rem", marginBottom: "0.5rem",
            padding: "0 0.25rem",
          }}>
            <span style={{ fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
              Зардлын нэр
            </span>
            <span style={{ fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
              Дүн (₮)
            </span>
            <span />
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "grid", gridTemplateColumns: "1fr 130px 32px",
                gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center",
              }}
            >
              <input
                type="text"
                placeholder="Жишээ: Serum, Хүний хөдөлмөр..."
                value={item.name}
                onChange={(e) => updateItem(item.id, "name", e.target.value)}
                style={{ ...inputStyle, padding: "0.4rem 0.65rem", fontSize: "0.82rem" }}
              />
              <input
                type="number"
                min={0}
                placeholder="0"
                value={item.amount === 0 ? "" : item.amount}
                onChange={(e) => updateItem(item.id, "amount", Number(e.target.value))}
                style={{ ...inputStyle, padding: "0.4rem 0.65rem", fontSize: "0.82rem" }}
              />
              <button
                onClick={() => removeItem(item.id)}
                style={{
                  background: "transparent", border: "1px solid #fecaca",
                  borderRadius: "0.375rem", color: "#dc2626", cursor: "pointer",
                  fontSize: "0.75rem", height: "32px", width: "32px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      <button
        onClick={addItem}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          padding: "0.45rem 1rem", background: "transparent",
          border: "1px dashed #d1d5db", borderRadius: "0.5rem",
          color: "#6b7280", fontSize: "0.82rem", cursor: "pointer",
          marginBottom: "1.5rem", fontFamily: "inherit",
        }}
      >
        + Зардал нэмэх
      </button>

      {/* Summary card */}
      <div style={{
        background: "#fafafa", border: "1px solid #f0f0f0",
        borderRadius: "0.75rem", padding: "1rem 1.125rem",
      }}>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
          Тооцоолол
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "#374151" }}>Нийт өртөг</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111827" }}>
              ₮{totalCost.toLocaleString()}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "#374151" }}>Борлуулалтын үнэ</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#6b7280" }}>
              ₮{priceFrom.toLocaleString()}
            </span>
          </div>

          <div style={{ height: "1px", background: "#e5e7eb", margin: "0.25rem 0" }} />

          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: profitBg, borderRadius: "0.5rem",
            padding: "0.5rem 0.75rem", margin: "0 -0.25rem",
          }}>
            <div>
              <span style={{ fontSize: "0.85rem", color: profitColor, fontWeight: 600 }}>Ашиг</span>
              <span style={{ fontSize: "0.72rem", color: profitColor, marginLeft: "0.4rem" }}>
                ({profitPct}%)
              </span>
            </div>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: profitColor }}>
              ₮{profit.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Борлуулалт (Sales) Tab ────────────────────────────────────────────────────

function SalesTab({ service }: { service: ServiceRecord }) {
  const [period, setPeriod] = useState<SalesPeriod>("30d");
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSales = useCallback(async (p: SalesPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clinic/services/${service.id}/sales?period=${p}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error((body.error as string | undefined) ?? "Серверийн алдаа");
      }
      const json = await res.json() as SalesData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, [service.id]);

  useEffect(() => {
    void fetchSales(period);
  }, [fetchSales, period]);

  const lastSale = data?.items?.[0];

  return (
    <div style={{ padding: "1.25rem" }}>
      {/* Period tabs */}
      <div style={{
        display: "flex", gap: "0.3rem",
        overflowX: "auto", marginBottom: "1.25rem",
        paddingBottom: "2px",
        scrollbarWidth: "none",
      }}>
        {(Object.keys(PERIOD_LABELS) as SalesPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: "0.35rem 0.85rem", fontSize: "0.78rem", fontWeight: 600,
              borderRadius: "999px", cursor: "pointer", flexShrink: 0,
              fontFamily: "inherit",
              background: period === p ? "#6366f1" : "transparent",
              color: period === p ? "#fff" : "#6b7280",
              border: period === p ? "1px solid #6366f1" : "1px solid #e5e7eb",
              transition: "all 0.15s",
            }}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af", fontSize: "0.85rem" }}>
          Уншиж байна...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{
          padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: "0.5rem", color: "#dc2626", fontSize: "0.82rem",
        }}>
          {error}
        </div>
      )}

      {/* Data */}
      {!loading && !error && data && (
        <>
          {/* Summary cards */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: "0.6rem", marginBottom: "1.25rem",
          }}>
            {[
              { label: "Нийт орлого", value: `₮${data.summary.totalRevenue.toLocaleString()}` },
              { label: "Нийт борлуулалт", value: `${data.summary.totalSold} удаа` },
              { label: "Дундаж үнэ", value: `₮${data.summary.avgPrice.toLocaleString()}` },
              {
                label: "Сүүлийн борлуулалт",
                value: lastSale
                  ? new Date(lastSale.created_at).toLocaleDateString("mn-MN", {
                      year: "numeric", month: "short", day: "numeric",
                    })
                  : "—",
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  background: "#fafafa", border: "1px solid #f0f0f0",
                  borderRadius: "0.625rem", padding: "0.75rem 0.875rem",
                }}
              >
                <p style={{ margin: "0 0 0.25rem", fontSize: "0.62rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
                  {label}
                </p>
                <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#111827" }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Sales list */}
          {data.items.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "2.5rem 1rem",
              color: "#9ca3af", fontSize: "0.85rem",
              background: "#fafafa", borderRadius: "0.75rem",
              border: "1px solid #f0f0f0",
            }}>
              Энэ хугацаанд борлуулалт байхгүй байна
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: "0.75rem", overflow: "hidden" }}>
              {/* Table header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 0.8fr 48px 0.8fr 80px",
                gap: "0.5rem",
                padding: "0.6rem 0.875rem",
                background: "#fafafa",
                borderBottom: "1px solid #f0f0f0",
              }}>
                {["Огноо", "Хэрэглэгч", "Тоо", "Нийт", "Төлөв"].map((h) => (
                  <span key={h} style={{ fontSize: "0.62rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
                    {h}
                  </span>
                ))}
              </div>

              {/* Rows */}
              {data.items.map((item, idx) => {
                const statusInfo = PAYMENT_STATUS_LABELS[item.payment_status] ?? {
                  label: item.payment_status, color: "#6b7280", bg: "#f9fafb",
                };
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 0.8fr 48px 0.8fr 80px",
                      gap: "0.5rem",
                      padding: "0.65rem 0.875rem",
                      alignItems: "center",
                      borderBottom: idx < data.items.length - 1 ? "1px solid #f9fafb" : "none",
                    }}
                  >
                    <span style={{ fontSize: "0.78rem", color: "#374151" }}>
                      {new Date(item.created_at).toLocaleDateString("mn-MN", {
                        month: "short", day: "numeric",
                      })}
                    </span>
                    <span style={{
                      fontSize: "0.78rem", color: "#374151",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {item.patient_name}
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "#374151", textAlign: "center" }}>
                      {item.quantity}
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "#111827", fontWeight: 600 }}>
                      ₮{item.line_total.toLocaleString()}
                    </span>
                    <span style={{
                      fontSize: "0.68rem", fontWeight: 600, padding: "2px 7px",
                      borderRadius: "999px", background: statusInfo.bg, color: statusInfo.color,
                      textAlign: "center", whiteSpace: "nowrap",
                    }}>
                      {statusInfo.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Detail Panel ────────────────────────────────────────────────────────

export function ServiceDetailPanel({
  service: initialService,
  categories,
  onBack,
  onUpdate,
  onDelete,
  onImageUpdate,
}: {
  service: ServiceRecord;
  categories: Category[];
  onBack: () => void;
  onUpdate: (updated: ServiceRecord) => void;
  onDelete: (id: string) => void;
  onImageUpdate?: (serviceId: string, imageUrl: string) => void;
}) {
  const [service, setService] = useState<ServiceRecord>(initialService);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("info");

  // Sync when parent changes selected service or updates fields (e.g. image_url)
  useEffect(() => {
    setService(initialService);
  }, [initialService]);

  const categoryMap = new Map<string, string>(categories.map((c) => [c.id, c.name]));
  const categoryLabel = service.category_id
    ? (categoryMap.get(service.category_id) ?? "Ангилалгүй")
    : "Ангилалгүй";

  const handleSaveFromDialog = (updated: ServiceRecord) => {
    setEditOpen(false);
    setService(updated);
    onUpdate(updated);
    setFlash({ type: "success", msg: "✓ Хадгалагдлаа" });
    setTimeout(() => setFlash(null), 3000);
  };

  const handleImageUpdate = (serviceId: string, imageUrl: string) => {
    const updated = { ...service, image_url: imageUrl };
    setService(updated);
    onUpdate(updated);
    onImageUpdate?.(serviceId, imageUrl);
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

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "info", label: "Мэдээлэл" },
    { key: "cost", label: "Өртөг" },
    { key: "sales", label: "Борлуулалт" },
  ];

  return (
    <>
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

        {/* Tab bar */}
        <div style={{
          display: "flex", borderBottom: "1px solid #f3f4f6",
          background: "#fff", flexShrink: 0,
          overflowX: "auto", scrollbarWidth: "none",
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "0.65rem 1.1rem",
                fontSize: "0.82rem", fontWeight: 600,
                border: "none", background: "transparent",
                cursor: "pointer", flexShrink: 0,
                fontFamily: "inherit",
                color: activeTab === tab.key ? "#6366f1" : "#6b7280",
                borderBottom: activeTab === tab.key ? "2px solid #6366f1" : "2px solid transparent",
                marginBottom: "-1px",
                transition: "color 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

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
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* ── Tab: Мэдээлэл ── */}
          {activeTab === "info" && (
            <div style={{ padding: "1.5rem 1.25rem" }}>
              {/* Cover image upload */}
              <ImageUploadArea service={service} onImageUpdate={handleImageUpdate} />

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
          )}

          {/* ── Tab: Өртөг ── */}
          {activeTab === "cost" && <CostTab service={service} />}

          {/* ── Tab: Борлуулалт ── */}
          {activeTab === "sales" && <SalesTab service={service} />}
        </div>
      </div>
    </>
  );
}
