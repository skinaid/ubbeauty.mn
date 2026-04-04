import { cache } from "react";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const getCurrentUser = cache(async () => {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (!error && data.user) {
    return data.user;
  }

  if (error) {
    const missingSession =
      error.message.includes("Auth session missing") ||
      error.message.includes("session missing") ||
      error.message.includes("Refresh Token Not Found");
    if (!missingSession) {
      console.error("[auth/session] getUser failed:", error.message);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    const cookieStore = await cookies();
    const devUserId = cookieStore.get("ubbeauty-dev-user-id")?.value;
    if (devUserId) {
      const admin = getSupabaseAdminClient();
      const adminUser = await admin.auth.admin.getUserById(devUserId);
      if (!adminUser.error) {
        return adminUser.data.user;
      }
    }
  }

  return null;
});
