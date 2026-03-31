import { describe, expect, it } from "vitest";
import { hasMinRole, isValidRole } from "./roles";

describe("hasMinRole", () => {
  it("super_admin meets all roles", () => {
    expect(hasMinRole("super_admin", "viewer")).toBe(true);
    expect(hasMinRole("super_admin", "operator")).toBe(true);
    expect(hasMinRole("super_admin", "super_admin")).toBe(true);
  });

  it("operator meets viewer and operator", () => {
    expect(hasMinRole("operator", "viewer")).toBe(true);
    expect(hasMinRole("operator", "operator")).toBe(true);
    expect(hasMinRole("operator", "super_admin")).toBe(false);
  });

  it("viewer meets only viewer", () => {
    expect(hasMinRole("viewer", "viewer")).toBe(true);
    expect(hasMinRole("viewer", "operator")).toBe(false);
    expect(hasMinRole("viewer", "super_admin")).toBe(false);
  });
});

describe("isValidRole", () => {
  it("accepts valid roles", () => {
    expect(isValidRole("super_admin")).toBe(true);
    expect(isValidRole("operator")).toBe(true);
    expect(isValidRole("viewer")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isValidRole("admin")).toBe(false);
    expect(isValidRole("")).toBe(false);
    expect(isValidRole("SUPER_ADMIN")).toBe(false);
  });
});
