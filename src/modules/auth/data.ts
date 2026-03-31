import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export const getCurrentUserProfile = cache(async (userId: string): Promise<ProfileRow | null> => {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as ProfileRow | null;
});
