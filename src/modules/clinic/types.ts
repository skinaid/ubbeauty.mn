import type { Database } from "@/types/database";

export type ClinicLocationRow = Database["public"]["Tables"]["clinic_locations"]["Row"];
export type StaffMemberRow = Database["public"]["Tables"]["staff_members"]["Row"];
export type StaffAvailabilityRuleRow = Database["public"]["Tables"]["staff_availability_rules"]["Row"];
export type ServiceCategoryRow = Database["public"]["Tables"]["service_categories"]["Row"];
export type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
export type PatientRow = Database["public"]["Tables"]["patients"]["Row"];
export type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];
export type AppointmentStatusHistoryRow =
  Database["public"]["Tables"]["appointment_status_history"]["Row"];
export type TreatmentRecordRow = Database["public"]["Tables"]["treatment_records"]["Row"];
export type ClinicCheckoutRow = Database["public"]["Tables"]["clinic_checkouts"]["Row"];
export type ClinicCheckoutItemRow = Database["public"]["Tables"]["clinic_checkout_items"]["Row"];
export type ClinicCheckoutPaymentRow = Database["public"]["Tables"]["clinic_checkout_payments"]["Row"];
export type ClinicEngagementJobRow = Database["public"]["Tables"]["clinic_engagement_jobs"]["Row"];
export type ClinicNotificationDeliveryRow =
  Database["public"]["Tables"]["clinic_notification_deliveries"]["Row"];
export type ClinicReportPresetRow = Database["public"]["Tables"]["clinic_report_presets"]["Row"];

export type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "arrived"
  | "in_progress"
  | "completed"
  | "canceled"
  | "no_show";

export type StaffRole = "owner" | "manager" | "front_desk" | "provider" | "assistant" | "billing";
