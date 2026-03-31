"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import type { AssetType, BrandVisualAsset, DesignTokens, BrandColor, BrandFont } from "./visual-types";

const BUCKET = "brand-assets";

async function requireOrg() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const org = await getCurrentUserOrganization(user.id);
  if (!org) throw new Error("Organization not found");
  return { user, org };
}

// ── Storage: generate signed upload URL ────────────────────
export async function getUploadUrl(params: {
  brandManagerId: string;
  assetType: AssetType;
  fileName: string;
  mimeType: string;
}): Promise<{ uploadUrl: string; token: string; filePath: string }> {
  const { org } = await requireOrg();
  const ext = params.fileName.split(".").pop() ?? "bin";
  const uuid = crypto.randomUUID();
  const filePath = `${org.id}/${params.brandManagerId}/${params.assetType}/${uuid}.${ext}`;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(filePath);

  if (error || !data) throw new Error(`Upload URL error: ${error?.message}`);
  return { uploadUrl: data.signedUrl, token: data.token, filePath };
}

// ── Storage: signed read URL ───────────────────────────────
export async function getAssetUrl(filePath: string): Promise<string> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 3600); // 1h
  return data?.signedUrl ?? "";
}

// ── Create asset record after upload ──────────────────────
export async function createVisualAsset(params: {
  brandManagerId: string;
  assetType: AssetType;
  assetTag?: string;
  usageContext?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  widthPx?: number;
  heightPx?: number;
  extractedColors?: string[];
  description?: string;
  isPrimary?: boolean;
}): Promise<BrandVisualAsset> {
  const { org } = await requireOrg();
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from("brand_visual_assets")
    .insert({
      brand_manager_id: params.brandManagerId,
      organization_id: org.id,
      asset_type: params.assetType,
      asset_tag: params.assetTag ?? null,
      usage_context: params.usageContext ?? null,
      file_name: params.fileName,
      file_path: params.filePath,
      file_size: params.fileSize,
      mime_type: params.mimeType,
      width_px: params.widthPx ?? null,
      height_px: params.heightPx ?? null,
      extracted_colors: params.extractedColors ?? null,
      description: params.description ?? null,
      is_primary: params.isPrimary ?? false,
    })
    .select()
    .single();

  if (error) throw error;

  // Recalculate brand score
  await admin.rpc("recalculate_brand_manager_score", { p_brand_manager_id: params.brandManagerId });
  revalidatePath(`/brand-managers/${params.brandManagerId}/visual`);
  revalidatePath(`/brand-managers/${params.brandManagerId}`);

  return data as BrandVisualAsset;
}

// ── Read assets ────────────────────────────────────────────
export async function getVisualAssets(brandManagerId: string): Promise<BrandVisualAsset[]> {
  const { org } = await requireOrg();
  const admin = getSupabaseAdminClient();

  const { data: bm } = await admin
    .from("brand_managers")
    .select("id")
    .eq("id", brandManagerId)
    .eq("organization_id", org.id)
    .single();
  if (!bm) throw new Error("Not found");

  const { data, error } = await admin
    .from("brand_visual_assets")
    .select("*")
    .eq("brand_manager_id", brandManagerId)
    .order("asset_type")
    .order("sort_order");

  if (error) throw error;
  return data as BrandVisualAsset[];
}

// ── Delete asset ───────────────────────────────────────────
export async function deleteVisualAsset(assetId: string, brandManagerId: string): Promise<void> {
  const { org } = await requireOrg();
  const admin = getSupabaseAdminClient();

  const { data: asset } = await admin
    .from("brand_visual_assets")
    .select("file_path, organization_id")
    .eq("id", assetId)
    .eq("organization_id", org.id)
    .single();

  if (!asset) throw new Error("Asset not found");

  // Delete from storage
  const supabase = await getSupabaseServerClient();
  await supabase.storage.from(BUCKET).remove([asset.file_path]);

  // Delete record
  await admin.from("brand_visual_assets").delete().eq("id", assetId);

  await admin.rpc("recalculate_brand_manager_score", { p_brand_manager_id: brandManagerId });
  revalidatePath(`/brand-managers/${brandManagerId}/visual`);
}

