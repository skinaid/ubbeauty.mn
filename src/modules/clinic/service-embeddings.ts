import OpenAI from "openai";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Build the text content to embed for a service.
 * Includes name, description, category hint, price, duration.
 */
export function buildServiceEmbeddingText(service: {
  name: string;
  description?: string | null;
  duration_minutes?: number;
  price_from?: number;
  currency?: string;
  category_name?: string | null;
}): string {
  const parts = [
    `Үйлчилгээ: ${service.name}`,
    service.category_name ? `Категори: ${service.category_name}` : null,
    service.description ? `Тайлбар: ${service.description}` : null,
    service.duration_minutes ? `Хугацаа: ${service.duration_minutes} минут` : null,
    service.price_from != null
      ? `Үнэ: ₮${Number(service.price_from).toLocaleString()} ${service.currency ?? "MNT"}`
      : null,
  ].filter(Boolean);
  return parts.join("\n");
}

/**
 * Generate embedding vector for a text string.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding;
}

/**
 * Embed a service and save to DB.
 * Call this after insert or update.
 */
export async function embedAndSaveService(
  serviceId: string,
  orgId: string,
  service: {
    name: string;
    description?: string | null;
    duration_minutes?: number;
    price_from?: number;
    currency?: string;
    category_name?: string | null;
  }
): Promise<void> {
  try {
    const text = buildServiceEmbeddingText(service);
    const embedding = await generateEmbedding(text);
    const supabase = await getSupabaseServerClient();
    await supabase
      .from("services")
      .update({ embedding } as never)
      .eq("id", serviceId)
      .eq("organization_id", orgId);
  } catch (err) {
    // Non-fatal — log and continue
    console.error("[embedAndSaveService] failed:", err);
  }
}

type MatchedService = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_from: number;
  currency: string;
  is_bookable: boolean;
  status: string;
  category_id: string | null;
  similarity: number;
};

/**
 * Semantic search: find services similar to a query string.
 */
export async function searchServicesByQuery(
  query: string,
  orgId: string,
  opts: { threshold?: number; count?: number } = {}
): Promise<MatchedService[]> {
  const { threshold = 0.3, count = 5 } = opts;
  const embedding = await generateEmbedding(query);
  const supabase = await getSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("match_services", {
    query_embedding: embedding,
    org_id: orgId,
    match_threshold: threshold,
    match_count: count,
  });

  if (error) {
    console.error("[searchServicesByQuery] error:", error);
    return [];
  }
  return ((data ?? []) as unknown) as MatchedService[];
}
