"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { isClinicFoundationMissingError } from "./data";
import { findAvailableStaffAssignment } from "./scheduling";

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
  const context = await requireClinicContext();
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
    phone: typeof phone === "string" && phone.trim() ? phone.trim() : null
  });

  if (error) {
    return { error: toFriendlyClinicError(error) };
  }

  revalidatePath("/clinic");
  revalidatePath("/appointments");
  return { message: "Салбар амжилттай нэмэгдлээ." };
}

export async function createStaffMemberAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicContext();
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
  revalidatePath("/appointments");
  return { message: "Ажилтан амжилттай нэмэгдлээ." };
}

export async function createServiceAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicContext();
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
  revalidatePath("/appointments");
  return { message: "Үйлчилгээ амжилттай нэмэгдлээ." };
}

export async function createStaffAvailabilityRuleAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicContext();
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
    revalidatePath("/appointments");
    return { message: "Availability rule амжилттай хадгалагдлаа." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function createAdminAppointmentAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicContext();
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

    revalidatePath("/appointments");
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
  const context = await requireClinicContext();
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

    revalidatePath("/appointments");
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
  const context = await requireClinicContext();
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
  const context = await requireClinicContext();
  if ("error" in context) return { error: context.error };

  const appointmentId = formData.get("appointmentId");
  if (typeof appointmentId !== "string" || !appointmentId) {
    return { error: "Appointment мэдээлэл дутуу байна." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("id,organization_id,status,patient_id,service_id")
      .eq("id", appointmentId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();

    if (error || !appointment) {
      return { error: "Appointment олдсонгүй." };
    }

    if (appointment.status !== "completed") {
      return { error: "Checkout draft зөвхөн completed appointment дээр үүснэ." };
    }

    const { data: existingCheckout } = await supabase
      .from("clinic_checkouts")
      .select("id")
      .eq("appointment_id", appointment.id)
      .maybeSingle();

    if (existingCheckout?.id) {
      return { message: "Энэ appointment дээр checkout draft аль хэдийн үүссэн байна." };
    }

    const [{ data: service, error: serviceError }, { data: treatmentRecord, error: treatmentError }] =
      await Promise.all([
        supabase
          .from("services")
          .select("id,name,price_from,currency")
          .eq("id", appointment.service_id)
          .eq("organization_id", context.organization.id)
          .maybeSingle(),
        supabase
          .from("treatment_records")
          .select("id")
          .eq("appointment_id", appointment.id)
          .eq("organization_id", context.organization.id)
          .maybeSingle()
      ]);

    if (serviceError || !service) {
      return { error: "Checkout үүсгэхэд шаардлагатай service мэдээлэл олдсонгүй." };
    }
    if (treatmentError) {
      return { error: toFriendlyClinicError(treatmentError) };
    }

    const subtotal = Number(service.price_from ?? 0);
    const { data: checkout, error: checkoutError } = await supabase
      .from("clinic_checkouts")
      .insert({
        organization_id: context.organization.id,
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        treatment_record_id: treatmentRecord?.id ?? null,
        status: "draft",
        payment_status: "unpaid",
        subtotal,
        total: subtotal,
        currency: service.currency ?? "MNT",
        created_by_user_id: context.user.id
      })
      .select("id")
      .single();

    if (checkoutError || !checkout) {
      return { error: toFriendlyClinicError(checkoutError) };
    }

    const { error: itemError } = await supabase.from("clinic_checkout_items").insert({
      checkout_id: checkout.id,
      organization_id: context.organization.id,
      service_id: service.id,
      treatment_record_id: treatmentRecord?.id ?? null,
      item_type: "service",
      label: service.name,
      quantity: 1,
      unit_price: subtotal,
      line_total: subtotal
    });

    if (itemError) {
      return { error: toFriendlyClinicError(itemError) };
    }

    revalidatePath("/billing");
    revalidatePath("/treatments");
    return { message: "Checkout draft амжилттай үүслээ." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function captureClinicCheckoutPaymentAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicContext();
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
  const context = await requireClinicContext();
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
    revalidatePath("/patients");
    return { message: "Checkout item амжилттай нэмэгдлээ." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function refundClinicCheckoutAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicContext();
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
  const context = await requireClinicContext();
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
    return { message: "Checkout void боллоо." };
  } catch (error) {
    return { error: toFriendlyClinicError(error) };
  }
}

export async function updatePatientProfileAction(
  _prev: ClinicSetupActionState,
  formData: FormData
): Promise<ClinicSetupActionState> {
  const context = await requireClinicContext();
  if ("error" in context) return { error: context.error };

  const patientId = formData.get("patientId");
  const notes = formData.get("notes");
  const tags = formData.get("tags");

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

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase
      .from("patients")
      .update({
        notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
        tags: normalizedTags
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
