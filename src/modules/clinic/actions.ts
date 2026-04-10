"use server";

import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import {
  summarizeBulkCheckoutDraftResults,
  type CheckoutDraftCreationResult
} from "./checkout-drafts";
import {
  buildClinicEngagementJobPlan,
  getExecutableClinicEngagementJobs
} from "./engagement";
import {
  getNotificationRetryDecision,
  sendClinicNotification,
  toClinicNotificationDeliveryInsert
} from "./notifications";
import {
  buildClinicEnvironmentDiagnosticMessage,
  getClinicEnvironmentDiagnostics
} from "./diagnostics";
import { type ReportRangePreset } from "./reporting";
import { isClinicFoundationMissingError } from "./data";
import { buildClinicPermissionError, hasClinicRole, requireClinicActor } from "./guard";
import { findAvailableStaffAssignment } from "./scheduling";
import type { StaffRole } from "./types";

export type ClinicSetupActionState = {
  error?: string;
  message?: string;
};

type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "arrived"
  | "in_progress"
  | "completed"
  | "canceled"
  | "no_show";

type ClinicPaymentMethod = "cash" | "card" | "qpay" | "bank_transfer" | "other";
type ClinicCheckoutItemType = "service" | "add_on" | "product" | "adjustment";
type ClinicCheckoutPaymentKind = "payment" | "refund";

const ALLOWED_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  booked: ["confirmed", "canceled", "no_show"],
  confirmed: ["arrived", "canceled", "no_show"],
  arrived: ["in_progress", "completed", "canceled"],
  in_progress: ["completed", "canceled"],
  completed: [],
  canceled: [],
  no_show: []
};

function slugifyOrFallback(input: string, prefix: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || `${prefix}-${Date.now()}`;
}

async function requireClinicContext() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Нэвтэрсэн байх шаардлагатай." } as const;
  }

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) {
    return { error: "Clinic workspace олдсонгүй." } as const;
  }

  return { user, organization } as const;
}

async function requireClinicActionAccess(allowedRoles: StaffRole[]) {
  const actor = await requireClinicActor();
  if ("error" in actor) {
    return actor;
  }

  if (!hasClinicRole(actor.role, allowedRoles)) {
    return { error: buildClinicPermissionError(allowedRoles) } as const;
  }

  return actor;
}

