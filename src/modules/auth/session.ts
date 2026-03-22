import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const getCurrentUser = cache(async () => {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("[auth/session] getUser failed:", error.message);
    return null;
  }
  return data.user;
});
