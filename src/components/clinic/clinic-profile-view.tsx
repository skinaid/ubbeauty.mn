"use client";

import type { ClinicProfile } from "@/modules/clinic/profile";

type Props = {
  profile: ClinicProfile | null;
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

export function ClinicProfileView({ profile }: Props) {
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
        <ProgressRing percent={completionPercent} />
      </div>

      {/* Completion label */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0 0.75rem" }}>
        <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
          {completedCount}/{totalCount} талбар бөглөгдсөн
        </span>
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

      {/* Edit fallback */}
      <div style={{ paddingTop: "1.25rem", paddingBottom: "0.5rem" }}>
        {/* TODO: wire to manual edit modal */}
        <button style={{
          width: "100%", fontSize: "0.8rem", color: "#9ca3af",
          border: "1.5px dashed #e5e7eb", borderRadius: "0.75rem",
          padding: "0.75rem", background: "transparent", cursor: "pointer",
        }}>
          ✏️ Гараар засварлах
        </button>
      </div>
    </div>
  );
}
