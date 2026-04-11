"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { addClinicPhoto, deleteClinicPhoto } from "@/modules/clinic/photos";
import type { ClinicPhoto } from "@/modules/clinic/photos";

interface Props {
  orgId: string;
  initialPhotos: ClinicPhoto[];
}

interface UploadingItem {
  id: string; // temp id
  previewUrl: string;
}

export function ClinicPhotosPanel({ initialPhotos }: Props) {
  const [photos, setPhotos] = useState<ClinicPhoto[]>(initialPhotos);
  const [uploading, setUploading] = useState<UploadingItem[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = () => fileInputRef.current?.click();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArr = Array.from(files);

    // Add placeholders
    const placeholders: UploadingItem[] = fileArr.map((f) => ({
      id: `uploading-${Math.random()}`,
      previewUrl: URL.createObjectURL(f),
    }));
    setUploading((prev) => [...prev, ...placeholders]);

    await Promise.all(
      fileArr.map(async (file, i) => {
        const placeholder = placeholders[i];
        try {
          // 1. Get signed upload URL
          const res = await fetch("/api/clinic/photos-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileName: file.name, mimeType: file.type }),
          });
          if (!res.ok) throw new Error("Upload URL алдаа");
          const { uploadUrl, publicUrl } = (await res.json()) as {
            uploadUrl: string;
            publicUrl: string;
            filePath: string;
          };

          // 2. PUT file directly to Supabase Storage
          const putRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!putRes.ok) throw new Error("Файл байршуулахад алдаа");

          // 3. Save to DB via server action
          const saved = await addClinicPhoto(publicUrl);

          // 4. Replace placeholder with real photo
          setPhotos((prev) => [...prev, saved]);
        } catch (err) {
          console.error("Photo upload failed:", err);
          // Remove placeholder on error
        } finally {
          setUploading((prev) => prev.filter((p) => p.id !== placeholder.id));
          URL.revokeObjectURL(placeholder.previewUrl);
        }
      })
    );
  };

  const handleDelete = async (photo: ClinicPhoto) => {
    if (!window.confirm("Энэ фото зургийг устгах уу?")) return;
    try {
      await deleteClinicPhoto(photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Устгахад алдаа гарлаа");
    }
  };

  const isEmpty = photos.length === 0 && uploading.length === 0;

  return (
    <div style={{ marginTop: "1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#9ca3af",
          }}
        >
          📸 Фото зургууд
        </span>
        <button
          type="button"
          onClick={triggerUpload}
          style={{
            background: "#f5f3ff",
            border: "1.5px solid #c7d2fe",
            borderRadius: "0.5rem",
            color: "#6366f1",
            fontWeight: 600,
            fontSize: "0.8rem",
            padding: "0.3rem 0.65rem",
            cursor: "pointer",
          }}
        >
          + Нэмэх
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
        onClick={(e) => {
          // Reset so same file can be selected again
          (e.target as HTMLInputElement).value = "";
        }}
      />

      {/* Empty state */}
      {isEmpty && (
        <div
          onClick={triggerUpload}
          style={{
            border: "2px dashed #e5e7eb",
            borderRadius: "0.75rem",
            padding: "2rem",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          📷 Фото зураг нэмэгдээгүй
        </div>
      )}

      {/* Grid */}
      {!isEmpty && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.5rem",
          }}
        >
          {/* Existing photos */}
          {photos.map((photo) => (
            <div
              key={photo.id}
              onMouseEnter={() => setHoveredId(photo.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                borderRadius: "0.5rem",
                overflow: "hidden",
                background: "#f3f4f6",
              }}
            >
              <Image
                src={photo.url}
                alt={photo.caption ?? "Clinic photo"}
                fill
                unoptimized
                style={{ objectFit: "cover" }}
              />
              {/* Delete overlay */}
              {hoveredId === photo.id && (
                <button
                  type="button"
                  onClick={() => handleDelete(photo)}
                  style={{
                    position: "absolute",
                    top: "0.3rem",
                    right: "0.3rem",
                    background: "rgba(0,0,0,0.55)",
                    color: "white",
                    border: "none",
                    borderRadius: "0.3rem",
                    padding: "0.15rem 0.35rem",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    lineHeight: 1,
                  }}
                  title="Устгах"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}

          {/* Uploading placeholders */}
          {uploading.map((item) => (
            <div
              key={item.id}
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                borderRadius: "0.5rem",
                overflow: "hidden",
                background: "#f3f4f6",
              }}
            >
              <Image
                src={item.previewUrl}
                alt="Uploading..."
                fill
                unoptimized
                style={{ objectFit: "cover", opacity: 0.5 }}
              />
              {/* Spinner overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.4)",
                }}
              >
                <span
                  style={{
                    width: "1.5rem",
                    height: "1.5rem",
                    border: "3px solid #c7d2fe",
                    borderTopColor: "#6366f1",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Keyframe for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
