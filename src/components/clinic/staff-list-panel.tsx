"use client";
import { useRef, useState } from "react";
import Image from "next/image";

type StaffMember = {
  id: string;
  full_name: string;
  role: string;
  specialty: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  accepts_online_booking: boolean;
  status: string;
  location_id: string | null;
  photo_url: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Эзэмшигч",
  manager: "Менежер",
  front_desk: "Хүлээн авагч",
  provider: "Мэргэжилтэн",
  assistant: "Туслах",
  billing: "Тооцоо",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "#7c3aed",
  manager: "#2563eb",
  front_desk: "#059669",
  provider: "#d97706",
  assistant: "#6b7280",
  billing: "#dc2626",
};

const ROLE_GRADIENTS: Record<string, string> = {
  owner: "linear-gradient(135deg, #7c3aed, #a78bfa)",
  manager: "linear-gradient(135deg, #2563eb, #60a5fa)",
  front_desk: "linear-gradient(135deg, #059669, #34d399)",
  provider: "linear-gradient(135deg, #d97706, #fbbf24)",
  assistant: "linear-gradient(135deg, #6b7280, #9ca3af)",
  billing: "linear-gradient(135deg, #dc2626, #f87171)",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <p style={{ margin: 0, fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500 }}>{label}</p>
      <p style={{ margin: "0.1rem 0 0", fontSize: "0.85rem", color: "#111827", lineHeight: 1.4 }}>{value}</p>
    </div>
  );
}

function StaffAvatar({
  staff,
  onPhotoUpdate,
}: {
  staff: StaffMember;
  onPhotoUpdate: (staffId: string, photoUrl: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initial = staff.full_name.charAt(0).toUpperCase();
  const gradient = ROLE_GRADIENTS[staff.role] ?? "linear-gradient(135deg, #6b7280, #9ca3af)";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);

    try {
      // 1. Get signed upload URL
      const postRes = await fetch("/api/clinic/staff-photo-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staff.id,
          fileName: file.name,
          mimeType: file.type,
        }),
      });

      if (!postRes.ok) {
        const err = (await postRes.json()) as { error?: string };
        throw new Error(err.error ?? "Upload URL алдаа");
      }

      const { uploadUrl, publicUrl } = (await postRes.json()) as {
        uploadUrl: string;
        publicUrl: string;
        filePath: string;
      };

      // 2. PUT file to signed URL
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!putRes.ok) throw new Error("Файл upload амжилтгүй");

      // 3. Save URL to DB
      const patchRes = await fetch("/api/clinic/staff-photo-upload", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: staff.id, photoUrl: publicUrl }),
      });

      if (!patchRes.ok) {
        const err = (await patchRes.json()) as { error?: string };
        throw new Error(err.error ?? "Хадгалах алдаа");
      }

      // 4. Notify parent
      onPhotoUpdate(staff.id, publicUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Алдаа гарлаа";
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      style={{ position: "relative", width: "3rem", height: "3rem", flexShrink: 0, cursor: "pointer" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (!uploading) fileInputRef.current?.click();
      }}
    >
      {/* Avatar image or initials */}
      {staff.photo_url ? (
        <div style={{ position: "relative", width: "3rem", height: "3rem", borderRadius: "0.75rem", overflow: "hidden" }}>
          <Image
            src={staff.photo_url}
            alt={staff.full_name}
            fill
            unoptimized
            style={{ objectFit: "cover", borderRadius: "0.75rem" }}
          />
        </div>
      ) : (
        <div
          style={{
            width: "3rem",
            height: "3rem",
            borderRadius: "0.75rem",
            background: gradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "1.1rem",
            fontWeight: 700,
            userSelect: "none",
          }}
        >
          {initial}
        </div>
      )}

      {/* Hover/upload overlay — always rendered, opacity toggled */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "0.75rem",
          background: "rgba(0,0,0,0.45)",
          display: "flex",
          opacity: hovered || uploading ? 1 : 0,
          transition: "opacity 0.15s",
          pointerEvents: hovered || uploading ? "auto" : "none",
          alignItems: "center",
          justifyContent: "center",
          cursor: uploading ? "wait" : "pointer",
          fontSize: uploading ? "0.75rem" : "1rem",
          color: "#fff",
        }}
      >
        {uploading ? "⏳" : "📷"}
      </div>

      {/* Error tooltip */}
      {errorMsg && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            background: "#dc2626",
            color: "#fff",
            fontSize: "0.65rem",
            padding: "3px 7px",
            borderRadius: "0.4rem",
            whiteSpace: "nowrap",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
}

export function StaffListPanel({
  staff,
  onDelete,
  onSelect,
  onPhotoUpdate,
}: {
  staff: StaffMember[];
  onDelete: (id: string) => void;
  onSelect: (staff: StaffMember) => void;
  onPhotoUpdate: (staffId: string, photoUrl: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  void onDelete; // kept for compatibility

  if (staff.length === 0) {
    return (
      <div style={{ padding: "3rem 2rem", textAlign: "center", color: "#9ca3af" }}>
        <p style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>👥</p>
        <p style={{ margin: 0, fontSize: "0.9rem" }}>Ажилтан бүртгэлгүй байна</p>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem" }}>AI chat-аар нэмнэ үү →</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p style={{ margin: 0, fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {staff.length} ажилтан
      </p>
      {staff.map((s) => (
        <div
          key={s.id}
          onClick={() => onSelect(s)}
          onMouseEnter={() => setHoveredId(s.id)}
          onMouseLeave={() => setHoveredId(null)}
          style={{
            border: hoveredId === s.id ? "1px solid #6366f1" : "1px solid #e5e7eb",
            borderRadius: "1rem", overflow: "hidden", background: "#fff",
            cursor: "pointer",
            boxShadow: hoveredId === s.id ? "0 4px 16px rgba(99,102,241,0.12)" : "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
        >
          {/* Role color bar */}
          <div style={{ height: "4px", background: ROLE_COLORS[s.role] ?? "#e5e7eb" }} />
          <div style={{ padding: "1rem 1.125rem" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", gap: "0.75rem" }}>
              {/* Left: Avatar + Name/Badge */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                <StaffAvatar staff={s} onPhotoUpdate={onPhotoUpdate} />
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.full_name}</h3>
                  <span style={{
                    display: "inline-block", marginTop: "0.2rem",
                    fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px",
                    borderRadius: "999px",
                    background: `${ROLE_COLORS[s.role] ?? "#e5e7eb"}18`,
                    color: ROLE_COLORS[s.role] ?? "#374151",
                  }}>
                    {ROLE_LABELS[s.role] ?? s.role}
                  </span>
                </div>
              </div>
              {/* Right: Arrow */}
              <span style={{ fontSize: "0.72rem", color: "#9ca3af", flexShrink: 0 }}>→</span>
            </div>
            {/* Fields */}
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "0.75rem" }}>
              {s.specialty && <Field label="Мэргэжил" value={s.specialty} />}
              {s.phone && <Field label="Утас" value={s.phone} />}
              {s.email && <Field label="И-мэйл" value={s.email} />}
              {s.bio && <Field label="Танилцуулга" value={s.bio} />}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
                {s.accepts_online_booking && (
                  <span style={{ fontSize: "0.72rem", color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "999px", fontWeight: 500 }}>
                    ✓ Онлайн захиалга
                  </span>
                )}
                {s.status === "inactive" && (
                  <span style={{ fontSize: "0.72rem", color: "#9ca3af", background: "#f9fafb", padding: "2px 8px", borderRadius: "999px" }}>
                    Идэвхгүй
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
