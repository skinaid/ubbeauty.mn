import { describe, expect, it } from "vitest";
import { canAccessClinicWorkspaceRoute, getClinicWorkspaceNavItems } from "./workspace-access";

describe("canAccessClinicWorkspaceRoute", () => {
  it("allows the expected operational routes for front desk staff", () => {
    expect(canAccessClinicWorkspaceRoute("front_desk", "/schedule")).toBe(true);
    expect(canAccessClinicWorkspaceRoute("front_desk", "/checkout")).toBe(true);
    expect(canAccessClinicWorkspaceRoute("front_desk", "/reports/export")).toBe(true);
  });

  it("keeps setup and treatment routes limited to clinical or owner roles", () => {
    expect(canAccessClinicWorkspaceRoute("front_desk", "/clinic")).toBe(false);
    expect(canAccessClinicWorkspaceRoute("billing", "/treatments")).toBe(false);
    expect(canAccessClinicWorkspaceRoute("provider", "/treatments")).toBe(true);
    expect(canAccessClinicWorkspaceRoute("manager", "/clinic")).toBe(true);
  });

  it("returns false for unknown workspace paths", () => {
    expect(canAccessClinicWorkspaceRoute("owner", "/settings")).toBe(false);
    expect(canAccessClinicWorkspaceRoute("owner", "/dashboard")).toBe(false);
  });
});

describe("getClinicWorkspaceNavItems", () => {
  it("shows owners the full clinic operating surface", () => {
    expect(getClinicWorkspaceNavItems("owner").map((item) => item.href)).toEqual([
      "/pulse",
      "/schedule",
      "/patients",
      "/treatments",
      "/checkout",
      "/billing",
      "/notifications",
      "/reports",
      "/clinic"
    ]);
  });

  it("shows providers only the modules they actively use", () => {
    expect(getClinicWorkspaceNavItems("provider").map((item) => item.href)).toEqual([
      "/pulse",
      "/schedule",
      "/patients",
      "/treatments",
      "/notifications"
    ]);
  });

  it("shows billing staff the collection and reporting workflow", () => {
    expect(getClinicWorkspaceNavItems("billing").map((item) => item.href)).toEqual([
      "/pulse",
      "/patients",
      "/checkout",
      "/billing",
      "/notifications",
      "/reports"
    ]);
  });
});
