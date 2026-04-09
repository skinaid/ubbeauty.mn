import { describe, expect, it } from "vitest";
import { buildClinicPermissionError, CLINIC_ROLE_LABELS, hasClinicRole } from "./guard";

describe("hasClinicRole", () => {
  it("allows listed clinic roles", () => {
    expect(hasClinicRole("owner", ["owner", "manager"])).toBe(true);
    expect(hasClinicRole("front_desk", ["front_desk", "billing"])).toBe(true);
    expect(hasClinicRole("provider", ["provider"])).toBe(true);
  });

  it("denies roles outside the allowed list", () => {
    expect(hasClinicRole("provider", ["billing", "front_desk"])).toBe(false);
    expect(hasClinicRole("assistant", ["owner", "manager"])).toBe(false);
  });
});

describe("buildClinicPermissionError", () => {
  it("renders a readable permission message", () => {
    expect(buildClinicPermissionError(["owner", "billing"])).toBe(
      "Энэ үйлдэлд Owner, Billing эрх шаардлагатай."
    );
  });
});

describe("CLINIC_ROLE_LABELS", () => {
  it("covers all clinic roles with a readable label", () => {
    expect(CLINIC_ROLE_LABELS.assistant).toBe("Assistant");
    expect(CLINIC_ROLE_LABELS.front_desk).toBe("Front desk");
  });
});
