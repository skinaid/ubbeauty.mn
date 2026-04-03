"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestAppOrigin } from "@/lib/url/get-app-origin";

export type AuthActionState = {
  error?: string;
  message?: string;
};

export async function loginWithOtpAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.trim()) {
    return { error: "Email is required." };
  }

  const nextPath = formData.get("next");
  const next =
    typeof nextPath === "string" && nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/dashboard";

  const supabase = await getSupabaseServerClient();
  const origin = await getRequestAppOrigin();

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    }
  });

  if (error) {
    console.error("[auth] signInWithOtp failed:", error.message);
    if (error.message.toLowerCase().includes("rate limit")) {
      return { error: "Too many login attempts. Please wait a few minutes and try again." };
    }
    return { error: "Could not send login link. Please try again." };
  }

  return { message: "Check your email for the login link." };
}

export async function loginWithGoogleAction(): Promise<never> {
  const supabase = await getSupabaseServerClient();
  const origin = await getRequestAppOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    console.error("[auth] Google OAuth failed:", error?.message);
    redirect("/login?error=oauth_failed");
  }

  redirect(data.url);
}

export async function signOutAction() {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[auth] signOut failed:", error.message);
  }
  redirect("/login");
}