// ── Design Tokens ──────────────────────────────────────────
export async function getDesignTokens(brandManagerId: string): Promise<DesignTokens | null> {
  const { org } = await requireOrg();
  const admin = getSupabaseAdminClient();

  const { data: bm } = await admin
    .from("brand_managers")
    .select("id")
    .eq("id", brandManagerId)
    .eq("organization_id", org.id)
    .single();
  if (!bm) return null;

  const { data } = await admin
    .from("brand_design_tokens")
    .select("*")
    .eq("brand_manager_id", brandManagerId)
    .single();

  return data as DesignTokens | null;
}

export async function upsertDesignTokens(
  brandManagerId: string,
  tokens: Partial<Omit<DesignTokens, "id" | "brand_manager_id" | "created_at" | "updated_at">>
): Promise<void> {
  const { org } = await requireOrg();
  const admin = getSupabaseAdminClient();

  const { data: bm } = await admin
    .from("brand_managers")
    .select("id")
    .eq("id", brandManagerId)
    .eq("organization_id", org.id)
    .single();
  if (!bm) throw new Error("Not found");

  await admin
    .from("brand_design_tokens")
    .upsert(
      { brand_manager_id: brandManagerId, ...tokens },
      { onConflict: "brand_manager_id" }
    );

  await admin.rpc("recalculate_brand_manager_score", { p_brand_manager_id: brandManagerId });
  revalidatePath(`/brand-managers/${brandManagerId}/visual`);
  revalidatePath(`/brand-managers/${brandManagerId}`);
}

// ── AI visual audit ────────────────────────────────────────
export async function auditVisualAsset(assetId: string, brandManagerId: string): Promise<{ score: number; notes: string }> {
  const { org } = await requireOrg();
  const admin = getSupabaseAdminClient();

  const { data: asset } = await admin
    .from("brand_visual_assets")
    .select("*")
    .eq("id", assetId)
    .eq("organization_id", org.id)
    .single();
  if (!asset) throw new Error("Asset not found");

  // Get signed URL for GPT-4o vision
  const supabase = await getSupabaseServerClient();
  const { data: urlData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(asset.file_path as string, 300);
  if (!urlData?.signedUrl) throw new Error("Could not generate URL");

  // Fetch design tokens for context
  const { data: tokens } = await admin
    .from("brand_design_tokens")
    .select("colors,visual_style,visual_keywords")
    .eq("brand_manager_id", brandManagerId)
    .single();

  const context = tokens
    ? `Брэндийн өнгөнүүд: ${JSON.stringify(tokens.colors)}. Визуаль стиль: ${tokens.visual_style}. Keyword: ${(tokens.visual_keywords as string[]).join(", ")}.`
    : "Брэндийн design tokens тодорхойлогдоогүй.";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Та брэндийн визуаль identity мэргэжилтэн юм. ${context}
Зургийг шинжилж брэндтэй нийцэж байгаа эсэхийг үнэл.
JSON буцаа: { "score": 0-100, "notes": "монгол хэлээр тайлбар, 2-3 өгүүлбэр" }`,
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: urlData.signedUrl, detail: "low" } },
            { type: "text", text: `Энэ зураг брэндтэй нийцэж байна уу? Asset type: ${asset.asset_type}` },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    }),
    cache: "no-store",
  });

  const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = body.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { score?: number; notes?: string };
  const score = Math.min(100, Math.max(0, parsed.score ?? 50));
  const notes = parsed.notes ?? "";

  await admin
    .from("brand_visual_assets")
    .update({ ai_audit_score: score, ai_audit_notes: notes, ai_audited_at: new Date().toISOString() })
    .eq("id", assetId);

  revalidatePath(`/brand-managers/${brandManagerId}/visual`);
  return { score, notes };
}
