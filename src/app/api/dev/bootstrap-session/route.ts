import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/env/server";
import { DEV_CLINIC_ROLE_COOKIE, parseDevClinicRoleOverride } from "@/modules/clinic/guard";

function isDevBootstrapAllowed(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const host = request.nextUrl.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

export async function GET(request: NextRequest) {
  if (!isDevBootstrapAllowed(request)) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  const email = request.nextUrl.searchParams.get("email") || "hello@skinaid.mn";
  const next = request.nextUrl.searchParams.get("next") || "/dashboard";
  const role = parseDevClinicRoleOverride(request.nextUrl.searchParams.get("role"));

  const { url, anonKey } = getSupabaseEnv();
  const admin = getSupabaseAdminClient();
  const linkResult = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: new URL(next, request.url).toString()
    }
  });

  if (linkResult.error || !linkResult.data.properties.hashed_token) {
    return NextResponse.json(
      { error: linkResult.error?.message || "link_generation_failed" },
      { status: 500 }
    );
  }

  let response = NextResponse.redirect(new URL(next, request.url));
  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const verifyResult = await supabase.auth.verifyOtp({
    token_hash: linkResult.data.properties.hashed_token,
    type: "magiclink"
  });

  if (verifyResult.error) {
    return NextResponse.json({ error: verifyResult.error.message }, { status: 500 });
  }

  if (verifyResult.data.user?.id) {
    response.cookies.set("ubbeauty-dev-user-id", verifyResult.data.user.id, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      maxAge: 60 * 60 * 8
    });
  }

  if (role) {
    response.cookies.set(DEV_CLINIC_ROLE_COOKIE, role, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      maxAge: 60 * 60 * 8
    });
  } else {
    response.cookies.delete(DEV_CLINIC_ROLE_COOKIE);
  }

  return response;
}
