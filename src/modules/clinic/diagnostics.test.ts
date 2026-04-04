import { describe, expect, it } from "vitest";
import {
  buildClinicEnvironmentDiagnosticMessage,
  extractSupabaseProjectRef
} from "./diagnostics";

describe("clinic diagnostics", () => {
  it("extracts project ref from supabase url", () => {
    expect(extractSupabaseProjectRef("https://qmxrwzzqdswdtsyzmisy.supabase.co")).toBe(
      "qmxrwzzqdswdtsyzmisy"
    );
    expect(extractSupabaseProjectRef("")).toBeNull();
  });

  it("builds a mismatch message when app and cli refs differ", () => {
    expect(
      buildClinicEnvironmentDiagnosticMessage({
        appProjectRef: "appref123",
        linkedProjectRef: "cliref456",
        projectMismatch: true
      })
    ).toContain("appref123");
  });
});
