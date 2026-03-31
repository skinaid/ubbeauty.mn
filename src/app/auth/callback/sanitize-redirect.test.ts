import { describe, expect, it } from "vitest";
import { sanitizeRedirectPath } from "./route";

describe("sanitizeRedirectPath", () => {
  it("returns the path when it starts with /", () => {
    expect(sanitizeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/billing/checkout")).toBe("/billing/checkout");
    expect(sanitizeRedirectPath("/pages?id=123")).toBe("/pages?id=123");
  });

  it("defaults to /dashboard for null", () => {
    expect(sanitizeRedirectPath(null)).toBe("/dashboard");
  });

  it("defaults to /dashboard for empty string", () => {
    expect(sanitizeRedirectPath("")).toBe("/dashboard");
  });

  it("blocks protocol-relative URLs (open redirect prevention)", () => {
    expect(sanitizeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("//evil.com/path")).toBe("/dashboard");
  });

  it("blocks absolute URLs", () => {
    expect(sanitizeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("http://evil.com/path")).toBe("/dashboard");
  });

  it("blocks paths not starting with /", () => {
    expect(sanitizeRedirectPath("evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("javascript:alert(1)")).toBe("/dashboard");
  });
});
