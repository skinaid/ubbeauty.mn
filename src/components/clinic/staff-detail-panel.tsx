"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { updateStaffMember, deleteStaffMember } from "@/modules/clinic/actions";

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

type Location = { id: string; name: string };

type ActiveTab = "info" | "schedule";

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

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

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
  staff,
  locations,
  onClose,
  onSave,
}: {
  staff: StaffMember;
  locations: Location[];
  onClose: () => void;
  onSave: (updated: StaffMember) => void;
}) {
  const [fullName, setFullName] = useState(staff.full_name);
  const [specialty, setSpecialty] = useState(staff.specialty ?? "");
  const [bio, setBio] = useState(staff.bio ?? "");
  const [phone, setPhone] = useState(staff.phone ?? "");
  const [email, setEmail] = useState(staff.email ?? "");
  const [role, setRole] = useState(staff.role);
  const [locationId, setLocationId] = useState(staff.location_id ?? "");
  const [status, setStatus] = useState(staff.status);
  const [acceptsOnlineBooking, setAcceptsOnlineBooking] = useState(staff.accepts_online_booking);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const fields = {
      full_name: fullName.trim(),
      specialty: specialty.trim() || null,
      bio: bio.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      role,
      location_id: locationId || null,
      status,
      accepts_online_booking: acceptsOnlineBooking,
    };
    try {
      const result = await updateStaffMember(staff.id, fields);
      if (result.error) {
        setError(result.error);
        setSaving(false);
      } else {
        onSave({ ...staff, ...fields });
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
        {/* Dialog Header */}
        <div style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid #f3f4f6",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
            Засах — {staff.full_name}
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

        {/* Dialog Body */}
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
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} />
          </FormField>

          <FormField label="Мэргэжил / Specialty">
            <input type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} style={inputStyle} placeholder="Жишээ: Арьс судлаач" />
          </FormField>

          <FormField label="Танилцуулга / Bio">
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
              placeholder="Богино танилцуулга..."
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <FormField label="Утас">
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} placeholder="+976 xxxxxxxx" />
            </FormField>
            <FormField label="И-мэйл">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="name@example.com" />
            </FormField>
          </div>

          <FormField label="Үүрэг / Role">
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="owner">Эзэмшигч</option>
              <option value="manager">Менежер</option>
              <option value="front_desk">Хүлээн авагч</option>
              <option value="provider">Мэргэжилтэн</option>
              <option value="assistant">Туслах</option>
              <option value="billing">Тооцоо</option>
            </select>
          </FormField>

          <FormField label="Байршил">
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Тодорхойгүй</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Статус">
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="active">Идэвхтэй</option>
              <option value="inactive">Идэвхгүй</option>
            </select>
          </FormField>

          <FormField label="Онлайн захиалга">
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={acceptsOnlineBooking}
                onChange={(e) => setAcceptsOnlineBooking(e.target.checked)}
                style={{ width: "1rem", height: "1rem", cursor: "pointer", accentColor: "#6366f1" }}
              />
              <span style={{ fontSize: "0.875rem", color: "#374151" }}>
                Онлайн захиалгад нээлттэй
              </span>
            </label>
          </FormField>
        </div>

        {/* Dialog Footer */}
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

// ── Main Panel ───────────────────────────────────────────────────────────────

