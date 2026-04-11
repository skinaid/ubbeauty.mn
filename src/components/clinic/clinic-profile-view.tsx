"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ClinicProfile, UpdateClinicProfileInput } from "@/modules/clinic/profile";
import { updateClinicProfile } from "@/modules/clinic/profile";

type Props = {
  profile: ClinicProfile | null;
  onProfileUpdate?: (fields: Record<string, unknown>) => void;
  /** Controlled edit modal state — driven by parent */
  editOpen?: boolean;
  onEditClose?: () => void;
};

const emDash = "—";

function ProgressRing({ percent }: { percent: number }) {
  const size = 60;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color = percent === 100 ? "#10b981" : "#6366f1";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <span style={{ position: "absolute", fontSize: "0.65rem", fontWeight: 700, color: "#374151" }}>
        {percent}%
      </span>
    </div>
  );
}

function SectionHeader({ title, first }: { title: string; first?: boolean }) {
  return (
    <h3 style={{
      fontSize: "0.7rem",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      color: "#9ca3af",
      margin: first ? "0.5rem 0 0.5rem" : "1.25rem 0 0.5rem",
    }}>
      {title}
    </h3>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "0.6rem 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "0.2rem" }}>
        {label}
      </span>
      <div style={{ fontSize: "0.875rem", color: "#111827", lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}

function EmptyVal() {
  return <span style={{ color: "#d1d5db" }}>{emDash}</span>;
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#f9fafb", borderRadius: "0.75rem", padding: "0 1rem" }}>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────
// Edit Modal
// ──────────────────────────────────────────────

type EditField = {
  key: keyof UpdateClinicProfileInput;
  label: string;
  type?: "text" | "textarea" | "number" | "url" | "tel";
  placeholder?: string;
  prefix?: string;
};

const EDIT_FIELDS: EditField[] = [
  { key: "name", label: "Эмнэлгийн нэр", type: "text", placeholder: "Жишээ: Гэрэл Клиник" },
  { key: "tagline", label: "Уриа үг", type: "text", placeholder: "Жишээ: Эрүүл мэндийн найдвартай түнш" },
  { key: "phone", label: "Утасны дугаар", type: "tel", placeholder: "+976 9900 0000" },
  { key: "website", label: "Вебсайт", type: "url", placeholder: "https://example.mn" },
  { key: "address", label: "Хаяг", type: "text", placeholder: "Гудамж, байр, тоот" },
  { key: "city", label: "Хот / Дүүрэг", type: "text", placeholder: "Улаанбаатар" },
  { key: "description", label: "Тайлбар", type: "textarea", placeholder: "Эмнэлгийн тухай дэлгэрэнгүй мэдээлэл..." },
  { key: "social_instagram", label: "Instagram хэрэглэгчийн нэр", type: "text", placeholder: "mybeautyclinic", prefix: "@" },
  { key: "social_facebook", label: "Facebook холбоос / нэр", type: "text", placeholder: "facebook.com/mybeautyclinic" },
  { key: "founded_year", label: "Үүсгэн байгуулагдсан он", type: "number", placeholder: "2018" },
  { key: "staff_count", label: "Ажилтны тоо", type: "number", placeholder: "10" },
];

function inputStyle(multiline = false): React.CSSProperties {
  return {
    width: "100%",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    border: "1.5px solid #e5e7eb",
    borderRadius: "0.5rem",
    outline: "none",
    color: "#111827",
    background: "#fff",
    boxSizing: "border-box",
    resize: multiline ? "vertical" : undefined,
    minHeight: multiline ? "5rem" : undefined,
    fontFamily: "inherit",
  };
}

function labelStyle(): React.CSSProperties {
  return {
    display: "block",
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#6b7280",
    marginBottom: "0.3rem",
  };
}

type EditModalProps = {
  profile: ClinicProfile;
  onClose: () => void;
  onSaved: (fields: Record<string, unknown>) => void;
};

function EditModal({ profile, onClose, onSaved }: EditModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of EDIT_FIELDS) {
      const val = profile[f.key as keyof ClinicProfile];
      init[f.key] = val != null ? String(val) : "";
    }
    return init;
  });

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fields: UpdateClinicProfileInput = {};
    for (const f of EDIT_FIELDS) {
      const raw = form[f.key]?.trim();
      if (f.type === "number") {
        fields[f.key] = raw ? (Number(raw) as never) : (null as never);
      } else {
        fields[f.key] = (raw || null) as never;
      }
    }

    startTransition(async () => {
      const result = await updateClinicProfile(fields);
      if (result.error) {
        setError(result.error);
      } else {
        onSaved(fields as Record<string, unknown>);
        onClose();
      }
    });
  }

  if (!mounted) return null;

  return createPortal(
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "1.25rem",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid #f3f4f6",
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
              ✏️ Профайл засварлах
            </h2>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#9ca3af" }}>
              Мэдээллүүдийг шинэчилж хадгална уу
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#f3f4f6", border: "none", borderRadius: "50%",
              width: "2rem", height: "2rem", cursor: "pointer",
              fontSize: "1rem", color: "#6b7280",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable form body */}
        <form
          id="profile-edit-form"
          onSubmit={handleSubmit}
          style={{ overflowY: "auto", flex: 1, padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          {EDIT_FIELDS.map((field) => (
            <div key={field.key}>
              <label style={labelStyle()}>{field.label}</label>
              {field.type === "textarea" ? (
                <textarea
                  value={form[field.key] ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  style={inputStyle(true)}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  {field.prefix && (
                    <span style={{ fontSize: "0.875rem", color: "#9ca3af", flexShrink: 0 }}>{field.prefix}</span>
                  )}
                  <input
                    type={field.type ?? "text"}
                    value={form[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    style={inputStyle()}
                  />
                </div>
              )}
            </div>
          ))}

          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: "0.5rem", padding: "0.75rem 1rem",
              fontSize: "0.8rem", color: "#dc2626",
            }}>
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{
          display: "flex", gap: "0.75rem", justifyContent: "flex-end",
          padding: "1rem 1.5rem",
          borderTop: "1px solid #f3f4f6",
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            style={{
              padding: "0.6rem 1.25rem", fontSize: "0.875rem", fontWeight: 500,
              border: "1.5px solid #e5e7eb", borderRadius: "0.625rem",
              background: "#fff", color: "#374151", cursor: "pointer",
            }}
          >
            Цуцлах
          </button>
          <button
            type="submit"
            form="profile-edit-form"
            disabled={isPending}
            style={{
              padding: "0.6rem 1.25rem", fontSize: "0.875rem", fontWeight: 600,
              border: "none", borderRadius: "0.625rem",
              background: isPending ? "#a5b4fc" : "#6366f1",
              color: "#fff", cursor: isPending ? "not-allowed" : "pointer",
              minWidth: "5rem",
            }}
          >
            {isPending ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ──────────────────────────────────────────────
// Main ClinicProfileView
// ──────────────────────────────────────────────

export function ClinicProfileView({ profile, onProfileUpdate, editOpen = false, onEditClose }: Props) {

  const completionFields = [
    profile?.tagline,
    profile?.description,
    profile?.phone,
    profile?.website,
    profile?.address,
    profile?.city,
    profile?.services_summary?.length ? profile.services_summary : null,
  ];
  const completedCount = completionFields.filter((v) => v != null && v !== "").length;
  const totalCount = completionFields.length;
  const completionPercent = Math.round((completedCount / totalCount) * 100);
  const addressValue = [profile?.address, profile?.city].filter(Boolean).join(", ");

  function handleSaved(fields: Record<string, unknown>) {
    onProfileUpdate?.(fields);
  }

  if (!profile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 1rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏥</div>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#111827", margin: "0 0 0.5rem" }}>Профайл олдсонгүй</h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", maxWidth: "20rem", lineHeight: 1.6 }}>
          Баруун талын AI туслахтай ярилцаж эмнэлгийнхээ профайлыг бөглөнө үү.
        </p>
      </div>
    );
  }

  return (
    <>
      {editOpen && profile && (
        <EditModal
          profile={profile}
          onClose={() => onEditClose?.()}
          onSaved={handleSaved}
        />
      )}

      <div style={{ display: "grid", gap: 0 }}>
        {/* Identity header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", paddingBottom: "1rem", marginBottom: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{
            width: "3rem", height: "3rem", borderRadius: "0.75rem", flexShrink: 0,
            background: "linear-gradient(135deg, #818cf8, #a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: "1.25rem", fontWeight: 800,
          }}>
            {profile.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {profile.name || "Нэргүй эмнэлэг"}
            </h2>
            {profile.tagline ? (
              <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem", color: "#6b7280" }}>{profile.tagline}</p>
            ) : (
              <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem", color: "#d1d5db", fontStyle: "italic" }}>Уриа үг нэмэгдээгүй...</p>
            )}
          </div>

        </div>

        {/* Completion label */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0 0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <ProgressRing percent={completionPercent} />
            <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
              {completedCount}/{totalCount} талбар бөглөгдсөн
            </span>
          </div>
          {completionPercent === 100 ? (
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#10b981", background: "#ecfdf5", padding: "0.2rem 0.6rem", borderRadius: "999px" }}>
              ✓ Бүрэн
            </span>
          ) : (
            <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{100 - completionPercent}% үлдлээ</span>
          )}
        </div>

        {/* Contact */}
        <SectionHeader title="Холбоо барих" first />
        <Section>
          <FieldRow label="Утас">
            {profile.phone
              ? <a href={`tel:${profile.phone}`} style={{ color: "#6366f1", textDecoration: "none" }}>{profile.phone}</a>
              : <EmptyVal />}
          </FieldRow>
          <FieldRow label="Вебсайт">
            {profile.website
              ? <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ color: "#6366f1", textDecoration: "none", wordBreak: "break-all" }}>{profile.website}</a>
              : <EmptyVal />}
          </FieldRow>
          <FieldRow label="Хаяг">
            {addressValue || <EmptyVal />}
          </FieldRow>
        </Section>

        {/* Working hours */}
        <SectionHeader title="Ажлын цаг" />
        <Section>
          <div style={{ padding: "0.6rem 0" }}>
            {profile.working_hours && Object.keys(profile.working_hours).length > 0 ? (
              Object.entries(profile.working_hours).map(([day, time]) => (
                <div key={day} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.2rem 0" }}>
                  <span style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: 500, minWidth: "5rem" }}>{day}</span>
                  <span style={{ fontSize: "0.875rem", color: "#111827" }}>{time}</span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: "0.875rem", color: "#d1d5db" }}>{emDash}</span>
            )}
          </div>
        </Section>

        {/* Social */}
        <SectionHeader title="Сошиал сувгууд" />
        <Section>
          <FieldRow label="Instagram">
            {profile.social_instagram
              ? <span>@{profile.social_instagram.replace(/^@/, "")}</span>
              : <EmptyVal />}
          </FieldRow>
          <FieldRow label="Facebook">
            {profile.social_facebook || <EmptyVal />}
          </FieldRow>
        </Section>

        {/* About */}
        <SectionHeader title="Байгууллагын тухай" />
        <Section>
          <FieldRow label="Тайлбар">
            {profile.description
              ? <span style={{ whiteSpace: "pre-line" }}>{profile.description}</span>
              : <EmptyVal />}
          </FieldRow>
          <FieldRow label="Үйлчилгээ">
            {profile.services_summary?.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", paddingTop: "0.25rem" }}>
                {profile.services_summary.map((s, i) => (
                  <span key={i} style={{ fontSize: "0.75rem", background: "#eef2ff", color: "#4f46e5", padding: "0.15rem 0.6rem", borderRadius: "999px", fontWeight: 500 }}>
                    {s}
                  </span>
                ))}
              </div>
            ) : <EmptyVal />}
          </FieldRow>
          <FieldRow label="Үүсгэн байгуулагдсан">
            {profile.founded_year != null ? String(profile.founded_year) : <EmptyVal />}
          </FieldRow>
          <FieldRow label="Ажилтны тоо">
            {profile.staff_count != null ? `${profile.staff_count} хүн` : <EmptyVal />}
          </FieldRow>
        </Section>


      </div>
    </>
  );
}
