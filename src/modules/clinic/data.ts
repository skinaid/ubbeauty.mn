import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import type {
  AppointmentRow,
  ClinicLocationRow,
  ClinicCheckoutItemRow,
  ClinicCheckoutPaymentRow,
  ClinicCheckoutRow,
  ClinicEngagementJobRow,
  ClinicReportPresetRow,
  PatientRow,
  ServiceRow,
  StaffAvailabilityRuleRow,
  StaffMemberRow,
  TreatmentRecordRow
} from "./types";

export type AppointmentWithRelations = AppointmentRow & {
  patient?: Pick<PatientRow, "full_name" | "phone"> | null;
  service?: Pick<ServiceRow, "name" | "duration_minutes"> | null;
  staff_member?: Pick<StaffMemberRow, "full_name"> | null;
  location?: Pick<ClinicLocationRow, "name"> | null;
};

export type TreatmentRecordWithRelations = TreatmentRecordRow & {
  patient?: Pick<PatientRow, "full_name" | "phone"> | null;
  service?: Pick<ServiceRow, "name" | "duration_minutes"> | null;
  staff_member?: Pick<StaffMemberRow, "full_name"> | null;
  appointment?: Pick<AppointmentRow, "scheduled_start" | "status"> | null;
};

export type PatientTimelineSummary = PatientRow & {
  recentAppointments: AppointmentWithRelations[];
  recentTreatments: TreatmentRecordWithRelations[];
  recentCheckouts: ClinicCheckoutWithRelations[];
};

export type PatientDetail = PatientRow & {
  appointments: AppointmentWithRelations[];
  treatments: TreatmentRecordWithRelations[];
  checkouts: ClinicCheckoutWithRelations[];
  followUpItems: string[];
};

export type ClinicCheckoutWithRelations = ClinicCheckoutRow & {
  patient?: Pick<PatientRow, "full_name" | "phone"> | null;
  appointment?:
    | (Pick<AppointmentRow, "scheduled_start" | "status"> & {
        staff_member?: Pick<StaffMemberRow, "full_name"> | null;
        location?: Pick<ClinicLocationRow, "name"> | null;
      })
    | null;
  treatment_record?: Pick<TreatmentRecordRow, "id" | "consent_confirmed"> | null;
  items?: ClinicCheckoutItemRow[] | null;
  payments?: ClinicCheckoutPaymentRow[] | null;
};

export type AppointmentCheckoutSummary = Pick<
  ClinicCheckoutRow,
  "id" | "appointment_id" | "status" | "payment_status" | "total" | "currency"
>;

export type ClinicEngagementJobWithRelations = ClinicEngagementJobRow & {
  patient?: Pick<PatientRow, "full_name" | "phone"> | null;
  appointment?: Pick<AppointmentRow, "scheduled_start" | "status"> | null;
  treatment_record?: Pick<TreatmentRecordRow, "id" | "follow_up_plan"> | null;
};

export type ClinicReportPresetSummary = ClinicReportPresetRow;

async function requireOrganizationId(userId: string): Promise<string | null> {
  const organization = await getCurrentUserOrganization(userId);
  return organization?.id ?? null;
}

export function isClinicFoundationMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message).toLowerCase() : "";
  
  return (
    code === "42P01" || 
    code === "42703" || 
    code === "PGRST205" || 
    message.includes("does not exist") || 
    message.includes("column") || 
    message.includes("schema cache")
  );
}

export const getClinicLocations = cache(async (userId: string): Promise<ClinicLocationRow[]> => {
  const organizationId = await requireOrganizationId(userId);
  if (!organizationId) return [];

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinic_locations")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ClinicLocationRow[];
});

