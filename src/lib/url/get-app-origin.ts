import { headers } from "next/headers";

function sanitizeOriginCandidate(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

export async function getRequestAppOrigin(): Promise<string> {
  const headerStore = await headers();

  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const originHeader = sanitizeOriginCandidate(headerStore.get("origin"));

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (originHeader) {
    return originHeader;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
