import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/setup-organization", "/billing", "/settings", "/pages", "/internal", "/admin"];
const PUBLIC_AUTH_PATHS = ["/login", "/auth/callback"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some((prefix) => pathname.startsWith(prefix));
}

function getSupabaseAuthCookiePrefix(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;

  try {
    const ref = new URL(url).hostname.split(".")[0];
    return `sb-${ref}-auth-token`;
  } catch {
    return null;
  }
}

function hasSupabaseSession(request: NextRequest): boolean {
  const prefix = getSupabaseAuthCookiePrefix();
  if (!prefix) return false;

  return request.cookies.getAll().some(({ name }) => name === prefix || name.startsWith(`${prefix}.`));
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    if (isProtectedPath(request.nextUrl.pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "auth_unavailable");
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  const { pathname } = request.nextUrl;
  const hasSession = hasSupabaseSession(request);

  if (!hasSession && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (hasSession && isPublicAuthPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
