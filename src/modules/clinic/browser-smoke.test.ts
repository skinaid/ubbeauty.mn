import { describe, expect, it } from "vitest";
import { DEV_CLINIC_ROLE_COOKIE, parseDevClinicRoleOverride } from "./guard";
import { getClinicBrowserSmokeScenarios } from "./browser-smoke";
import { getClinicWorkspaceNavItems } from "./workspace-access";

describe("parseDevClinicRoleOverride", () => {
  it("accepts only supported clinic roles", () => {
    expect(parseDevClinicRoleOverride("provider")).toBe("provider");
    expect(parseDevClinicRoleOverride("front_desk")).toBe("front_desk");
    expect(parseDevClinicRoleOverride("nope")).toBeNull();
    expect(parseDevClinicRoleOverride("")).toBeNull();
  });

  it("uses a stable cookie name for localhost browser smoke", () => {
    expect(DEV_CLINIC_ROLE_COOKIE).toBe("ubbeauty-dev-clinic-role");
  });
});

describe("getClinicBrowserSmokeScenarios", () => {
  it("builds ready-to-run localhost bootstrap scenarios for each key role", () => {
    const scenarios = getClinicBrowserSmokeScenarios();
    expect(scenarios.map((scenario) => scenario.key)).toEqual([
      "owner-command-center",
      "front-desk-handoff",
      "provider-treatment",
      "billing-reconciliation"
    ]);
    expect(scenarios.map((scenario) => scenario.focusMarker)).toEqual([
      "clinic command center",
      "Appointments",
      "Treatments",
      "Checkout POS"
    ]);
    expect(scenarios.map((scenario) => scenario.drilldownPages.length)).toEqual([3, 2, 2, 3]);
    expect(scenarios.map((scenario) => scenario.dynamicChecks)).toEqual([
      [
        "patient_detail",
        "patient_follow_up_form",
        "reports_filters",
        "reports_export",
        "report_preset_form",
        "notifications_filter_form",
        "notifications_actions_panel",
        "follow_up_mutation",
        "notification_retry_mutation",
        "checkout_payment_mutation",
        "report_preset_mutation"
      ],
      [
        "patient_detail",
        "patient_follow_up_form",
        "notifications_filter_form",
        "notifications_actions_panel",
        "notification_retry_mutation",
        "checkout_payment_mutation"
      ],
      ["patient_detail", "patient_follow_up_form", "notifications_filter_form"],
      [
        "reports_filters",
        "reports_export",
        "report_preset_form",
        "notifications_filter_form",
        "notifications_actions_panel",
        "notification_retry_mutation",
        "checkout_payment_mutation"
      ]
    ]);
  });

  it("keeps expected navigation in sync with the workspace access matrix", () => {
    for (const scenario of getClinicBrowserSmokeScenarios("qa@skinaid.mn")) {
      const params = new URL(`https://example.com${scenario.bootstrapPath}`).searchParams;
      expect(scenario.expectedNavLabels).toEqual(
        getClinicWorkspaceNavItems(scenario.role).map((item) => item.label)
      );
      expect(params.get("role")).toBe(scenario.role);
      expect(params.get("next")).toBe(scenario.focusPath);
      expect(params.get("email")).toBe("qa@skinaid.mn");
      expect(scenario.drilldownPages.every((page) => page.path.startsWith("/"))).toBe(true);
      expect(scenario.drilldownPages.every((page) => page.marker.length > 0)).toBe(true);
      expect(
        scenario.dynamicChecks.every((check) =>
          [
            "patient_detail",
            "patient_follow_up_form",
            "reports_filters",
            "reports_export",
            "report_preset_form",
            "notifications_filter_form",
            "notifications_actions_panel",
            "follow_up_mutation",
            "notification_retry_mutation",
            "checkout_payment_mutation",
            "report_preset_mutation"
          ].includes(check)
        )
      ).toBe(true);
    }
  });
});
