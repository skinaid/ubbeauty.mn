import { describe, expect, it } from "vitest";
import { isProtectedPath, isPublicAuthPath } from "./middleware";

describe("isProtectedPath", () => {
  it.each([
    "/dashboard",
    "/dashboard/settings",
    "/setup-organization",
    "/billing",
    "/billing/checkout",
    "/settings",
    "/pages",
    "/pages/123",
    "/internal",
    "/internal/ops",
    "/admin",
    "/admin/organizations",
    "/admin/billing",
    "/admin/settings"
  ])("returns true for %s", (path) => {
    expect(isProtectedPath(path)).toBe(true);
  });

  it.each([
    "/",
    "/login",
    "/auth/callback",
    "/pricing",
    "/privacy",
    "/terms",
    "/data-deletion",
    "/api/webhooks/qpay"
  ])("returns false for %s", (path) => {
    expect(isProtectedPath(path)).toBe(false);
  });
});

describe("isPublicAuthPath", () => {
  it.each(["/login", "/login?next=/dashboard", "/auth/callback", "/auth/callback?code=abc"])(
    "returns true for %s",
    (path) => {
      expect(isPublicAuthPath(path)).toBe(true);
    }
  );

  it.each(["/", "/dashboard", "/pricing", "/api/meta/callback"])("returns false for %s", (path) => {
    expect(isPublicAuthPath(path)).toBe(false);
  });
});