function toFriendlyClinicError(error: unknown): string {
  if (isClinicFoundationMissingError(error)) {
    return "Clinic schema migration хараахан ажиллуулаагүй байна. Supabase migration-аа эхлээд apply хийнэ үү.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Үйлдлийг гүйцэтгэх үед алдаа гарлаа.";
}

function parseDateTimeInput(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parsePositiveMoney(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Number(amount.toFixed(2));
}

function parseMoney(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Number(amount.toFixed(2));
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function getClinicNotificationAttemptCount(params: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  organizationId: string;
  engagementJobId: string;
}) {
  const { count, error } = await params.supabase
    .from("clinic_notification_deliveries")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", params.organizationId)
    .eq("engagement_job_id", params.engagementJobId);

  if (error) return 0;
  return count ?? 0;
}

async function recalculateClinicCheckoutTotals(checkoutId: string) {
  const supabase = await getSupabaseServerClient();
  const { data: items, error } = await supabase
    .from("clinic_checkout_items")
    .select("item_type,line_total")
    .eq("checkout_id", checkoutId);

  if (error) {
    throw error;
  }

  let subtotal = 0;
  let discountTotal = 0;

  for (const item of items ?? []) {
    const amount = Number(item.line_total ?? 0);
    if (item.item_type === "adjustment" && amount < 0) {
      discountTotal += Math.abs(amount);
      continue;
    }

    subtotal += amount;
  }

  const total = Number(Math.max(subtotal - discountTotal, 0).toFixed(2));
  return {
    subtotal: Number(subtotal.toFixed(2)),
    discountTotal: Number(discountTotal.toFixed(2)),
    total
  };
}

function getSignedCheckoutPaymentAmount(payment: {
  amount: number | null;
  payment_kind?: string | null;
}) {
  const amount = Number(payment.amount ?? 0);
  return payment.payment_kind === "refund" ? -amount : amount;
}

async function getCheckoutLedgerSummary(params: { checkoutId: string; organizationId: string }) {
  const supabase = await getSupabaseServerClient();
  const { data: existingPayments, error } = await supabase
    .from("clinic_checkout_payments")
    .select("amount,paid_at,payment_kind")
    .eq("checkout_id", params.checkoutId)
    .eq("organization_id", params.organizationId)
    .order("paid_at", { ascending: false });

  if (error) {
    throw error;
  }

  const netPaid = (existingPayments ?? []).reduce(
    (sum, payment) => sum + getSignedCheckoutPaymentAmount(payment),
    0
  );

  return {
    existingPayments,
    netPaid: Number(netPaid.toFixed(2)),
    latestPaymentAt: existingPayments?.find((payment) => payment.payment_kind !== "refund")?.paid_at ?? null
  };
}

async function createCheckoutDraftForAppointment(params: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  organizationId: string;
  userId: string;
  appointmentId: string;
}): Promise<CheckoutDraftCreationResult> {
  const { data: appointment, error } = await params.supabase
    .from("appointments")
    .select("id,organization_id,status,patient_id,service_id")
    .eq("id", params.appointmentId)
    .eq("organization_id", params.organizationId)
    .maybeSingle();

  if (error || !appointment) {
    return { kind: "error" as const, message: "Appointment олдсонгүй." };
  }

  if (appointment.status !== "completed") {
    return { kind: "skipped" as const, message: "Completed биш appointment алгасагдлаа." };
  }

  const { data: existingCheckout } = await params.supabase
    .from("clinic_checkouts")
    .select("id")
    .eq("appointment_id", appointment.id)
    .maybeSingle();

  if (existingCheckout?.id) {
    return { kind: "exists" as const, message: "Checkout draft аль хэдийн үүссэн байна." };
  }

  const [{ data: service, error: serviceError }, { data: treatmentRecord, error: treatmentError }] =
    await Promise.all([
      params.supabase
        .from("services")
        .select("id,name,price_from,currency")
        .eq("id", appointment.service_id)
        .eq("organization_id", params.organizationId)
        .maybeSingle(),
      params.supabase
        .from("treatment_records")
        .select("id")
        .eq("appointment_id", appointment.id)
        .eq("organization_id", params.organizationId)
        .maybeSingle()
    ]);

  if (serviceError || !service) {
    return { kind: "error" as const, message: "Checkout үүсгэхэд service мэдээлэл олдсонгүй." };
  }
  if (treatmentError) {
    return { kind: "error" as const, message: toFriendlyClinicError(treatmentError) };
  }

  const subtotal = Number(service.price_from ?? 0);
  const { data: checkout, error: checkoutError } = await params.supabase
    .from("clinic_checkouts")
    .insert({
      organization_id: params.organizationId,
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      treatment_record_id: treatmentRecord?.id ?? null,
      status: "draft",
      payment_status: "unpaid",
      subtotal,
      total: subtotal,
      currency: service.currency ?? "MNT",
      created_by_user_id: params.userId
    })
    .select("id")
    .single();

  if (checkoutError || !checkout) {
    return { kind: "error" as const, message: toFriendlyClinicError(checkoutError) };
  }

  const { error: itemError } = await params.supabase.from("clinic_checkout_items").insert({
    checkout_id: checkout.id,
    organization_id: params.organizationId,
    service_id: service.id,
    treatment_record_id: treatmentRecord?.id ?? null,
    item_type: "service",
    label: service.name,
    quantity: 1,
    unit_price: subtotal,
    line_total: subtotal
  });

  if (itemError) {
    return { kind: "error" as const, message: toFriendlyClinicError(itemError) };
  }

  return { kind: "created" as const, message: "Checkout draft амжилттай үүслээ." };
}

export async function queueClinicEngagementJobsAction(
  _prev: ClinicSetupActionState,
  _formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager", "front_desk", "billing"]);
  if ("error" in context) return { error: context.error };

  try {
    const supabase = await getSupabaseServerClient();
    const now = new Date();
    const appointmentWindowEnd = addDays(now, 14).toISOString();
    const recentNoShowStart = addDays(now, -3).toISOString();
    const recentTreatmentStart = addDays(now, -14).toISOString();

    const [upcomingAppointments, noShowAppointments, followUpTreatments] = await Promise.all([
      supabase
        .from("appointments")
        .select("id,patient_id,scheduled_start,status")
        .eq("organization_id", context.organization.id)
        .in("status", ["booked", "confirmed"])
        .gte("scheduled_start", now.toISOString())
        .lte("scheduled_start", appointmentWindowEnd),
      supabase
        .from("appointments")
        .select("id,patient_id,updated_at,scheduled_start,status")
        .eq("organization_id", context.organization.id)
        .eq("status", "no_show")
        .gte("updated_at", recentNoShowStart),
      supabase
        .from("treatment_records")
        .select("id,patient_id,appointment_id,updated_at,follow_up_plan")
        .eq("organization_id", context.organization.id)
        .not("follow_up_plan", "is", null)
        .gte("updated_at", recentTreatmentStart)
    ]);

    if (upcomingAppointments.error) {
      return { error: toFriendlyClinicError(upcomingAppointments.error) };
    }
    if (noShowAppointments.error) {
      return { error: toFriendlyClinicError(noShowAppointments.error) };
    }
    if (followUpTreatments.error) {
      return { error: toFriendlyClinicError(followUpTreatments.error) };
    }

    const rows = buildClinicEngagementJobPlan({
      organizationId: context.organization.id,
      upcomingAppointments: upcomingAppointments.data ?? [],
      noShowAppointments: noShowAppointments.data ?? [],
      followUpTreatments: followUpTreatments.data ?? []
    });

    if (rows.length === 0) {
      return { message: "Reminder queue-д оруулах appointment эсвэл follow-up candidate алга байна." };
    }

    const { error: upsertError } = await supabase
      .from("clinic_engagement_jobs")
      .upsert(rows, { onConflict: "organization_id,idempotency_key", ignoreDuplicates: true });

    if (upsertError) {
      return { error: toFriendlyClinicError(upsertError) };
    }

    revalidatePath("/dashboard");
    revalidatePath("/schedule");
    revalidatePath("/patients");
    revalidatePath("/treatments");
    return {
      message: `Reminder/follow-up queue шинэчлэгдлээ. ${rows.length} automation job төлөвлөгдөв.`
    };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function executeDueClinicEngagementJobsAction(
  _prev: ClinicSetupActionState,
  _formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager", "front_desk", "billing"]);
  if ("error" in context) return { error: context.error };

  try {
    const supabase = await getSupabaseServerClient();
    const now = new Date();
    const nowIso = now.toISOString();

    const { data: dueJobs, error } = await supabase
      .from("clinic_engagement_jobs")
      .select(
        "id,job_type,scheduled_for,status,channel,organization_id,patient_id,payload, patient:patients(full_name,phone,email), appointment:appointments(scheduled_start,status), treatment_record:treatment_records(follow_up_plan)"
      )
      .eq("organization_id", context.organization.id)
      .eq("status", "queued")
      .in("channel", ["manual_queue", "call_task", "sms", "email"])
      .lte("scheduled_for", nowIso)
      .order("scheduled_for", { ascending: true })
      .limit(25);

    if (error) {
      return { error: toFriendlyClinicError(error) };
    }

    const executableJobs = getExecutableClinicEngagementJobs(dueJobs ?? [], nowIso);

    if (executableJobs.length === 0) {
      return { message: "Одоогоор ажиллуулах due reminder/follow-up job алга байна." };
    }

    let processed = 0;
    for (const job of executableJobs) {
      const previousAttemptCount = await getClinicNotificationAttemptCount({
        supabase,
        organizationId: context.organization.id,
        engagementJobId: job.id
      });

      const { error: runningError } = await supabase
        .from("clinic_engagement_jobs")
        .update({
          status: "running",
          started_at: nowIso
        })
        .eq("id", job.id)
        .eq("organization_id", context.organization.id)
        .eq("status", "queued");

      if (runningError) continue;

      const deliveryResult = await sendClinicNotification({
        job: {
          id: job.id,
          organization_id: context.organization.id,
          patient_id: job.patient_id,
          channel: job.channel,
          job_type: job.job_type ?? "unknown",
          payload: ("payload" in job ? job.payload : {}) as Database["public"]["Tables"]["clinic_engagement_jobs"]["Row"]["payload"],
          scheduled_for: job.scheduled_for
        },
        patient: "patient" in job ? (job.patient as { full_name?: string | null; phone?: string | null; email?: string | null } | null) : null,
        appointment:
          "appointment" in job
            ? (job.appointment as { scheduled_start?: string | null; status?: string | null } | null)
            : null,
        treatmentRecord:
          "treatment_record" in job
            ? (job.treatment_record as { follow_up_plan?: string | null } | null)
            : null
      });

      await supabase.from("clinic_notification_deliveries").insert(
        toClinicNotificationDeliveryInsert({
          organizationId: context.organization.id,
          patientId: job.patient_id,
          engagementJobId: job.id,
          result: deliveryResult
        })
      );

      const finishedAt = new Date().toISOString();
      const attemptCount = previousAttemptCount + 1;
      const retryDecision =
        deliveryResult.status === "failed"
          ? getNotificationRetryDecision({
              attemptCount,
              nowIso: finishedAt,
              errorMessage: deliveryResult.errorMessage
            })
          : null;

      const outcomeNote =
        deliveryResult.status === "succeeded"
          ? `${deliveryResult.provider} delivery completed (${job.job_type ?? "unknown"})`
          : retryDecision?.shouldRetry
            ? `${deliveryResult.provider} delivery failed: ${deliveryResult.errorMessage ?? "unknown_error"} · retry ${attemptCount}/3 scheduled`
            : `${deliveryResult.provider} delivery failed: ${deliveryResult.errorMessage ?? "unknown_error"}`;
      const retryScheduledFor = retryDecision?.nextScheduledFor ?? finishedAt;

      const nextJobState =
        deliveryResult.status === "succeeded"
          ? {
              status: "succeeded" as const,
              finished_at: finishedAt,
              outcome_notes: outcomeNote
            }
          : retryDecision?.shouldRetry
            ? {
                status: "queued" as const,
                scheduled_for: retryScheduledFor,
                started_at: null,
                finished_at: null,
                outcome_notes: outcomeNote
              }
            : {
                status: "failed" as const,
                finished_at: finishedAt,
                outcome_notes: retryDecision?.maxAttemptsReached
                  ? `${outcomeNote} · max retry reached`
                  : outcomeNote
              };

      const { error: finalUpdateError } = await supabase
        .from("clinic_engagement_jobs")
        .update(nextJobState)
        .eq("id", job.id)
        .eq("organization_id", context.organization.id);

      if (!finalUpdateError) processed += 1;
    }

    revalidatePath("/dashboard");
    revalidatePath("/schedule");
    revalidatePath("/patients");
    revalidatePath("/treatments");
    return {
      message: `${processed} due reminder/follow-up job боловсруулагдлаа.`
    };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function retryClinicEngagementJobAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager", "front_desk", "billing"]);
  if ("error" in context) return { error: context.error };

  const jobId = formData.get("jobId");
  const mode = formData.get("mode");

  if (typeof jobId !== "string" || !jobId) {
    return { error: "Job тодорхойгүй байна." };
  }

  const retryMode = mode === "requeue" ? "requeue" : "retry_now";

  try {
    const supabase = await getSupabaseServerClient();
    const scheduledFor =
      retryMode === "retry_now"
        ? new Date().toISOString()
        : new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("clinic_engagement_jobs")
      .update({
        status: "queued",
        scheduled_for: scheduledFor,
        started_at: null,
        finished_at: null,
        outcome_notes:
          retryMode === "retry_now"
            ? "Manual retry requested from workspace"
            : "Job requeued for the next delivery window"
      })
      .eq("id", jobId)
      .eq("organization_id", context.organization.id);

    if (error) {
      return { error: toFriendlyClinicError(error) };
    }

    revalidatePath("/dashboard");
    revalidatePath("/schedule");
    revalidatePath("/patients");
    revalidatePath("/reports");

    return {
      message:
        retryMode === "retry_now"
          ? "Notification job шууд дахин ажиллуулахаар queue-д орлоо."
          : "Notification job дараагийн цонхонд дахин queue-д орлоо."
    };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

async function findOrCreatePatient(params: {
  organizationId: string;
  fullName: string;
  phone: string;
  email?: string | null;
}) {
  const supabase = await getSupabaseServerClient();
  const normalizedPhone = params.phone.trim();
  const normalizedEmail = params.email?.trim().toLowerCase() || null;

  const { data: existingPatient } = await supabase
    .from("patients")
    .select("id")
    .eq("organization_id", params.organizationId)
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (existingPatient?.id) {
    await supabase
      .from("patients")
      .update({
        full_name: params.fullName.trim(),
        email: normalizedEmail,
        updated_at: new Date().toISOString()
      })
      .eq("id", existingPatient.id);
    return existingPatient.id;
  }

  const { data: patient, error } = await supabase
    .from("patients")
    .insert({
      organization_id: params.organizationId,
      full_name: params.fullName.trim(),
      phone: normalizedPhone,
      email: normalizedEmail,
      source: "manual"
    })
    .select("id")
    .single();

  if (error || !patient) {
    throw error ?? new Error("Patient үүсгэж чадсангүй.");
  }

  return patient.id;
}

export async function createClinicLocationAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };

  const name = formData.get("name");
  const district = formData.get("district");
  const addressLine1 = formData.get("addressLine1");
  const phone = formData.get("phone");

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Салбарын нэр оруулна уу." };
  }

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.from("clinic_locations").insert({
    organization_id: context.organization.id,
    name: name.trim(),
    slug: slugifyOrFallback(name, "location"),
    district: typeof district === "string" && district.trim() ? district.trim() : null,
    address_line1: typeof addressLine1 === "string" && addressLine1.trim() ? addressLine1.trim() : null,
    phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
    latitude: null,
    longitude: null,
    google_maps_url: null,
    working_hours: null,
    description: null,
  });

  if (error) {
    return { error: toFriendlyClinicError(error) };
  }

  revalidatePath("/clinic");
  revalidatePath("/schedule");
  return { message: "Салбар амжилттай нэмэгдлээ." };
}

export async function updateClinicLocationGeo(
  locationId: string,
  fields: {
    latitude?: number | null;
    longitude?: number | null;
    google_maps_url?: string | null;
    working_hours?: Record<string, string> | null;
    description?: string | null;
    name?: string;
    address_line1?: string | null;
    district?: string | null;
    phone?: string | null;
  }
): Promise<{ error?: string }> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("clinic_locations")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", locationId)
    .eq("organization_id", context.organization.id);

  if (error) return { error: toFriendlyClinicError(error) };
  revalidatePath("/clinic/locations");
  revalidatePath("/clinic");
  return {};
}

export async function deleteClinicLocation(locationId: string): Promise<{ error?: string }> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("clinic_locations")
    .delete()
    .eq("id", locationId)
    .eq("organization_id", context.organization.id);

  if (error) return { error: toFriendlyClinicError(error) };
  revalidatePath("/clinic/locations");
  revalidatePath("/clinic");
  return {};
}

export async function createStaffMemberAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };

  const fullName = formData.get("fullName");
  const role = formData.get("role");
  const specialty = formData.get("specialty");
  const phone = formData.get("phone");
  const email = formData.get("email");

  if (typeof fullName !== "string" || !fullName.trim()) {
    return { error: "Ажилтны нэр оруулна уу." };
  }

  if (typeof role !== "string" || !role.trim()) {
    return { error: "Ажилтны role сонгоно уу." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("staff_members").insert({
    organization_id: context.organization.id,
    full_name: fullName.trim(),
    role,
    specialty: typeof specialty === "string" && specialty.trim() ? specialty.trim() : null,
    phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
    email: typeof email === "string" && email.trim() ? email.trim() : null
  });

  if (error) {
    return { error: toFriendlyClinicError(error) };
  }

  revalidatePath("/clinic");
  revalidatePath("/schedule");
  return { message: "Ажилтан амжилттай нэмэгдлээ." };
}

export async function createServiceAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };

  const name = formData.get("name");
  const durationMinutes = formData.get("durationMinutes");
  const priceFrom = formData.get("priceFrom");
  const description = formData.get("description");

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Үйлчилгээний нэр оруулна уу." };
  }

  const duration = Number(durationMinutes);
  if (!Number.isFinite(duration) || duration <= 0) {
    return { error: "Үргэлжлэх хугацааг зөв оруулна уу." };
  }

  const price = Number(priceFrom);
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Price from утгыг зөв оруулна уу." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("services").insert({
    organization_id: context.organization.id,
    name: name.trim(),
    slug: slugifyOrFallback(name, "service"),
    duration_minutes: duration,
    price_from: price,
    description: typeof description === "string" && description.trim() ? description.trim() : null
  });

  if (error) {
    return { error: toFriendlyClinicError(error) };
  }

  revalidatePath("/clinic");
  revalidatePath("/schedule");
  return { message: "Үйлчилгээ амжилттай нэмэгдлээ." };
}

export async function createStaffAvailabilityRuleAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };

  const staffMemberId = formData.get("staffMemberId");
  const locationId = formData.get("locationId");
  const weekday = Number(formData.get("weekday"));
  const startLocal = formData.get("startLocal");
  const endLocal = formData.get("endLocal");

  if (typeof staffMemberId !== "string" || !staffMemberId) {
    return { error: "Ажилтан сонгоно уу." };
  }
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return { error: "Өдөр буруу байна." };
  }
  if (typeof startLocal !== "string" || !startLocal || typeof endLocal !== "string" || !endLocal) {
    return { error: "Ажлын цагийн хүрээг оруулна уу." };
  }
  if (startLocal >= endLocal) {
    return { error: "Эхлэх цаг нь дуусах цагаас өмнө байх ёстой." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.from("staff_availability_rules").insert({
      organization_id: context.organization.id,
      staff_member_id: staffMemberId,
      location_id: typeof locationId === "string" && locationId ? locationId : null,
      weekday,
      start_local: `${startLocal}:00`,
      end_local: `${endLocal}:00`,
      is_available: true
    });

    if (error) {
      return { error: toFriendlyClinicError(error) };
    }

    revalidatePath("/clinic");
    revalidatePath("/schedule");
    return { message: "Availability rule амжилттай хадгалагдлаа." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function createAdminAppointmentAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager", "front_desk"]);
  if ("error" in context) return { error: context.error };

  const fullName = formData.get("fullName");
  const phone = formData.get("phone");
  const email = formData.get("email");
  const serviceId = formData.get("serviceId");
  const scheduledStartRaw = formData.get("scheduledStart");
  const staffMemberId = formData.get("staffMemberId");
  const locationId = formData.get("locationId");
  const internalNotes = formData.get("internalNotes");

  if (typeof fullName !== "string" || !fullName.trim()) {
    return { error: "Patient-ийн нэр оруулна уу." };
  }
  if (typeof phone !== "string" || !phone.trim()) {
    return { error: "Patient-ийн утас оруулна уу." };
  }
  if (typeof serviceId !== "string" || !serviceId) {
    return { error: "Үйлчилгээ сонгоно уу." };
  }
  if (typeof scheduledStartRaw !== "string") {
    return { error: "Цагийн мэдээлэл дутуу байна." };
  }

  const scheduledStart = parseDateTimeInput(scheduledStartRaw);
  if (!scheduledStart) {
    return { error: "Цагийн утга буруу байна." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id,duration_minutes,buffer_before_minutes,buffer_after_minutes")
      .eq("id", serviceId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();

    if (serviceError || !service) {
      return { error: "Сонгосон үйлчилгээ олдсонгүй." };
    }

    const patientId = await findOrCreatePatient({
      organizationId: context.organization.id,
      fullName,
      phone,
      email: typeof email === "string" ? email : null
    });

    const scheduledEnd = new Date(scheduledStart.getTime() + service.duration_minutes * 60 * 1000);
    const createdAt = new Date().toISOString();
    const requestedStaffId = typeof staffMemberId === "string" && staffMemberId ? staffMemberId : null;
    const requestedLocationId = typeof locationId === "string" && locationId ? locationId : null;

    const [{ data: availabilityRules, error: availabilityError }, { data: existingAppointments, error: existingAppointmentsError }] =
      await Promise.all([
        supabase
          .from("staff_availability_rules")
          .select("staff_member_id,location_id,weekday,start_local,end_local,is_available")
          .eq("organization_id", context.organization.id),
        supabase
          .from("appointments")
          .select("staff_member_id,scheduled_start,scheduled_end,status")
          .eq("organization_id", context.organization.id)
          .lte("scheduled_start", scheduledEnd.toISOString())
          .gte("scheduled_end", scheduledStart.toISOString())
      ]);

    if (availabilityError) {
      return { error: toFriendlyClinicError(availabilityError) };
    }
    if (existingAppointmentsError) {
      return { error: toFriendlyClinicError(existingAppointmentsError) };
    }

    const assignment = findAvailableStaffAssignment({
      preferredStaffId: requestedStaffId,
      requestedStart: scheduledStart,
      requestedEnd: scheduledEnd,
      bufferBeforeMinutes: service.buffer_before_minutes,
      bufferAfterMinutes: service.buffer_after_minutes,
      rules: availabilityRules ?? [],
      appointments: existingAppointments ?? []
    });

    if ((availabilityRules ?? []).length > 0 && !assignment) {
      return { error: "Сонгосон цаг staff availability эсвэл давхцлын дүрмийг зөрчиж байна." };
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        organization_id: context.organization.id,
        patient_id: patientId,
        service_id: service.id,
        staff_member_id: assignment?.staffMemberId ?? requestedStaffId,
        location_id: requestedLocationId ?? assignment?.locationId ?? null,
        source: "admin",
        status: "booked",
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        duration_minutes: service.duration_minutes,
        internal_notes: typeof internalNotes === "string" && internalNotes.trim() ? internalNotes.trim() : null,
        created_by_user_id: context.user.id
      })
      .select("id")
      .single();

    if (appointmentError || !appointment) {
      return { error: toFriendlyClinicError(appointmentError) };
    }

    const { error: historyError } = await supabase.from("appointment_status_history").insert({
      organization_id: context.organization.id,
      appointment_id: appointment.id,
      from_status: null,
      to_status: "booked",
      changed_by_user_id: context.user.id,
      created_at: createdAt
    });

    if (historyError) {
      return { error: toFriendlyClinicError(historyError) };
    }

    revalidatePath("/schedule");
    revalidatePath("/patients");
    return { message: "Appointment амжилттай үүслээ." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function transitionAppointmentStatusAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager", "front_desk", "provider"]);
  if ("error" in context) return { error: context.error };

  const appointmentId = formData.get("appointmentId");
  const nextStatus = formData.get("nextStatus");

  if (typeof appointmentId !== "string" || !appointmentId) {
    return { error: "Appointment сонгогдоогүй байна." };
  }
  if (typeof nextStatus !== "string" || !nextStatus) {
    return { error: "Шинэ статус сонгогдоогүй байна." };
  }

  const targetStatus = nextStatus as AppointmentStatus;
  if (!(targetStatus in ALLOWED_STATUS_TRANSITIONS)) {
    return { error: "Статус буруу байна." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("id,organization_id,status,patient_id")
      .eq("id", appointmentId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();

    if (error || !appointment) {
      return { error: "Appointment олдсонгүй." };
    }

    const currentStatus = appointment.status as AppointmentStatus;
    if (currentStatus === targetStatus) {
      return { message: "Appointment энэ статустай байна." };
    }

    if (!ALLOWED_STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus)) {
      return { error: `${currentStatus} -> ${targetStatus} шилжилт одоогоор зөвшөөрөгдөөгүй.` };
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, string | null> = {
      status: targetStatus
    };

    if (targetStatus === "confirmed") updatePayload.confirmation_sent_at = now;
    if (targetStatus === "arrived") updatePayload.checked_in_at = now;
    if (targetStatus === "completed") updatePayload.completed_at = now;
    if (targetStatus === "canceled") updatePayload.canceled_at = now;

    const { error: updateError } = await supabase
      .from("appointments")
      .update(updatePayload)
      .eq("id", appointment.id);

    if (updateError) {
      return { error: toFriendlyClinicError(updateError) };
    }

    const { error: historyError } = await supabase.from("appointment_status_history").insert({
      organization_id: context.organization.id,
      appointment_id: appointment.id,
      from_status: currentStatus,
      to_status: targetStatus,
      changed_by_user_id: context.user.id,
      created_at: now
    });

    if (historyError) {
      return { error: toFriendlyClinicError(historyError) };
    }

    if (targetStatus === "completed") {
      await supabase
        .from("patients")
        .update({ last_visit_at: now })
        .eq("id", appointment.patient_id)
        .eq("organization_id", context.organization.id);
    }

    if (targetStatus === "canceled" || targetStatus === "no_show") {
      const { data: patient } = await supabase
        .from("patients")
        .select("cancellation_count,no_show_count")
        .eq("id", appointment.patient_id)
        .eq("organization_id", context.organization.id)
        .maybeSingle();

      if (patient) {
        await supabase
          .from("patients")
          .update({
            cancellation_count:
              targetStatus === "canceled" ? (patient.cancellation_count ?? 0) + 1 : patient.cancellation_count,
            no_show_count:
              targetStatus === "no_show" ? (patient.no_show_count ?? 0) + 1 : patient.no_show_count
          })
          .eq("id", appointment.patient_id)
          .eq("organization_id", context.organization.id);
      }
    }

    revalidatePath("/schedule");
    revalidatePath("/patients");
    return { message: `Appointment статус ${targetStatus} боллоо.` };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function upsertTreatmentRecordAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager", "provider"]);
  if ("error" in context) return { error: context.error };

  const appointmentId = formData.get("appointmentId");
  if (typeof appointmentId !== "string" || !appointmentId) {
    return { error: "Appointment мэдээлэл дутуу байна." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("id,organization_id,status,patient_id,service_id,staff_member_id")
      .eq("id", appointmentId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();

    if (error || !appointment) {
      return { error: "Appointment олдсонгүй." };
    }

    if (appointment.status !== "completed") {
      return { error: "Treatment record зөвхөн completed appointment дээр хадгалагдана." };
    }

    const payload = {
      organization_id: context.organization.id,
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      service_id: appointment.service_id,
      staff_member_id: appointment.staff_member_id,
      subjective_notes:
        typeof formData.get("subjectiveNotes") === "string" && String(formData.get("subjectiveNotes")).trim()
          ? String(formData.get("subjectiveNotes")).trim()
          : null,
      objective_notes:
        typeof formData.get("objectiveNotes") === "string" && String(formData.get("objectiveNotes")).trim()
          ? String(formData.get("objectiveNotes")).trim()
          : null,
      assessment_notes:
        typeof formData.get("assessmentNotes") === "string" && String(formData.get("assessmentNotes")).trim()
          ? String(formData.get("assessmentNotes")).trim()
          : null,
      plan_notes:
        typeof formData.get("planNotes") === "string" && String(formData.get("planNotes")).trim()
          ? String(formData.get("planNotes")).trim()
          : null,
      contraindications:
        typeof formData.get("contraindications") === "string" && String(formData.get("contraindications")).trim()
          ? String(formData.get("contraindications")).trim()
          : null,
      follow_up_plan:
        typeof formData.get("followUpPlan") === "string" && String(formData.get("followUpPlan")).trim()
          ? String(formData.get("followUpPlan")).trim()
          : null,
      follow_up_outcome:
        typeof formData.get("followUpOutcome") === "string" && String(formData.get("followUpOutcome")).trim()
          ? String(formData.get("followUpOutcome")).trim()
          : null,
      complication_notes:
        typeof formData.get("complicationNotes") === "string" && String(formData.get("complicationNotes")).trim()
          ? String(formData.get("complicationNotes")).trim()
          : null,
      consent_artifact_url:
        typeof formData.get("consentArtifactUrl") === "string" && String(formData.get("consentArtifactUrl")).trim()
          ? String(formData.get("consentArtifactUrl")).trim()
          : null,
      before_photo_url:
        typeof formData.get("beforePhotoUrl") === "string" && String(formData.get("beforePhotoUrl")).trim()
          ? String(formData.get("beforePhotoUrl")).trim()
          : null,
      after_photo_url:
        typeof formData.get("afterPhotoUrl") === "string" && String(formData.get("afterPhotoUrl")).trim()
          ? String(formData.get("afterPhotoUrl")).trim()
          : null,
      before_after_asset_notes:
        typeof formData.get("beforeAfterAssetNotes") === "string" &&
        String(formData.get("beforeAfterAssetNotes")).trim()
          ? String(formData.get("beforeAfterAssetNotes")).trim()
          : null,
      consent_confirmed: formData.get("consentConfirmed") === "on"
    };

    const { data: existing } = await supabase
      .from("treatment_records")
      .select("id")
      .eq("appointment_id", appointment.id)
      .maybeSingle();

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("treatment_records")
        .update(payload)
        .eq("id", existing.id);
      if (updateError) {
        return { error: toFriendlyClinicError(updateError) };
      }
    } else {
      const { error: insertError } = await supabase.from("treatment_records").insert(payload);
      if (insertError) {
        return { error: toFriendlyClinicError(insertError) };
      }
    }

    revalidatePath("/treatments");
    revalidatePath("/patients");
    return { message: "Treatment record амжилттай хадгалагдлаа." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function createCheckoutDraftAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager", "front_desk", "billing"]);
  if ("error" in context) return { error: context.error };

  const appointmentId = formData.get("appointmentId");
  if (typeof appointmentId !== "string" || !appointmentId) {
    return { error: "Appointment мэдээлэл дутуу байна." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const result = await createCheckoutDraftForAppointment({
      supabase,
      organizationId: context.organization.id,
      userId: context.user.id,
      appointmentId
    });

    if (result.kind === "error") {
      return { error: result.message };
    }
    if (result.kind === "skipped") {
      return { error: "Checkout draft зөвхөн completed appointment дээр үүснэ." };
    }
    if (result.kind === "exists") {
      return { message: "Энэ appointment дээр checkout draft аль хэдийн үүссэн байна." };
    }

    revalidatePath("/billing");
    revalidatePath("/checkout");
    revalidatePath("/treatments");
    return { message: result.message };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function createBulkCheckoutDraftsAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager", "front_desk", "billing"]);
  if ("error" in context) return { error: context.error };

  const appointmentIds = formData
    .getAll("appointmentIds")
    .map((value) => (typeof value === "string" ? value : ""))
    .filter(Boolean);

  if (appointmentIds.length === 0) {
    return { error: "Ядаж нэг completed visit сонгоно уу." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const results: CheckoutDraftCreationResult[] = [];

    for (const appointmentId of appointmentIds) {
      const result = await createCheckoutDraftForAppointment({
        supabase,
        organizationId: context.organization.id,
        userId: context.user.id,
        appointmentId
      });
      results.push(result);
    }

    const summary = summarizeBulkCheckoutDraftResults(results);

    revalidatePath("/billing");
    revalidatePath("/checkout");
    revalidatePath("/treatments");

    return {
      message: summary.message
    };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function captureClinicCheckoutPaymentAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager", "front_desk", "billing"]);
  if ("error" in context) return { error: context.error };

  const checkoutId = formData.get("checkoutId");
  const amount = parsePositiveMoney(formData.get("amount"));
  const paymentMethod = formData.get("paymentMethod");
  const referenceCode = formData.get("referenceCode");
  const notes = formData.get("notes");

  if (typeof checkoutId !== "string" || !checkoutId) {
    return { error: "Checkout сонгогдоогүй байна." };
  }
  if (amount === null) {
    return { error: "Төлбөрийн дүнг зөв оруулна уу." };
  }
  if (typeof paymentMethod !== "string" || !paymentMethod) {
    return { error: "Төлбөрийн арга сонгоно уу." };
  }

  const method = paymentMethod as ClinicPaymentMethod;
  if (!["cash", "card", "qpay", "bank_transfer", "other"].includes(method)) {
    return { error: "Төлбөрийн арга буруу байна." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data: checkout, error } = await supabase
      .from("clinic_checkouts")
      .select("id,organization_id,patient_id,total,currency,status,payment_status")
      .eq("id", checkoutId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();

    if (error || !checkout) {
      return { error: "Checkout олдсонгүй." };
    }

    if (checkout.status === "voided") {
      return { error: "Voided checkout дээр төлбөр бүртгэх боломжгүй." };
    }
    if (checkout.payment_status === "paid") {
      return { message: "Энэ checkout аль хэдийн бүрэн төлөгдсөн байна." };
    }

    const { netPaid: paidSoFar } = await getCheckoutLedgerSummary({
      checkoutId: checkout.id,
      organizationId: context.organization.id
    });
    const outstanding = Math.max(Number(checkout.total) - paidSoFar, 0);

    if (outstanding <= 0) {
      return { message: "Энэ checkout дээр үлдэгдэл байхгүй байна." };
    }
    if (amount > outstanding) {
      return { error: `Үлдэгдэл ${outstanding.toFixed(2)} ${checkout.currency}-с их дүн авч болохгүй.` };
    }

    const paidAt = new Date().toISOString();
    const { error: insertError } = await supabase.from("clinic_checkout_payments").insert({
      checkout_id: checkout.id,
      organization_id: context.organization.id,
      patient_id: checkout.patient_id,
      amount,
      currency: checkout.currency,
      payment_kind: "payment" satisfies ClinicCheckoutPaymentKind,
      payment_method: method,
      reference_code:
        typeof referenceCode === "string" && referenceCode.trim() ? referenceCode.trim() : null,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      paid_at: paidAt,
      received_by_user_id: context.user.id
    });

    if (insertError) {
      return { error: toFriendlyClinicError(insertError) };
    }

    const updatedPaid = paidSoFar + amount;
    const fullyPaid = updatedPaid >= Number(checkout.total);
    const { error: updateError } = await supabase
      .from("clinic_checkouts")
      .update({
        payment_status: fullyPaid ? "paid" : "partial",
        status: fullyPaid ? "paid" : checkout.status,
        paid_at: fullyPaid ? paidAt : null
      })
      .eq("id", checkout.id);

    if (updateError) {
      return { error: toFriendlyClinicError(updateError) };
    }

    revalidatePath("/billing");
    revalidatePath("/checkout");
    revalidatePath("/patients");
    return {
      message: fullyPaid
        ? "Төлбөр бүрэн бүртгэгдэж checkout paid боллоо."
        : "Төлбөр partial байдлаар бүртгэгдлээ."
    };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function addClinicCheckoutItemAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager", "front_desk", "billing"]);
  if ("error" in context) return { error: context.error };

  const checkoutId = formData.get("checkoutId");
  const label = formData.get("label");
  const quantityRaw = formData.get("quantity");
  const unitPrice = parseMoney(formData.get("unitPrice"));
  const itemType = formData.get("itemType");

  if (typeof checkoutId !== "string" || !checkoutId) {
    return { error: "Checkout сонгогдоогүй байна." };
  }
  if (typeof label !== "string" || !label.trim()) {
    return { error: "Item нэр оруулна уу." };
  }
  if (unitPrice === null) {
    return { error: "Үнэ буруу байна." };
  }
  if (typeof itemType !== "string" || !itemType) {
    return { error: "Item төрөл сонгоно уу." };
  }

  const normalizedItemType = itemType as ClinicCheckoutItemType;
  if (!["service", "add_on", "product", "adjustment"].includes(normalizedItemType)) {
    return { error: "Item төрөл буруу байна." };
  }

  const quantity = Number(quantityRaw);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: "Тоо ширхэгийг зөв оруулна уу." };
  }

  if (normalizedItemType !== "adjustment" && unitPrice <= 0) {
    return { error: "Эерэг үнэ оруулна уу." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data: checkout, error } = await supabase
      .from("clinic_checkouts")
      .select("id,organization_id,status,payment_status")
      .eq("id", checkoutId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();

    if (error || !checkout) {
      return { error: "Checkout олдсонгүй." };
    }

    if (checkout.payment_status === "paid") {
      return { error: "Paid checkout дээр item нэмэхээс өмнө refund/void урсгал хэрэгтэй." };
    }

    const lineTotal = Number((unitPrice * quantity).toFixed(2));
    const { error: insertError } = await supabase.from("clinic_checkout_items").insert({
      checkout_id: checkout.id,
      organization_id: context.organization.id,
      item_type: normalizedItemType,
      label: label.trim(),
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal
    });

    if (insertError) {
      return { error: toFriendlyClinicError(insertError) };
    }

    const totals = await recalculateClinicCheckoutTotals(checkout.id);
    const { netPaid: paidSoFar, latestPaymentAt } = await getCheckoutLedgerSummary({
      checkoutId: checkout.id,
      organizationId: context.organization.id
    });
    const paymentStatus =
      paidSoFar <= 0 ? "unpaid" : paidSoFar >= totals.total ? "paid" : "partial";

    const { error: updateError } = await supabase
      .from("clinic_checkouts")
      .update({
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        total: totals.total,
        payment_status: paymentStatus,
        paid_at: paymentStatus === "paid" ? latestPaymentAt : null,
        status: checkout.status === "voided" ? checkout.status : paymentStatus === "paid" ? "paid" : "draft"
      })
      .eq("id", checkout.id);

    if (updateError) {
      return { error: toFriendlyClinicError(updateError) };
    }

    revalidatePath("/billing");
    revalidatePath("/checkout");
    revalidatePath("/patients");
    return { message: "Checkout item амжилттай нэмэгдлээ." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function removeClinicCheckoutItemAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager", "front_desk", "billing"]);
  if ("error" in context) return { error: context.error };

  const checkoutItemId = formData.get("checkoutItemId");
  if (typeof checkoutItemId !== "string" || !checkoutItemId) {
    return { error: "Checkout item сонгогдоогүй байна." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data: item, error } = await supabase
      .from("clinic_checkout_items")
      .select("id,checkout_id,organization_id")
      .eq("id", checkoutItemId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();

    if (error || !item) {
      return { error: "Checkout item олдсонгүй." };
    }

    const { data: checkout, error: checkoutError } = await supabase
      .from("clinic_checkouts")
      .select("id,status,payment_status")
      .eq("id", item.checkout_id)
      .eq("organization_id", context.organization.id)
      .maybeSingle();

    if (checkoutError || !checkout) {
      return { error: "Checkout олдсонгүй." };
    }

    if (checkout.payment_status === "paid") {
      return { error: "Paid checkout-с item хасахын өмнө refund урсгал ашиглана уу." };
    }

    const { error: deleteError } = await supabase
      .from("clinic_checkout_items")
      .delete()
      .eq("id", item.id)
      .eq("organization_id", context.organization.id);

    if (deleteError) {
      return { error: toFriendlyClinicError(deleteError) };
    }

    const totals = await recalculateClinicCheckoutTotals(checkout.id);
    const { netPaid: paidSoFar, latestPaymentAt } = await getCheckoutLedgerSummary({
      checkoutId: checkout.id,
      organizationId: context.organization.id
    });
    const paymentStatus =
      paidSoFar <= 0 ? "unpaid" : paidSoFar >= totals.total ? "paid" : "partial";

    const { error: updateError } = await supabase
      .from("clinic_checkouts")
      .update({
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        total: totals.total,
        payment_status: paymentStatus,
        paid_at: paymentStatus === "paid" ? latestPaymentAt : null,
        status: checkout.status === "voided" ? checkout.status : paymentStatus === "paid" ? "paid" : "draft"
      })
      .eq("id", checkout.id);

    if (updateError) {
      return { error: toFriendlyClinicError(updateError) };
    }

    revalidatePath("/billing");
    revalidatePath("/checkout");
    revalidatePath("/patients");
    return { message: "Checkout item хасагдлаа." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function updateClinicCheckoutItemAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager", "billing"]);
  if ("error" in context) return { error: context.error };

  const checkoutItemId = formData.get("checkoutItemId");
  const label = formData.get("label");
  const quantityRaw = formData.get("quantity");
  const unitPrice = parseMoney(formData.get("unitPrice"));

  if (typeof checkoutItemId !== "string" || !checkoutItemId) {
    return { error: "Checkout item сонгогдоогүй байна." };
  }
  if (typeof label !== "string" || !label.trim()) {
    return { error: "Item нэр оруулна уу." };
  }
  if (unitPrice === null) {
    return { error: "Үнэ буруу байна." };
  }

  const quantity = Number(quantityRaw);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: "Тоо ширхэгийг зөв оруулна уу." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data: item, error } = await supabase
      .from("clinic_checkout_items")
      .select("id,checkout_id,organization_id,item_type")
      .eq("id", checkoutItemId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();

    if (error || !item) {
      return { error: "Checkout item олдсонгүй." };
    }

    const { data: checkout, error: checkoutError } = await supabase
      .from("clinic_checkouts")
      .select("id,status,payment_status")
      .eq("id", item.checkout_id)
      .eq("organization_id", context.organization.id)
      .maybeSingle();

    if (checkoutError || !checkout) {
      return { error: "Checkout олдсонгүй." };
    }

    if (checkout.payment_status === "paid") {
      return { error: "Paid checkout дээр item засварлахын өмнө refund урсгал ашиглана уу." };
    }

    if (item.item_type !== "adjustment" && unitPrice <= 0) {
      return { error: "Эерэг үнэ оруулна уу." };
    }

    const lineTotal = Number((unitPrice * quantity).toFixed(2));
    const { error: updateItemError } = await supabase
      .from("clinic_checkout_items")
      .update({
        label: label.trim(),
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal
      })
      .eq("id", item.id)
      .eq("organization_id", context.organization.id);

    if (updateItemError) {
      return { error: toFriendlyClinicError(updateItemError) };
    }

    const totals = await recalculateClinicCheckoutTotals(checkout.id);
    const { netPaid: paidSoFar, latestPaymentAt } = await getCheckoutLedgerSummary({
      checkoutId: checkout.id,
      organizationId: context.organization.id
    });
    const paymentStatus =
      paidSoFar <= 0 ? "unpaid" : paidSoFar >= totals.total ? "paid" : "partial";

    const { error: updateCheckoutError } = await supabase
      .from("clinic_checkouts")
      .update({
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        total: totals.total,
        payment_status: paymentStatus,
        paid_at: paymentStatus === "paid" ? latestPaymentAt : null,
        status: checkout.status === "voided" ? checkout.status : paymentStatus === "paid" ? "paid" : "draft"
      })
      .eq("id", checkout.id);

    if (updateCheckoutError) {
      return { error: toFriendlyClinicError(updateCheckoutError) };
    }

    revalidatePath("/billing");
    revalidatePath("/checkout");
    revalidatePath("/patients");
    return { message: "Checkout item шинэчлэгдлээ." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function refundClinicCheckoutAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager", "billing"]);
  if ("error" in context) return { error: context.error };

  const checkoutId = formData.get("checkoutId");
  const amount = parsePositiveMoney(formData.get("amount"));
  const notes = formData.get("notes");
  const referenceCode = formData.get("referenceCode");

  if (typeof checkoutId !== "string" || !checkoutId) {
    return { error: "Checkout сонгогдоогүй байна." };
  }
  if (amount === null) {
    return { error: "Refund дүнг зөв оруулна уу." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data: checkout, error } = await supabase
      .from("clinic_checkouts")
      .select("id,organization_id,patient_id,total,currency")
      .eq("id", checkoutId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();

    if (error || !checkout) {
      return { error: "Checkout олдсонгүй." };
    }

    const { netPaid } = await getCheckoutLedgerSummary({
      checkoutId: checkout.id,
      organizationId: context.organization.id
    });

    if (netPaid <= 0) {
      return { error: "Буцаалт хийх төлөгдсөн үлдэгдэл байхгүй байна." };
    }
    if (amount > netPaid) {
      return { error: `Буцаалт нь net paid ${netPaid.toFixed(2)} ${checkout.currency}-с их байж болохгүй.` };
    }

    const refundAt = new Date().toISOString();
    const { error: insertError } = await supabase.from("clinic_checkout_payments").insert({
      checkout_id: checkout.id,
      organization_id: context.organization.id,
      patient_id: checkout.patient_id,
      amount,
      currency: checkout.currency,
      payment_kind: "refund" satisfies ClinicCheckoutPaymentKind,
      payment_method: "other",
      reference_code:
        typeof referenceCode === "string" && referenceCode.trim() ? referenceCode.trim() : null,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : "Manual refund",
      paid_at: refundAt,
      received_by_user_id: context.user.id
    });

    if (insertError) {
      return { error: toFriendlyClinicError(insertError) };
    }

    const updatedNetPaid = Number((netPaid - amount).toFixed(2));
    const nextPaymentStatus =
      updatedNetPaid <= 0 ? "unpaid" : updatedNetPaid >= Number(checkout.total) ? "paid" : "partial";

    const { error: updateError } = await supabase
      .from("clinic_checkouts")
      .update({
        payment_status: nextPaymentStatus,
        status: nextPaymentStatus === "paid" ? "paid" : "draft",
        paid_at: nextPaymentStatus === "paid" ? refundAt : null
      })
      .eq("id", checkout.id);

    if (updateError) {
      return { error: toFriendlyClinicError(updateError) };
    }

    revalidatePath("/billing");
    revalidatePath("/checkout");
    revalidatePath("/patients");
    return { message: "Refund амжилттай бүртгэгдлээ." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function voidClinicCheckoutAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager", "front_desk", "provider"]);
  if ("error" in context) return { error: context.error };

  const checkoutId = formData.get("checkoutId");
  if (typeof checkoutId !== "string" || !checkoutId) {
    return { error: "Checkout сонгогдоогүй байна." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data: checkout, error } = await supabase
      .from("clinic_checkouts")
      .select("id,organization_id,payment_status,status")
      .eq("id", checkoutId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();

    if (error || !checkout) {
      return { error: "Checkout олдсонгүй." };
    }

    if (checkout.status === "voided") {
      return { message: "Checkout аль хэдийн void болсон байна." };
    }
    if (checkout.payment_status === "paid" || checkout.payment_status === "partial") {
      return { error: "Төлбөрийн түүхтэй checkout-ийг refund урсгалаар бууруулсны дараа void хийж болно." };
    }

    const { error: updateError } = await supabase
      .from("clinic_checkouts")
      .update({
        status: "voided",
        payment_status: "unpaid",
        paid_at: null
      })
      .eq("id", checkout.id);

    if (updateError) {
      return { error: toFriendlyClinicError(updateError) };
    }

    revalidatePath("/billing");
    revalidatePath("/checkout");
    return { message: "Checkout void боллоо." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function updatePatientProfileAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager", "front_desk", "provider"]);
  if ("error" in context) return { error: context.error };

  const patientId = formData.get("patientId");
  const notes = formData.get("notes");
  const tags = formData.get("tags");
  const lifecycleStage = formData.get("lifecycleStage");
  const allergyNotes = formData.get("allergyNotes");
  const contraindicationFlags = formData.get("contraindicationFlags");
  const preferredContactChannel = formData.get("preferredContactChannel");
  const preferredServiceId = formData.get("preferredServiceId");
  const preferredStaffMemberId = formData.get("preferredStaffMemberId");
  const followUpOwnerId = formData.get("followUpOwnerId");

  if (typeof patientId !== "string" || !patientId) {
    return { error: "Patient сонгогдоогүй байна." };
  }

  const normalizedTags =
    typeof tags === "string"
      ? tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];
  const normalizedLifecycleStage =
    typeof lifecycleStage === "string" && lifecycleStage.trim() ? lifecycleStage.trim() : "new_lead";
  const normalizedPreferredContactChannel =
    typeof preferredContactChannel === "string" && preferredContactChannel.trim()
      ? preferredContactChannel.trim()
      : "phone";

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase
      .from("patients")
      .update({
        notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
        tags: normalizedTags,
        lifecycle_stage: normalizedLifecycleStage,
        allergy_notes: typeof allergyNotes === "string" && allergyNotes.trim() ? allergyNotes.trim() : null,
        contraindication_flags:
          typeof contraindicationFlags === "string" && contraindicationFlags.trim()
            ? contraindicationFlags.trim()
            : null,
        preferred_contact_channel: normalizedPreferredContactChannel,
        preferred_service_id:
          typeof preferredServiceId === "string" && preferredServiceId.trim() ? preferredServiceId.trim() : null,
        preferred_staff_member_id:
          typeof preferredStaffMemberId === "string" && preferredStaffMemberId.trim()
            ? preferredStaffMemberId.trim()
            : null,
        follow_up_owner_id:
          typeof followUpOwnerId === "string" && followUpOwnerId.trim() ? followUpOwnerId.trim() : null
      })
      .eq("id", patientId)
      .eq("organization_id", context.organization.id);

    if (error) {
      return { error: toFriendlyClinicError(error) };
    }

    revalidatePath("/patients");
    revalidatePath(`/patients/${patientId}`);
    return { message: "Patient profile шинэчлэгдлээ." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function managePatientFollowUpAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager", "billing"]);
  if ("error" in context) return { error: context.error };

  const patientId = formData.get("patientId");
  const operation = formData.get("operation");
  const lifecycleStage = formData.get("lifecycleStage");
  const followUpOwnerId = formData.get("followUpOwnerId");

  if (typeof patientId !== "string" || !patientId) {
    return { error: "Patient сонгогдоогүй байна." };
  }

  if (typeof operation !== "string" || !operation) {
    return { error: "Үйлдэл тодорхойгүй байна." };
  }

  const nowIso = new Date().toISOString();
  const updatePayload: Database["public"]["Tables"]["patients"]["Update"] = {};

  if (operation === "complete") {
    updatePayload.last_contacted_at = nowIso;
    updatePayload.next_follow_up_at = null;
    updatePayload.lifecycle_stage = "active";
  } else if (operation === "snooze_3d" || operation === "snooze_7d") {
    const days = operation === "snooze_3d" ? 3 : 7;
    updatePayload.next_follow_up_at = addDays(new Date(), days).toISOString();
    updatePayload.lifecycle_stage = "follow_up_due";
  } else if (operation === "assign_owner") {
    updatePayload.follow_up_owner_id =
      typeof followUpOwnerId === "string" && followUpOwnerId.trim() ? followUpOwnerId.trim() : null;
  } else if (operation === "update_stage") {
    updatePayload.lifecycle_stage =
      typeof lifecycleStage === "string" && lifecycleStage.trim() ? lifecycleStage.trim() : "active";
  } else {
    return { error: "Дэмжигдээгүй follow-up action байна." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase
      .from("patients")
      .update(updatePayload)
      .eq("id", patientId)
      .eq("organization_id", context.organization.id);

    if (error) {
      return { error: toFriendlyClinicError(error) };
    }

    revalidatePath("/dashboard");
    revalidatePath("/patients");
    revalidatePath(`/patients/${patientId}`);

    return {
      message:
        operation === "complete"
          ? "Follow-up completed болголоо."
          : operation === "snooze_3d" || operation === "snooze_7d"
            ? "Follow-up snooze хийлээ."
            : operation === "assign_owner"
              ? "Follow-up owner шинэчлэгдлээ."
              : "Lifecycle stage шинэчлэгдлээ."
    };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function saveClinicReportPresetAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager", "billing"]);
  if ("error" in context) return { error: context.error };

  const name = formData.get("name");
  const rangePreset = formData.get("rangePreset");
  const startDate = formData.get("startDate");
  const endDate = formData.get("endDate");
  const provider = formData.get("provider");
  const location = formData.get("location");

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Preset нэр оруулна уу." };
  }

  const normalizedRangePreset: ReportRangePreset =
    typeof rangePreset === "string" &&
    (rangePreset === "today" || rangePreset === "7d" || rangePreset === "30d" || rangePreset === "custom")
      ? rangePreset
      : "today";

  try {
    const supabase = await getSupabaseServerClient();
    const payload = {
      organization_id: context.organization.id,
      user_id: context.user.id,
      name: name.trim(),
      range_preset: normalizedRangePreset,
      start_date:
        normalizedRangePreset === "custom" && typeof startDate === "string" && startDate ? startDate : null,
      end_date:
        normalizedRangePreset === "custom" && typeof endDate === "string" && endDate ? endDate : null,
      provider_filter: typeof provider === "string" && provider ? provider : "all",
      location_filter: typeof location === "string" && location ? location : "all",
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("clinic_report_presets").upsert(payload, {
      onConflict: "organization_id,user_id,name"
    });

    if (error) {
      return { error: toFriendlyClinicError(error) };
    }

    revalidatePath("/reports");
    return { message: "Report preset хадгалагдлаа." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function deleteClinicReportPresetAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };

  const presetId = formData.get("presetId");
  if (typeof presetId !== "string" || !presetId) {
    return { error: "Preset сонгогдоогүй байна." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase
      .from("clinic_report_presets")
      .delete()
      .eq("id", presetId)
      .eq("organization_id", context.organization.id)
      .eq("user_id", context.user.id);

    if (error) {
      return { error: toFriendlyClinicError(error) };
    }

    revalidatePath("/reports");
    return { message: "Preset устгагдлаа." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

function addHoursToNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export async function seedDemoClinicDataAction(
  _prev: ClinicSetupActionState
): Promise<ClinicSetupActionState> {
  const context = await requireClinicContext();
  if ("error" in context) return { error: context.error };
  const diagnostics = await getClinicEnvironmentDiagnostics();
  const diagnosticMessage = buildClinicEnvironmentDiagnosticMessage(diagnostics);

  if (diagnosticMessage) {
    return { error: diagnosticMessage };
  }

  try {
    const supabase = await getSupabaseServerClient();

    const [
      existingLocations,
      existingStaff,
      existingServices,
      existingPatients,
      existingAppointments,
      existingCheckouts
    ] = await Promise.all([
      supabase
        .from("clinic_locations")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", context.organization.id),
      supabase
        .from("staff_members")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", context.organization.id),
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", context.organization.id),
      supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", context.organization.id),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", context.organization.id),
      supabase
        .from("clinic_checkouts")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", context.organization.id)
    ]);

    const existingCount =
      Number(existingLocations.count ?? 0) +
      Number(existingStaff.count ?? 0) +
      Number(existingServices.count ?? 0) +
      Number(existingPatients.count ?? 0) +
      Number(existingAppointments.count ?? 0) +
      Number(existingCheckouts.count ?? 0);

    if (existingCount > 0) {
      return {
        message: "Demo seed алгасагдлаа. Энэ clinic дээр аль хэдийн operational data байна."
      };
    }

    const { data: locations, error: locationError } = await supabase
      .from("clinic_locations")
      .insert([
        {
          organization_id: context.organization.id,
          name: "Central Branch",
          slug: "central-branch",
          address_line1: "Olympic street 12",
          district: "Sukhbaatar",
          city: "Ulaanbaatar",
          phone: "77112233"
        },
        {
          organization_id: context.organization.id,
          name: "River Branch",
          slug: "river-branch",
          address_line1: "Tokyo street 44",
          district: "Khan-Uul",
          city: "Ulaanbaatar",
          phone: "77114455"
        }
      ])
      .select("id,name")
      .order("name", { ascending: true });

    if (locationError || !locations || locations.length < 2) {
      return { error: toFriendlyClinicError(locationError) };
    }

    const centralLocation = locations[0];
    const riverLocation = locations[1];

    const { data: staffMembers, error: staffError } = await supabase
      .from("staff_members")
      .insert([
        {
          organization_id: context.organization.id,
          location_id: centralLocation.id,
          profile_id: context.user.id,
          full_name: "Owner Demo",
          role: "owner",
          accepts_online_booking: false,
          status: "active",
          email: context.user.email ?? null
        },
        {
          organization_id: context.organization.id,
          location_id: centralLocation.id,
          full_name: "Dr. Saraa",
          role: "provider",
          specialty: "Laser & acne care",
          accepts_online_booking: true,
          status: "active",
          phone: "88112233",
          email: "saraa@ubbeauty.mn"
        },
        {
          organization_id: context.organization.id,
          location_id: riverLocation.id,
          full_name: "Naraa Front Desk",
          role: "front_desk",
          accepts_online_booking: false,
          status: "active",
          phone: "88114455",
          email: "desk@ubbeauty.mn"
        }
      ])
      .select("id,full_name,role,location_id");

    if (staffError || !staffMembers) {
      return { error: toFriendlyClinicError(staffError) };
    }

    const provider = staffMembers.find((item) => item.role === "provider");
    const frontDesk = staffMembers.find((item) => item.role === "front_desk");
    if (!provider) {
      return { error: "Demo provider үүсгэж чадсангүй." };
    }

    const { error: availabilityError } = await supabase.from("staff_availability_rules").insert(
      [1, 2, 3, 4, 5].map((weekday) => ({
        organization_id: context.organization.id,
        staff_member_id: provider.id,
        location_id: centralLocation.id,
        weekday,
        start_local: "10:00",
        end_local: "18:00",
        is_available: true
      }))
    );

    if (availabilityError) {
      return { error: toFriendlyClinicError(availabilityError) };
    }

    const { data: categories, error: categoryError } = await supabase
      .from("service_categories")
      .insert([
        {
          organization_id: context.organization.id,
          name: "Consultation",
          slug: "consultation",
          sort_order: 1
        },
        {
          organization_id: context.organization.id,
          name: "Procedures",
          slug: "procedures",
          sort_order: 2
        }
      ])
      .select("id,name");

    if (categoryError || !categories || categories.length < 2) {
      return { error: toFriendlyClinicError(categoryError) };
    }

    const consultationCategory = categories.find((item) => item.name === "Consultation");
    const proceduresCategory = categories.find((item) => item.name === "Procedures");
    if (!consultationCategory || !proceduresCategory) {
      return { error: "Demo service category үүсгэж чадсангүй." };
    }

    const { data: services, error: serviceError } = await supabase
      .from("services")
      .insert([
        {
          organization_id: context.organization.id,
          category_id: consultationCategory.id,
          location_id: centralLocation.id,
          name: "Skin consultation",
          slug: "skin-consultation",
          description: "First visit assessment and plan",
          duration_minutes: 45,
          price_from: 50000,
          currency: "MNT",
          is_bookable: true
        },
        {
          organization_id: context.organization.id,
          category_id: proceduresCategory.id,
          location_id: centralLocation.id,
          name: "Laser treatment",
          slug: "laser-treatment",
          description: "Targeted laser session",
          duration_minutes: 60,
          price_from: 180000,
          currency: "MNT",
          is_bookable: true
        },
        {
          organization_id: context.organization.id,
          category_id: proceduresCategory.id,
          location_id: riverLocation.id,
          name: "Hydra facial",
          slug: "hydra-facial",
          description: "Deep cleansing facial package",
          duration_minutes: 50,
          price_from: 120000,
          currency: "MNT",
          is_bookable: true
        }
      ])
      .select("id,name,price_from,currency");

    if (serviceError || !services || services.length < 3) {
      return { error: toFriendlyClinicError(serviceError) };
    }

    const consultationService = services.find((item) => item.name === "Skin consultation");
    const laserService = services.find((item) => item.name === "Laser treatment");
    const facialService = services.find((item) => item.name === "Hydra facial");
    if (!consultationService || !laserService || !facialService) {
      return { error: "Demo services бүрэн үүсээгүй байна." };
    }

    const { data: patients, error: patientError } = await supabase
      .from("patients")
      .insert([
        {
          organization_id: context.organization.id,
          full_name: "Anu Tsog",
          phone: "99110011",
          source: "online_booking",
          tags: ["vip", "laser"],
          notes: "Prefers central branch",
          lifecycle_stage: "vip",
          preferred_contact_channel: "sms",
          preferred_service_id: laserService.id,
          preferred_staff_member_id: provider.id,
          follow_up_owner_id: frontDesk?.id ?? null,
          allergy_notes: "Sensitive to strong fragrance",
          contraindication_flags: "Avoid recent retinol use",
          last_contacted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          organization_id: context.organization.id,
          full_name: "Bataa Erdene",
          phone: "99110022",
          source: "manual",
          tags: ["acne"],
          notes: "First consultation",
          lifecycle_stage: "consulted",
          preferred_contact_channel: "phone",
          preferred_service_id: consultationService.id,
          preferred_staff_member_id: provider.id,
          follow_up_owner_id: frontDesk?.id ?? null,
          contraindication_flags: "Check isotretinoin history",
          next_follow_up_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          organization_id: context.organization.id,
          full_name: "Cecilia Bold",
          phone: "99110033",
          source: "walk_in",
          tags: ["follow-up"],
          notes: "Needs reminder call",
          lifecycle_stage: "follow_up_due",
          preferred_contact_channel: "phone",
          preferred_service_id: facialService.id,
          follow_up_owner_id: frontDesk?.id ?? null,
          allergy_notes: "Latex sensitivity",
          next_follow_up_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
        },
        {
          organization_id: context.organization.id,
          full_name: "Dulmaa T",
          phone: "99110044",
          source: "online_booking",
          tags: ["facial"],
          lifecycle_stage: "active",
          preferred_contact_channel: "any",
          preferred_service_id: facialService.id,
          preferred_staff_member_id: provider.id
        }
      ])
      .select("id,full_name");

    if (patientError || !patients || patients.length < 4) {
      return { error: toFriendlyClinicError(patientError) };
    }

    const patientByName = new Map(patients.map((item) => [item.full_name, item.id]));
    const anuPatientId = patientByName.get("Anu Tsog");
    const bataaPatientId = patientByName.get("Bataa Erdene");
    const ceciliaPatientId = patientByName.get("Cecilia Bold");
    const dulmaaPatientId = patientByName.get("Dulmaa T");

    if (!anuPatientId || !bataaPatientId || !ceciliaPatientId || !dulmaaPatientId) {
      return { error: "Demo patient seed incomplete байна. Дахин оролдоно уу." };
    }
    const startBooked = addHoursToNow(24);
    const startConfirmed = addHoursToNow(3);
    const startArrived = addHoursToNow(-1);
    const startCompletedOne = addHoursToNow(-5);
    const startCompletedTwo = addHoursToNow(-3);
    const startCompletedThree = addHoursToNow(-26);
    const startNoShow = addHoursToNow(-30);

    const appointmentPayload: Database["public"]["Tables"]["appointments"]["Insert"][] = [
      {
        organization_id: context.organization.id,
        patient_id: anuPatientId,
        service_id: laserService.id,
        staff_member_id: provider.id,
        location_id: centralLocation.id,
        source: "online_booking",
        status: "booked",
        scheduled_start: startBooked,
        scheduled_end: addHoursToNow(25),
        duration_minutes: 60,
        booking_notes: "Booked from public flow",
        created_by_user_id: context.user.id
      },
      {
        organization_id: context.organization.id,
        patient_id: bataaPatientId,
        service_id: consultationService.id,
        staff_member_id: provider.id,
        location_id: centralLocation.id,
        source: "admin",
        status: "confirmed",
        scheduled_start: startConfirmed,
        scheduled_end: addHoursToNow(3.75),
        duration_minutes: 45,
        confirmation_sent_at: addHoursToNow(-2),
        created_by_user_id: context.user.id
      },
      {
        organization_id: context.organization.id,
        patient_id: ceciliaPatientId,
        service_id: facialService.id,
        staff_member_id: provider.id,
        location_id: riverLocation.id,
        source: "walk_in",
        status: "arrived",
        scheduled_start: startArrived,
        scheduled_end: addHoursToNow(-0.2),
        duration_minutes: 50,
        checked_in_at: addHoursToNow(-0.8),
        created_by_user_id: context.user.id
      },
      {
        organization_id: context.organization.id,
        patient_id: anuPatientId,
        service_id: laserService.id,
        staff_member_id: provider.id,
        location_id: centralLocation.id,
        source: "admin",
        status: "completed",
        scheduled_start: startCompletedOne,
        scheduled_end: addHoursToNow(-4),
        duration_minutes: 60,
        checked_in_at: addHoursToNow(-5),
        completed_at: addHoursToNow(-4),
        created_by_user_id: context.user.id
      },
      {
        organization_id: context.organization.id,
        patient_id: dulmaaPatientId,
        service_id: facialService.id,
        staff_member_id: provider.id,
        location_id: riverLocation.id,
        source: "online_booking",
        status: "completed",
        scheduled_start: startCompletedTwo,
        scheduled_end: addHoursToNow(-2.2),
        duration_minutes: 50,
        checked_in_at: addHoursToNow(-3),
        completed_at: addHoursToNow(-2.2),
        created_by_user_id: context.user.id
      },
      {
        organization_id: context.organization.id,
        patient_id: ceciliaPatientId,
        service_id: consultationService.id,
        staff_member_id: provider.id,
        location_id: centralLocation.id,
        source: "admin",
        status: "completed",
        scheduled_start: startCompletedThree,
        scheduled_end: addHoursToNow(-25.25),
        duration_minutes: 45,
        checked_in_at: addHoursToNow(-26),
        completed_at: addHoursToNow(-25.25),
        created_by_user_id: context.user.id
      },
      {
        organization_id: context.organization.id,
        patient_id: bataaPatientId,
        service_id: consultationService.id,
        staff_member_id: provider.id,
        location_id: centralLocation.id,
        source: "online_booking",
        status: "no_show",
        scheduled_start: startNoShow,
        scheduled_end: addHoursToNow(-29.25),
        duration_minutes: 45,
        created_by_user_id: context.user.id
      }
    ];

    const { data: appointments, error: appointmentError } = await supabase
      .from("appointments")
      .insert(appointmentPayload)
      .select("id,patient_id,service_id,status,scheduled_start");

    if (appointmentError || !appointments) {
      return { error: toFriendlyClinicError(appointmentError) };
    }

    const completedAppointments = appointments.filter((item) => item.status === "completed");
    const { data: treatmentRecords, error: treatmentError } = await supabase
      .from("treatment_records")
      .insert(
        completedAppointments.map((appointment, index) => ({
          organization_id: context.organization.id,
          appointment_id: appointment.id,
          patient_id: appointment.patient_id,
          service_id: appointment.service_id,
          staff_member_id: provider.id,
          subjective_notes: index === 0 ? "Pigmentation concerns improved." : "Skin texture improving.",
          objective_notes: "No immediate complications.",
          assessment_notes: "Responding well to current plan.",
          plan_notes: "Continue hydration and sunscreen.",
          consent_confirmed: true,
          consent_artifact_url: `consent://demo/${appointment.id}`,
          follow_up_plan: index === 2 ? "7 хоногийн дараа check-in call" : "24 цагийн дараа follow-up хийх",
          follow_up_outcome: index === 0 ? "24h follow-up complete, redness settling" : null,
          complication_notes: index === 1 ? "Mild irritation observed, monitor closely" : null,
          before_photo_url: `https://demo.ubbeauty.mn/evidence/${appointment.id}/before.jpg`,
          after_photo_url: `https://demo.ubbeauty.mn/evidence/${appointment.id}/after.jpg`,
          before_after_asset_notes: "Demo before/after note"
        }))
      )
      .select("id,appointment_id");

    if (treatmentError || !treatmentRecords) {
      return { error: toFriendlyClinicError(treatmentError) };
    }

    const treatmentByAppointmentId = new Map(
      treatmentRecords.map((item) => [item.appointment_id, item.id])
    );

    const [completedOne, completedTwo] = completedAppointments;
    const { data: checkouts, error: checkoutError } = await supabase
      .from("clinic_checkouts")
      .insert([
        {
          organization_id: context.organization.id,
          appointment_id: completedOne.id,
          patient_id: completedOne.patient_id,
          treatment_record_id: treatmentByAppointmentId.get(completedOne.id) ?? null,
          status: "draft",
          payment_status: "partial",
          subtotal: Number(laserService.price_from ?? 0),
          total: Number(laserService.price_from ?? 0),
          currency: laserService.currency ?? "MNT",
          created_by_user_id: context.user.id
        },
        {
          organization_id: context.organization.id,
          appointment_id: completedTwo.id,
          patient_id: completedTwo.patient_id,
          treatment_record_id: treatmentByAppointmentId.get(completedTwo.id) ?? null,
          status: "paid",
          payment_status: "paid",
          subtotal: Number(facialService.price_from ?? 0),
          total: Number(facialService.price_from ?? 0),
          currency: facialService.currency ?? "MNT",
          created_by_user_id: context.user.id,
          paid_at: addHoursToNow(-2)
        }
      ])
      .select("id,appointment_id,patient_id,currency,total");

    if (checkoutError || !checkouts || checkouts.length < 2) {
      return { error: toFriendlyClinicError(checkoutError) };
    }

    const partialCheckout = checkouts[0];
    const paidCheckout = checkouts[1];

    const { error: itemError } = await supabase.from("clinic_checkout_items").insert([
      {
        checkout_id: partialCheckout.id,
        organization_id: context.organization.id,
        service_id: laserService.id,
        treatment_record_id: treatmentByAppointmentId.get(completedOne.id) ?? null,
        item_type: "service",
        label: laserService.name,
        quantity: 1,
        unit_price: Number(laserService.price_from ?? 0),
        line_total: Number(laserService.price_from ?? 0)
      },
      {
        checkout_id: paidCheckout.id,
        organization_id: context.organization.id,
        service_id: facialService.id,
        treatment_record_id: treatmentByAppointmentId.get(completedTwo.id) ?? null,
        item_type: "service",
        label: facialService.name,
        quantity: 1,
        unit_price: Number(facialService.price_from ?? 0),
        line_total: Number(facialService.price_from ?? 0)
      }
    ]);

    if (itemError) {
      return { error: toFriendlyClinicError(itemError) };
    }

    const { error: paymentError } = await supabase.from("clinic_checkout_payments").insert([
      {
        checkout_id: partialCheckout.id,
        organization_id: context.organization.id,
        patient_id: partialCheckout.patient_id,
        amount: 80000,
        currency: partialCheckout.currency,
        payment_method: "card",
        payment_kind: "payment",
        reference_code: "DEMO-PARTIAL-01",
        notes: "Partial demo payment",
        paid_at: addHoursToNow(-3.5),
        received_by_user_id: context.user.id
      },
      {
        checkout_id: paidCheckout.id,
        organization_id: context.organization.id,
        patient_id: paidCheckout.patient_id,
        amount: Number(paidCheckout.total ?? 0),
        currency: paidCheckout.currency,
        payment_method: "cash",
        payment_kind: "payment",
        reference_code: "DEMO-PAID-01",
        notes: "Paid demo checkout",
        paid_at: addHoursToNow(-2),
        received_by_user_id: context.user.id
      }
    ]);

    if (paymentError) {
      return { error: toFriendlyClinicError(paymentError) };
    }

    const pastTreatmentId = treatmentByAppointmentId.get(completedAppointments[2]?.id ?? "");
    if (pastTreatmentId) {
      const { error: engagementError } = await supabase.from("clinic_engagement_jobs").insert([
        {
          organization_id: context.organization.id,
          patient_id: completedAppointments[2].patient_id,
          appointment_id: completedAppointments[2].id,
          treatment_record_id: pastTreatmentId,
          job_type: "follow_up_24h",
          channel: "call_task",
          status: "queued",
          idempotency_key: `demo:${completedAppointments[2].id}:follow_up_24h`,
          scheduled_for: addHoursToNow(-1),
          payload: { trigger: "demo_follow_up_due", phase: "seed" }
        },
        {
          organization_id: context.organization.id,
          patient_id: appointments[0].patient_id,
          appointment_id: appointments[0].id,
          treatment_record_id: null,
          job_type: "appointment_reminder_24h",
          channel: "sms",
          status: "queued",
          idempotency_key: `demo:${appointments[0].id}:reminder_24h`,
          scheduled_for: addHoursToNow(1),
          payload: { trigger: "demo_upcoming_reminder", phase: "seed" }
        }
      ]);

      if (engagementError) {
        return { error: toFriendlyClinicError(engagementError) };
      }
    }

    const presetSeedPayload = [
      {
        organization_id: context.organization.id,
        user_id: context.user.id,
        name: "Өнөөдрийн owner report",
        range_preset: "today",
        provider_filter: "all",
        location_filter: "all"
      },
      {
        organization_id: context.organization.id,
        user_id: context.user.id,
        name: "Central 7d report",
        range_preset: "7d",
        provider_filter: "all",
        location_filter: "Central Branch"
      }
    ];

    const { data: existingPresets, error: existingPresetError } = await supabase
      .from("clinic_report_presets")
      .select("name")
      .eq("organization_id", context.organization.id)
      .eq("user_id", context.user.id);

    if (existingPresetError) {
      return { error: toFriendlyClinicError(existingPresetError) };
    }

    const existingPresetNames = new Set((existingPresets ?? []).map((preset) => preset.name));
    const missingPresetPayload = presetSeedPayload.filter((preset) => !existingPresetNames.has(preset.name));

    if (missingPresetPayload.length > 0) {
      const { error: presetError } = await supabase
        .from("clinic_report_presets")
        .insert(missingPresetPayload);

      if (presetError) {
        return { error: toFriendlyClinicError(presetError) };
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/clinic");
    revalidatePath("/schedule");
    revalidatePath("/patients");
    revalidatePath("/treatments");
    revalidatePath("/checkout");
    revalidatePath("/reports");

    return {
      message:
        "Demo clinic data үүслээ. Одоо dashboard, schedule, POS, reports, reminder queue-г live smoke test хийж болно."
    };
  } catch (error) {
    if (isClinicFoundationMissingError(error) && diagnosticMessage) {
      return { error: diagnosticMessage };
    }
    return { error: toFriendlyClinicError(error) };
  }
}

export async function updateOrganizationAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner"]);
  if ("error" in context) return { error: context.error };

  const name = formData.get("name");
  const slug = formData.get("slug");

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Organization name is required." };
  }
  if (typeof slug !== "string" || !slug.trim()) {
    return { error: "Slug is required." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase
      .from("organizations")
      .update({
        name: name.trim(),
        slug: slugifyOrFallback(slug, "org"),
        updated_at: new Date().toISOString()
      })
      .eq("id", context.organization.id);

    if (error) {
      return { error: toFriendlyClinicError(error) };
    }

    revalidatePath("/clinic");
    return { message: "Organization updated successfully." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function updateClinicLocationAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };

  const locationId = formData.get("locationId");
  const name = formData.get("name");
  const district = formData.get("district");
  const addressLine1 = formData.get("addressLine1");
  const phone = formData.get("phone");

  if (typeof locationId !== "string" || !locationId) {
    return { error: "Location ID is required." };
  }
  if (typeof name !== "string" || !name.trim()) {
    return { error: "Location name is required." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase
      .from("clinic_locations")
      .update({
        name: name.trim(),
        district: typeof district === "string" && district.trim() ? district.trim() : null,
        address_line1: typeof addressLine1 === "string" && addressLine1.trim() ? addressLine1.trim() : null,
        phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", locationId)
      .eq("organization_id", context.organization.id);

    if (error) {
      return { error: toFriendlyClinicError(error) };
    }

    revalidatePath("/clinic");
    return { message: "Location updated successfully." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function deleteClinicLocationAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };

  const locationId = formData.get("locationId");
  if (typeof locationId !== "string" || !locationId) {
    return { error: "Location ID is required." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase
      .from("clinic_locations")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("id", locationId)
      .eq("organization_id", context.organization.id);

    if (error) {
      return { error: toFriendlyClinicError(error) };
    }

    revalidatePath("/clinic");
    return { message: "Location deleted successfully." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function updateStaffMemberAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };

  const staffMemberId = formData.get("staffMemberId");
  const fullName = formData.get("fullName");
  const role = formData.get("role");
  const specialty = formData.get("specialty");
  const phone = formData.get("phone");
  const email = formData.get("email");

  if (typeof staffMemberId !== "string" || !staffMemberId) {
    return { error: "Staff member ID is required." };
  }
  if (typeof fullName !== "string" || !fullName.trim()) {
    return { error: "Staff full name is required." };
  }
  if (typeof role !== "string" || !role.trim()) {
    return { error: "Staff role is required." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase
      .from("staff_members")
      .update({
        full_name: fullName.trim(),
        role: role,
        specialty: typeof specialty === "string" && specialty.trim() ? specialty.trim() : null,
        phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
        email: typeof email === "string" && email.trim() ? email.trim() : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", staffMemberId)
      .eq("organization_id", context.organization.id);

    if (error) {
      return { error: toFriendlyClinicError(error) };
    }

    revalidatePath("/clinic");
    revalidatePath("/schedule");
    return { message: "Staff member updated successfully." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function deleteStaffMemberAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };

  const staffMemberId = formData.get("staffMemberId");
  if (typeof staffMemberId !== "string" || !staffMemberId) {
    return { error: "Staff member ID is required." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase
      .from("staff_members")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("id", staffMemberId)
      .eq("organization_id", context.organization.id);

    if (error) {
      return { error: toFriendlyClinicError(error) };
    }

    revalidatePath("/clinic");
    revalidatePath("/schedule");
    return { message: "Staff member deleted successfully." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function updateServiceAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };

  const serviceId = formData.get("serviceId");
  const name = formData.get("name");
  const durationMinutes = formData.get("durationMinutes");
  const priceFrom = formData.get("priceFrom");
  const description = formData.get("description");

  if (typeof serviceId !== "string" || !serviceId) {
    return { error: "Service ID is required." };
  }
  if (typeof name !== "string" || !name.trim()) {
    return { error: "Service name is required." };
  }

  const duration = Number(durationMinutes);
  if (!Number.isFinite(duration) || duration <= 0) {
    return { error: "Valid duration minutes is required." };
  }

  const price = Number(priceFrom);
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Valid price from is required." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase
      .from("services")
      .update({
        name: name.trim(),
        slug: slugifyOrFallback(name, "service"),
        duration_minutes: duration,
        price_from: price,
        description: typeof description === "string" && description.trim() ? description.trim() : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", serviceId)
      .eq("organization_id", context.organization.id);

    if (error) {
      return { error: toFriendlyClinicError(error) };
    }

    revalidatePath("/clinic");
    revalidatePath("/schedule");
    return { message: "Service updated successfully." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function deleteServiceAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };

  const serviceId = formData.get("serviceId");
  if (typeof serviceId !== "string" || !serviceId) {
    return { error: "Service ID is required." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase
      .from("services")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("id", serviceId)
      .eq("organization_id", context.organization.id);

    if (error) {
      return { error: toFriendlyClinicError(error) };
    }

    revalidatePath("/clinic");
    revalidatePath("/schedule");
    return { message: "Service deleted successfully." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function deleteStaffAvailabilityRuleAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };

  const ruleId = formData.get("ruleId");
  if (typeof ruleId !== "string" || !ruleId) {
    return { error: "Rule ID is required." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase
      .from("staff_availability_rules")
      .delete()
      .eq("id", ruleId)
      .eq("organization_id", context.organization.id);

    if (error) {
      return { error: toFriendlyClinicError(error) };
    }

    revalidatePath("/clinic");
    revalidatePath("/schedule");
    return { message: "Availability rule deleted successfully." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

// ── Staff Management (AI Chat Panel) ──────────────────────────────────────────

export async function updateStaffMember(
  staffId: string,
  fields: {
    full_name?: string;
    role?: string;
    specialty?: string | null;
    bio?: string | null;
    phone?: string | null;
    email?: string | null;
    accepts_online_booking?: boolean;
    status?: string;
    location_id?: string | null;
  }
): Promise<{ error?: string }> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("staff_members")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", staffId)
    .eq("organization_id", context.organization.id);
  if (error) return { error: toFriendlyClinicError(error) };
  revalidatePath("/clinic/staff");
  revalidatePath("/clinic");
  return {};
}

export async function deleteStaffMember(staffId: string): Promise<{ error?: string }> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("staff_members")
    .delete()
    .eq("id", staffId)
    .eq("organization_id", context.organization.id);
  if (error) return { error: toFriendlyClinicError(error) };
  revalidatePath("/clinic/staff");
  revalidatePath("/clinic");
  return {};
}

export async function deleteService(serviceId: string): Promise<{ error?: string }> {
  const context = await requireClinicActionAccess(["owner", "manager", "front_desk"]);
  if ("error" in context) return { error: context.error };
  const supabase = await getSupabaseServerClient();
  // Soft delete: appointments FK-г зөрчихгүйн тулд hard delete хийхгүй
  const { error } = await supabase
    .from("services")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", serviceId)
    .eq("organization_id", context.organization.id);
  if (error) {
    console.error("[deleteService] supabase error:", JSON.stringify(error));
    return { error: toFriendlyClinicError(error) };
  }
  revalidatePath("/clinic/services");
  revalidatePath("/clinic");
  return {};
}

export async function updateServiceDirect(
  serviceId: string,
  fields: { name?: string; description?: string | null; duration_minutes?: number; price_from?: number; is_bookable?: boolean; status?: string; category_id?: string | null }
): Promise<{ error?: string }> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("services")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", serviceId)
    .eq("organization_id", context.organization.id);
  if (error) return { error: toFriendlyClinicError(error) };
  revalidatePath("/clinic/services");
  revalidatePath("/clinic");
  return {};
}

export async function deleteAvailabilityRule(ruleId: string): Promise<{ error?: string }> {
  const context = await requireClinicActionAccess(["owner", "manager"]);
  if ("error" in context) return { error: context.error };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("staff_availability_rules")
    .delete()
    .eq("id", ruleId)
    .eq("organization_id", context.organization.id);
  if (error) return { error: toFriendlyClinicError(error) };
  revalidatePath("/clinic/availability");
  revalidatePath("/schedule");
  return {};
}