export const getStaffMembers = cache(async (userId: string): Promise<StaffMemberRow[]> => {
  const organizationId = await requireOrganizationId(userId);
  if (!organizationId) return [];

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("staff_members")
    .select("*")
    .eq("organization_id", organizationId)
    .order("full_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as StaffMemberRow[];
});

export async function getStaffAvailabilityRules(userId: string): Promise<StaffAvailabilityRuleRow[]> {
  const organizationId = await requireOrganizationId(userId);
  if (!organizationId) return [];

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("staff_availability_rules")
    .select("*")
    .eq("organization_id", organizationId)
    .order("weekday", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as StaffAvailabilityRuleRow[];
}

export const getServices = cache(async (userId: string): Promise<ServiceRow[]> => {
  const organizationId = await requireOrganizationId(userId);
  if (!organizationId) return [];

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ServiceRow[];
});

export async function getPatients(userId: string, limit = 50): Promise<PatientRow[]> {
  const organizationId = await requireOrganizationId(userId);
  if (!organizationId) return [];

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as PatientRow[];
}

export async function getUpcomingAppointments(userId: string, limit = 50): Promise<AppointmentWithRelations[]> {
  const organizationId = await requireOrganizationId(userId);
  if (!organizationId) return [];

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "*, patient:patients(full_name,phone), service:services(name,duration_minutes), staff_member:staff_members(full_name), location:clinic_locations(name)"
    )
    .eq("organization_id", organizationId)
    .gte("scheduled_start", new Date().toISOString())
    .order("scheduled_start", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as AppointmentWithRelations[];
}

export async function getRecentAppointmentsForDesk(
  userId: string,
  limit = 30
): Promise<AppointmentWithRelations[]> {
  const organizationId = await requireOrganizationId(userId);
  if (!organizationId) return [];

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "*, patient:patients(full_name,phone), service:services(name,duration_minutes), staff_member:staff_members(full_name), location:clinic_locations(name)"
    )
    .eq("organization_id", organizationId)
    .order("scheduled_start", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as AppointmentWithRelations[];
}

export async function getRecentTreatmentRecords(
  userId: string,
  limit = 25
): Promise<TreatmentRecordWithRelations[]> {
  const organizationId = await requireOrganizationId(userId);
  if (!organizationId) return [];

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("treatment_records")
    .select(
      "*, patient:patients(full_name,phone), service:services(name,duration_minutes), staff_member:staff_members(full_name), appointment:appointments(scheduled_start,status)"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as TreatmentRecordWithRelations[];
}

export async function getCompletedAppointmentsForTreatmentQueue(
  userId: string,
  limit = 20
): Promise<AppointmentWithRelations[]> {
  const organizationId = await requireOrganizationId(userId);
  if (!organizationId) return [];

  const supabase = await getSupabaseServerClient();
  const [{ data: appointments, error }, { data: treatmentRecords, error: treatmentError }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "*, patient:patients(full_name,phone), service:services(name,duration_minutes), staff_member:staff_members(full_name), location:clinic_locations(name)"
      )
      .eq("organization_id", organizationId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(limit),
    supabase.from("treatment_records").select("appointment_id").eq("organization_id", organizationId)
  ]);

  if (error) {
    throw error;
  }
  if (treatmentError) {
    throw treatmentError;
  }

  const coveredAppointmentIds = new Set((treatmentRecords ?? []).map((item) => item.appointment_id));
  return ((appointments ?? []) as AppointmentWithRelations[]).filter(
    (appointment) => !coveredAppointmentIds.has(appointment.id)
  );
}

export async function getPatientTimelineSummaries(
  userId: string,
  limit = 12
): Promise<PatientTimelineSummary[]> {
  const organizationId = await requireOrganizationId(userId);
  if (!organizationId) return [];

  const [patients, appointments, treatments, checkouts] = await Promise.all([
    getPatients(userId, limit),
    getSupabaseServerClient().then((supabase) =>
      supabase
        .from("appointments")
        .select(
          "*, patient:patients(full_name,phone), service:services(name,duration_minutes), staff_member:staff_members(full_name), location:clinic_locations(name)"
        )
        .eq("organization_id", organizationId)
        .order("scheduled_start", { ascending: false })
        .limit(limit * 6)
    ),
    getRecentTreatmentRecords(userId, limit * 4),
    getClinicCheckouts(userId, limit * 4).catch((error) => {
      if (isClinicFoundationMissingError(error)) {
        return [] as ClinicCheckoutWithRelations[];
      }
      throw error;
    })
  ]);

  if (appointments.error) {
    throw appointments.error;
  }

  const appointmentsByPatient = new Map<string, AppointmentWithRelations[]>();
  for (const appointment of (appointments.data ?? []) as AppointmentWithRelations[]) {
    const current = appointmentsByPatient.get(appointment.patient_id) ?? [];
    if (current.length < 4) current.push(appointment);
    appointmentsByPatient.set(appointment.patient_id, current);
  }

  const treatmentsByPatient = new Map<string, TreatmentRecordWithRelations[]>();
  for (const treatment of treatments) {
    const current = treatmentsByPatient.get(treatment.patient_id) ?? [];
    if (current.length < 3) current.push(treatment);
    treatmentsByPatient.set(treatment.patient_id, current);
  }

  const checkoutsByPatient = new Map<string, ClinicCheckoutWithRelations[]>();
  for (const checkout of checkouts) {
    const current = checkoutsByPatient.get(checkout.patient_id) ?? [];
    if (current.length < 3) current.push(checkout);
    checkoutsByPatient.set(checkout.patient_id, current);
  }

  return patients.map((patient) => ({
    ...patient,
    recentAppointments: appointmentsByPatient.get(patient.id) ?? [],
    recentTreatments: treatmentsByPatient.get(patient.id) ?? [],
    recentCheckouts: checkoutsByPatient.get(patient.id) ?? []
  }));
}

export async function getPatientDetail(userId: string, patientId: string): Promise<PatientDetail | null> {
  const organizationId = await requireOrganizationId(userId);
  if (!organizationId) return null;

  const supabase = await getSupabaseServerClient();
  const [{ data: patient, error: patientError }, { data: appointments, error: appointmentError }, treatments, checkouts] =
    await Promise.all([
      supabase
        .from("patients")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("id", patientId)
        .maybeSingle(),
      supabase
        .from("appointments")
        .select(
          "*, patient:patients(full_name,phone), service:services(name,duration_minutes), staff_member:staff_members(full_name), location:clinic_locations(name)"
        )
        .eq("organization_id", organizationId)
        .eq("patient_id", patientId)
        .order("scheduled_start", { ascending: false })
        .limit(30),
      getRecentTreatmentRecords(userId, 50).then((rows) => rows.filter((row) => row.patient_id === patientId)),
      getClinicCheckouts(userId, 50).then((rows) => rows.filter((row) => row.patient_id === patientId))
    ]);

  if (patientError) throw patientError;
  if (appointmentError) throw appointmentError;
  if (!patient) return null;

  const followUpItems = treatments
    .map((record) => record.follow_up_plan?.trim() ?? "")
    .filter(Boolean)
    .slice(0, 6);

  return {
    ...(patient as PatientRow),
    appointments: (appointments ?? []) as AppointmentWithRelations[],
    treatments,
    checkouts,
    followUpItems
  };
}

export async function getCheckoutDraftCandidates(
  userId: string,
  limit = 20
): Promise<AppointmentWithRelations[]> {
  const organizationId = await requireOrganizationId(userId);
  if (!organizationId) return [];

  const supabase = await getSupabaseServerClient();
  const [{ data: appointments, error: appointmentError }, { data: checkouts, error: checkoutError }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "*, patient:patients(full_name,phone), service:services(name,duration_minutes), staff_member:staff_members(full_name), location:clinic_locations(name)"
        )
        .eq("organization_id", organizationId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(limit * 2),
      supabase.from("clinic_checkouts").select("appointment_id").eq("organization_id", organizationId)
    ]);

  if (appointmentError) throw appointmentError;
  if (checkoutError) throw checkoutError;

  const existingCheckoutAppointmentIds = new Set((checkouts ?? []).map((row) => row.appointment_id));
  return ((appointments ?? []) as AppointmentWithRelations[]).filter(
    (appointment) => !existingCheckoutAppointmentIds.has(appointment.id)
  );
}

export async function getClinicCheckouts(
  userId: string,
  limit = 20
): Promise<ClinicCheckoutWithRelations[]> {
  const organizationId = await requireOrganizationId(userId);
  if (!organizationId) return [];

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinic_checkouts")
    .select(
      "*, patient:patients(full_name,phone), appointment:appointments(scheduled_start,status,staff_member:staff_members(full_name),location:clinic_locations(name)), treatment_record:treatment_records(id,consent_confirmed), items:clinic_checkout_items(*)"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const checkouts = (data ?? []) as ClinicCheckoutWithRelations[];
  if (checkouts.length === 0) return checkouts;

  try {
    const { data: payments, error: paymentError } = await supabase
      .from("clinic_checkout_payments")
      .select("*")
      .eq("organization_id", organizationId)
      .in(
        "checkout_id",
        checkouts.map((checkout) => checkout.id)
      )
      .order("paid_at", { ascending: false });

    if (paymentError) throw paymentError;

    const paymentsByCheckout = new Map<string, ClinicCheckoutPaymentRow[]>();
    for (const payment of (payments ?? []) as ClinicCheckoutPaymentRow[]) {
      const current = paymentsByCheckout.get(payment.checkout_id) ?? [];
      current.push(payment);
      paymentsByCheckout.set(payment.checkout_id, current);
    }

    return checkouts.map((checkout) => ({
      ...checkout,
      payments: paymentsByCheckout.get(checkout.id) ?? []
    }));
  } catch (paymentError) {
    if (isClinicFoundationMissingError(paymentError)) {
      return checkouts.map((checkout) => ({
        ...checkout,
        payments: []
      }));
    }
    throw paymentError;
  }
}

export async function getClinicEngagementJobs(
  userId: string,
  limit = 20
): Promise<ClinicEngagementJobWithRelations[]> {
  const organizationId = await requireOrganizationId(userId);
  if (!organizationId) return [];

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinic_engagement_jobs")
    .select(
      "*, patient:patients(full_name,phone), appointment:appointments(scheduled_start,status), treatment_record:treatment_records(id,follow_up_plan)"
    )
    .eq("organization_id", organizationId)
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data ?? []) as ClinicEngagementJobWithRelations[];
}

export async function getClinicReportPresets(
  userId: string,
  limit = 12
): Promise<ClinicReportPresetSummary[]> {
  const organizationId = await requireOrganizationId(userId);
  if (!organizationId) return [];

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinic_report_presets")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as ClinicReportPresetSummary[];
}

export async function getAppointmentCheckoutSummaries(
  userId: string,
  appointmentIds: string[]
): Promise<AppointmentCheckoutSummary[]> {
  const organizationId = await requireOrganizationId(userId);
  if (!organizationId || appointmentIds.length === 0) return [];

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinic_checkouts")
    .select("id,appointment_id,status,payment_status,total,currency")
    .eq("organization_id", organizationId)
    .in("appointment_id", appointmentIds);

  if (error) {
    throw error;
  }

  return (data ?? []) as AppointmentCheckoutSummary[];
}
