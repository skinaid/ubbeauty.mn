"use client";

import type { ClinicProfile } from "@/modules/clinic/profile";

type Props = {
  profile: ClinicProfile | null;
};

// Circular SVG progress ring
function ProgressRing({ percent }: { percent: number }) {
  const size = 64;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color = percent === 100 ? "#10b981" : "#6366f1";

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <span className="absolute text-xs font-semibold text-gray-700 dark:text-gray-200">
        {percent}%
      </span>
    </div>
  );
}

function SectionHeader({ title, className }: { title: string; className?: string }) {
  return (
    <h3 className={`text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 ${className ?? "mt-6"}`}>
      {title}
    </h3>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-none">
      <span className="text-[11px] text-gray-400 dark:text-gray-500 tracking-widest uppercase">
        {label}
      </span>
      <div className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

const emDash = "—";

function EmptyValue() {
  return <span className="text-gray-300 dark:text-gray-600">{emDash}</span>;
}

function WorkingHoursDisplay({ hours }: { hours: Record<string, string> | null }) {
  if (!hours || Object.keys(hours).length === 0) {
    return <EmptyValue />;
  }
  return (
    <div className="flex flex-col gap-1 pt-0.5">
      {Object.entries(hours).map(([day, time]) => (
        <div key={day} className="flex justify-between gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium w-24">{day}</span>
          <span className="text-sm text-gray-800 dark:text-gray-200">{time}</span>
        </div>
      ))}
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

  // Empty/onboarding state
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mb-4">
          <span className="text-3xl">🏥</span>
        </div>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">
          Профайл олдсонгүй
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
          Баруун талын AI туслахтай ярилцаж эмнэлгийнхээ профайлыг хурдан бөглөнө үү.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Clinic identity header */}
      <div className="flex items-start gap-4 pb-6 mb-1 border-b border-gray-100 dark:border-gray-800">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-sm select-none">
          {profile.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        {/* Name + tagline */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 leading-tight truncate">
            {profile.name || "Нэргүй эмнэлэг"}
          </h2>
          {profile.tagline ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
              {profile.tagline}
            </p>
          ) : (
            <p className="text-sm text-gray-300 dark:text-gray-600 mt-0.5 italic">
              Уриа үг нэмэгдээгүй...
            </p>
          )}
        </div>
        {/* Progress ring */}
        <ProgressRing percent={completionPercent} />
      </div>

      {/* Completion label */}
      <div className="flex items-center justify-between py-3 mb-2">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {completedCount}/{totalCount} талбар бөглөгдсөн
        </span>
        {completionPercent === 100 ? (
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
            ✓ Бүрэн
          </span>
        ) : (
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            {100 - completionPercent}% үлдлээ
          </span>
        )}
      </div>

      {/* ── Section: Contact ── */}
      <SectionHeader title="Холбоо барих" className="" />
      <div className="bg-gray-50/70 dark:bg-gray-900/60 rounded-xl px-4 py-1">
        <FieldRow label="Утас">
          {profile.phone ? (
            <a href={`tel:${profile.phone}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
              {profile.phone}
            </a>
          ) : <EmptyValue />}
        </FieldRow>
        <FieldRow label="Вебсайт">
          {profile.website ? (
            <a href={profile.website} target="_blank" rel="noopener noreferrer"
               className="text-indigo-600 dark:text-indigo-400 hover:underline break-all">
              {profile.website}
            </a>
          ) : <EmptyValue />}
        </FieldRow>
        <FieldRow label="Хаяг">
          {addressValue || <EmptyValue />}
        </FieldRow>
      </div>

      {/* ── Section: Working Hours ── */}
      <SectionHeader title="Ажлын цаг" />
      <div className="bg-gray-50/70 dark:bg-gray-900/60 rounded-xl px-4 py-3">
        <WorkingHoursDisplay hours={profile.working_hours ?? null} />
      </div>

      {/* ── Section: Social ── */}
      <SectionHeader title="Сошиал сувгууд" />
      <div className="bg-gray-50/70 dark:bg-gray-900/60 rounded-xl px-4 py-1">
        <FieldRow label="Instagram">
          {profile.social_instagram ? (
            <span className="text-gray-800 dark:text-gray-100">
              @{profile.social_instagram.replace(/^@/, "")}
            </span>
          ) : <EmptyValue />}
        </FieldRow>
        <FieldRow label="Facebook">
          {profile.social_facebook || <EmptyValue />}
        </FieldRow>
      </div>

      {/* ── Section: About ── */}
      <SectionHeader title="Байгууллагын тухай" />
      <div className="bg-gray-50/70 dark:bg-gray-900/60 rounded-xl px-4 py-1">
        <FieldRow label="Тайлбар">
          {profile.description ? (
            <span className="whitespace-pre-line">{profile.description}</span>
          ) : <EmptyValue />}
        </FieldRow>
        <FieldRow label="Үйлчилгээ">
          {profile.services_summary?.length ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {profile.services_summary.map((s, i) => (
                <span key={i} className="text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-medium">
                  {s}
                </span>
              ))}
            </div>
          ) : <EmptyValue />}
        </FieldRow>
        <FieldRow label="Үүсгэн байгуулагдсан">
          {profile.founded_year != null ? profile.founded_year.toString() : <EmptyValue />}
        </FieldRow>
        <FieldRow label="Ажилтны тоо">
          {profile.staff_count != null ? `${profile.staff_count} хүн` : <EmptyValue />}
        </FieldRow>
      </div>

      {/* Edit manually fallback */}
      <div className="pt-6 pb-2">
        {/* TODO: Wire up to a manual edit modal/drawer */}
        <button className="w-full text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl py-3 transition-colors hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/40">
          ✏️ Гараар засварлах
        </button>
      </div>
    </div>
  );
}
