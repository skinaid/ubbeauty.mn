import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const getCurrentUser = cache(async () => {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    const missingSession =
      error.message.includes("Auth session missing") ||
      error.message.includes("session missing") ||
      error.message.includes("Refresh Token Not Found");
    if (!missingSession) {
      console.error("[auth/session] getUser failed:", error.message);
    }
    return null;
  }
  return data.user;
});
