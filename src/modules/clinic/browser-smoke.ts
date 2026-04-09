import type { StaffRole } from "./types";

export type BrowserSmokeScenario = {
  key: string;
  role: StaffRole;
  label: string;
  bootstrapPath: string;
  expectedNavLabels: string[];
  focusPath: string;
  focusMarker: string;
  drilldownPages: Array<{
    path: string;
    marker: string;
  }>;
  dynamicChecks: Array<
    | "patient_detail"
    | "patient_follow_up_form"
    | "reports_filters"
    | "reports_export"
    | "report_preset_form"
    | "notifications_filter_form"
    | "notifications_actions_panel"
    | "follow_up_mutation"
    | "notification_retry_mutation"
    | "checkout_payment_mutation"
    | "report_preset_mutation"
  >;
};

export function getClinicBrowserSmokeScenarios(email = "hello@skinaid.mn"): BrowserSmokeScenario[] {
  const encodedEmail = encodeURIComponent(email);

  return [
    {
      key: "owner-command-center",
      role: "owner",
      label: "Owner command center",
      bootstrapPath: `/api/dev/bootstrap-session?role=owner&email=${encodedEmail}&next=/dashboard`,
      expectedNavLabels: [
        "Pulse",
        "Schedule",
        "Patients",
        "Treatments",
        "Checkout",
        "Billing",
        "Notifications",
        "Reports",
        "Clinic"
      ],
      focusPath: "/dashboard",
      focusMarker: "clinic command center",
      drilldownPages: [
        { path: "/reports", marker: "Reports" },
        { path: "/notifications", marker: "Notifications" },
        { path: "/patients", marker: "Patients" }
      ],
      dynamicChecks: [
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
      ]
    },
    {
      key: "front-desk-handoff",
      role: "front_desk",
      label: "Front desk handoff",
      bootstrapPath: `/api/dev/bootstrap-session?role=front_desk&email=${encodedEmail}&next=/schedule`,
      expectedNavLabels: ["Pulse", "Schedule", "Patients", "Checkout", "Billing", "Notifications", "Reports"],
      focusPath: "/schedule",
      focusMarker: "Appointments",
      drilldownPages: [
        { path: "/patients", marker: "Follow-up queue" },
        { path: "/checkout", marker: "Checkout POS" }
      ],
      dynamicChecks: [
        "patient_detail",
        "patient_follow_up_form",
        "notifications_filter_form",
        "notifications_actions_panel",
        "notification_retry_mutation",
        "checkout_payment_mutation"
      ]
    },
    {
      key: "provider-treatment",
      role: "provider",
      label: "Provider treatment workflow",
      bootstrapPath: `/api/dev/bootstrap-session?role=provider&email=${encodedEmail}&next=/treatments`,
      expectedNavLabels: ["Pulse", "Schedule", "Patients", "Treatments", "Notifications"],
      focusPath: "/treatments",
      focusMarker: "Treatments",
      drilldownPages: [
        { path: "/patients", marker: "Patients" },
        { path: "/notifications", marker: "Notifications" }
      ],
      dynamicChecks: ["patient_detail", "patient_follow_up_form", "notifications_filter_form"]
    },
    {
      key: "billing-reconciliation",
      role: "billing",
      label: "Billing reconciliation workflow",
      bootstrapPath: `/api/dev/bootstrap-session?role=billing&email=${encodedEmail}&next=/checkout`,
      expectedNavLabels: ["Pulse", "Patients", "Checkout", "Billing", "Notifications", "Reports"],
      focusPath: "/checkout",
      focusMarker: "Checkout POS",
      drilldownPages: [
        { path: "/billing", marker: "Billing" },
        { path: "/reports", marker: "Reports" },
        { path: "/notifications", marker: "Notifications" }
      ],
      dynamicChecks: [
        "reports_filters",
        "reports_export",
        "report_preset_form",
        "notifications_filter_form",
        "notifications_actions_panel",
        "notification_retry_mutation",
        "checkout_payment_mutation"
      ]
    }
  ];
}