export function StaffDetailPanel({
  staff,
  locations,
  onBack,
  onUpdate,
  onDelete,
  onPhotoUpdate,
}: {
  staff: StaffMember;
  locations: Location[];
  onBack: () => void;
  onUpdate: (updated: StaffMember) => void;
  onDelete: (id: string) => void;
  onPhotoUpdate?: (staffId: string, photoUrl: string) => void;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("info");

  const roleColor = ROLE_COLORS[staff.role] ?? "#e5e7eb";
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoHovered, setPhotoHovered] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handlePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPhotoUploading(true);
    setPhotoError(null);
    try {
      const postRes = await fetch("/api/clinic/staff-photo-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: staff.id, fileName: file.name, mimeType: file.type }),
      });
      const { uploadUrl, publicUrl, error: urlErr } = await postRes.json() as { uploadUrl?: string; publicUrl?: string; error?: string };
      if (urlErr || !uploadUrl || !publicUrl) throw new Error(urlErr ?? "URL авахад алдаа");
      const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!putRes.ok) throw new Error("Файл байршуулахад алдаа");
      const patchRes = await fetch("/api/clinic/staff-photo-upload", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: staff.id, photoUrl: publicUrl }),
      });
      const patchData = await patchRes.json() as { ok?: boolean; error?: string };
      if (!patchData.ok) throw new Error(patchData.error ?? "Хадгалахад алдаа");
      onPhotoUpdate?.(staff.id, publicUrl);
      onUpdate({ ...staff, photo_url: publicUrl });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Алдаа гарлаа");
      setTimeout(() => setPhotoError(null), 4000);
    } finally {
      setPhotoUploading(false);
    }
  };

  const locationName = staff.location_id
    ? (locations.find((l) => l.id === staff.location_id)?.name ?? "Тодорхойгүй")
    : "Тодорхойгүй";

  const handleSaveFromDialog = (updated: StaffMember) => {
    setEditOpen(false);
    onUpdate(updated);
    setFlash({ type: "success", msg: "✓ Хадгалагдлаа" });
    setTimeout(() => setFlash(null), 3000);
  };

  const handleDelete = async () => {
    if (!confirm(`"${staff.full_name}" ажилтныг устгах уу?`)) return;
    setDeleting(true);
    try {
      const result = await deleteStaffMember(staff.id);
      if (result.error) {
        setFlash({ type: "error", msg: result.error });
        setDeleting(false);
      } else {
        onDelete(staff.id);
        onBack();
      }
    } catch {
      setFlash({ type: "error", msg: "Устгахад алдаа гарлаа." });
      setDeleting(false);
    }
  };

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "info", label: "Мэдээлэл" },
    { key: "schedule", label: "Ажлын цаг" },
  ];

  return (
    <>
      {editOpen && (
        <EditDialog
          staff={staff}
          locations={locations}
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
            {staff.full_name}
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

        {/* Role color bar */}
        <div style={{ height: "4px", background: roleColor, flexShrink: 0 }} />

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

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* ── Tab: Мэдээлэл ── */}
          {activeTab === "info" && (
            <div style={{ padding: "1.5rem 1.25rem" }}>
              {/* Avatar with upload */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
                <div
                  style={{ position: "relative", width: "80px", height: "80px", cursor: "pointer" }}
                  onMouseEnter={() => setPhotoHovered(true)}
                  onMouseLeave={() => setPhotoHovered(false)}
                  onClick={() => !photoUploading && photoInputRef.current?.click()}
                >
                  {/* Photo or initials */}
                  {staff.photo_url ? (
                    <div style={{ width: "80px", height: "80px", borderRadius: "50%", overflow: "hidden", position: "relative", boxShadow: `0 4px 14px ${roleColor}44` }}>
                      <Image src={staff.photo_url} alt={staff.full_name} fill unoptimized style={{ objectFit: "cover" }} />
                    </div>
                  ) : (
                    <div style={{
                      width: "80px", height: "80px", borderRadius: "50%",
                      background: `linear-gradient(135deg, ${roleColor}cc, ${roleColor}66)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.5rem", fontWeight: 700, color: "#fff",
                      boxShadow: `0 4px 14px ${roleColor}44`,
                    }}>
                      {getInitials(staff.full_name)}
                    </div>
                  )}
                  {/* Hover/upload overlay */}
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    background: "rgba(0,0,0,0.45)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: photoHovered || photoUploading ? 1 : 0,
                    transition: "opacity 0.15s",
                    fontSize: "1.2rem", color: "#fff",
                    pointerEvents: "none",
                  }}>
                    {photoUploading ? "⏳" : "📷"}
                  </div>
                  {/* Hidden input */}
                  <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoFile} />
                </div>
              </div>
              {/* Photo error */}
              {photoError && (
                <div style={{ textAlign: "center", marginBottom: "0.75rem", fontSize: "0.75rem", color: "#dc2626" }}>{photoError}</div>
              )}

              {/* Badges */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.25rem", justifyContent: "center" }}>
                <Badge color={roleColor} bg={`${roleColor}18`}>
                  {ROLE_LABELS[staff.role] ?? staff.role}
                </Badge>
                {staff.status === "active" ? (
                  <Badge color="#059669" bg="#ecfdf5">Идэвхтэй</Badge>
                ) : (
                  <Badge color="#9ca3af" bg="#f9fafb">Идэвхгүй</Badge>
                )}
                {staff.accepts_online_booking && (
                  <Badge color="#2563eb" bg="#eff6ff">✓ Онлайн захиалга</Badge>
                )}
              </div>

              {/* Info grid */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem 2rem", marginBottom: "1.25rem",
              }}>
                <InfoRow label="Мэргэжил" value={staff.specialty ?? "—"} />
                <InfoRow label="Утас" value={staff.phone ?? "—"} />
                <InfoRow label="И-мэйл" value={staff.email ?? "—"} />
                <InfoRow label="Байршил" value={locationName} />
              </div>

              {/* Bio */}
              {staff.bio && (
                <div style={{
                  background: "#fafafa", border: "1px solid #f0f0f0",
                  borderRadius: "0.75rem", padding: "1rem 1.125rem",
                  marginBottom: "1.25rem",
                }}>
                  <p style={{ margin: "0 0 0.4rem", fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
                    Танилцуулга
                  </p>
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {staff.bio}
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
                  {deleting ? "Устгаж байна..." : "🗑 Ажилтан устгах"}
                </button>
              </div>
            </div>
          )}

          {/* ── Tab: Ажлын цаг ── */}
          {activeTab === "schedule" && (
            <div style={{ padding: "1.5rem 1.25rem" }}>
              <div style={{
                background: "#fafafa", border: "1px solid #f0f0f0",
                borderRadius: "0.75rem", padding: "1.25rem 1.25rem",
              }}>
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", fontWeight: 700, color: "#111827" }}>
                  Ажлын цагийн тохиргоо
                </p>
                <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "#6b7280", lineHeight: 1.6 }}>
                  Ажлын цагийн тохиргоог <strong>/clinic/availability</strong> хуудаснаас удирдана уу.
                </p>
                <button
                  onClick={() => router.push("/clinic/availability")}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.4rem",
                    padding: "0.5rem 1.25rem",
                    background: "#6366f1", color: "#fff",
                    border: "none", borderRadius: "0.5rem",
                    fontSize: "0.85rem", fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  → Ажлын цаг тохируулах
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
