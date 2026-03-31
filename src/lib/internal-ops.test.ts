import { describe, expect, it, vi, beforeEach } from "vitest";
import { isInternalOpsEmail } from "./internal-ops";

describe("isInternalOpsEmail", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false when env is empty", () => {
    vi.stubEnv("MARTECH_INTERNAL_OPS_EMAILS", "");
    expect(isInternalOpsEmail("admin@example.com")).toBe(false);
  });

  it("returns false when env is undefined", () => {
    vi.stubEnv("MARTECH_INTERNAL_OPS_EMAILS", "");
    expect(isInternalOpsEmail("admin@example.com")).toBe(false);
  });

  it("returns false for null email", () => {
    vi.stubEnv("MARTECH_INTERNAL_OPS_EMAILS", "admin@example.com");
    expect(isInternalOpsEmail(null)).toBe(false);
  });

  it("returns false for undefined email", () => {
    vi.stubEnv("MARTECH_INTERNAL_OPS_EMAILS", "admin@example.com");
    expect(isInternalOpsEmail(undefined)).toBe(false);
  });

  it("matches single email", () => {
    vi.stubEnv("MARTECH_INTERNAL_OPS_EMAILS", "admin@example.com");
    expect(isInternalOpsEmail("admin@example.com")).toBe(true);
  });

  it("matches case-insensitively", () => {
    vi.stubEnv("MARTECH_INTERNAL_OPS_EMAILS", "Admin@Example.com");
    expect(isInternalOpsEmail("admin@example.com")).toBe(true);
  });

  it("matches from comma-separated list", () => {
    vi.stubEnv("MARTECH_INTERNAL_OPS_EMAILS", "one@test.com, two@test.com, three@test.com");
    expect(isInternalOpsEmail("two@test.com")).toBe(true);
    expect(isInternalOpsEmail("one@test.com")).toBe(true);
    expect(isInternalOpsEmail("three@test.com")).toBe(true);
  });

  it("rejects non-listed emails", () => {
    vi.stubEnv("MARTECH_INTERNAL_OPS_EMAILS", "admin@example.com");
    expect(isInternalOpsEmail("hacker@evil.com")).toBe(false);
  });

  it("handles whitespace in env", () => {
    vi.stubEnv("MARTECH_INTERNAL_OPS_EMAILS", "  admin@example.com ,  ops@example.com  ");
    expect(isInternalOpsEmail("admin@example.com")).toBe(true);
    expect(isInternalOpsEmail("ops@example.com")).toBe(true);
  });
});
