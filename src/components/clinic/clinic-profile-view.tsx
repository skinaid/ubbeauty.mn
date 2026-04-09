"use client";

import type { ClinicProfile } from "@/modules/clinic/profile";

type Props = {
  profile: ClinicProfile | null;
};

const labelStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "0.7rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "0.2rem",
  display: "block",
};

const valueStyle: React.CSSProperties = {
  fontSize: "0.95rem",
  color: "#111827",
  fontWeight: 400,
};

const emDash = "—";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: "0.15rem" }}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value || emDash}</span>
    </div>
  );
}

function Divider() {
  return (
    <hr
      style={{
        border: "none",
        borderTop: "1px solid #f3f4f6",
        margin: "0.75rem 0",
      }}
    />
  );
}

function formatWorkingHours(hours: Record<string, string> | null): string {
  if (!hours || Object.keys(hours).length === 0) return "";
  return Object.entries(hours)
    .map(([day, time]) => `${day}: ${time}`)
    .join("\n");
}

function WorkingHoursValue({ hours }: { hours: Record<string, string> | null }) {
  const text = formatWorkingHours(hours);
  if (!text) return <span style={valueStyle}>{emDash}</span>;
  return (
    <span style={{ ...valueStyle, whiteSpace: "pre-line" }}>
      {text}
    </span>
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

  return (
    <div style={{ display: "grid", gap: "0" }}>
      {/* Completion bar */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.4rem",
          }}
        >
          <span style={{ ...labelStyle, marginBottom: 0 }}>Профайл бүрэн байдал</span>
          <span style={{ fontSize: "0.8rem", color: "#374151", fontWeight: 500 }}>
            {completedCount}/{totalCount} бүрэн
          </span>
        </div>
        <div
          style={{
            height: "4px",
            background: "#f3f4f6",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${completionPercent}%`,
              background: completionPercent === 100 ? "#10b981" : "#6366f1",
              borderRadius: "999px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      <Field label="Нэр" value={profile?.name} />
      <Divider />
      <Field label="Уриа үг" value={profile?.tagline} />
      <Divider />
      <Field label="Тайлбар" value={profile?.description} />
      <Divider />
      <Field label="Утас" value={profile?.phone} />
      <Divider />
      <Field
        label="Вебсайт"
        value={
          profile?.website ? (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...valueStyle, color: "#6366f1" }}
            >
              {profile.website}
            </a>
          ) : null
        }
      />
      <Divider />
      <Field label="Хаяг" value={addressValue || null} />
      <Divider />
      <div style={{ display: "grid", gap: "0.15rem" }}>
        <span style={labelStyle}>Ажлын цаг</span>
        <WorkingHoursValue hours={profile?.working_hours ?? null} />
      </div>
      <Divider />
      <Field
        label="Үйлчилгээ"
        value={profile?.services_summary?.length ? profile.services_summary.join(", ") : null}
      />
      <Divider />
      <Field label="Instagram" value={profile?.social_instagram} />
      <Divider />
      <Field label="Facebook" value={profile?.social_facebook} />
      <Divider />
      <Field
        label="Үүсгэн байгуулагдсан"
        value={profile?.founded_year?.toString() ?? null}
      />
      <Divider />
      <Field
        label="Ажилтны тоо"
        value={profile?.staff_count != null ? `${profile.staff_count} хүн` : null}
      />
    </div>
  );
}
