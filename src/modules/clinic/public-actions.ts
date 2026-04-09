"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isClinicFoundationMissingError } from "./data";
import { getPublicClinicBySlug } from "./public";
import { findAvailableStaffAssignment } from "./scheduling";

export type PublicBookingActionState = {
  error?: string;
  message?: string;
};

function parseLocalDateTime(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toFriendlyPublicBookingError(error: unknown): string {
  if (isClinicFoundationMissingError(error)) {
    return "Clinic booking schema хараахан идэвхжээгүй байна. Түр хүлээнэ үү.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Цаг захиалах үед алдаа гарлаа.";
}

export async function createPublicBookingAction(
  _prev: PublicBookingActionState,
  formData: FormData
): Promise<PublicBookingActionState> {
  const clinicSlug = formData.get("clinicSlug");
  const serviceId = formData.get("serviceId");
  const scheduledStartValue = formData.get("scheduledStart");
  const preferredStaffId = formData.get("preferredStaffId");
  const preferredLocationId = formData.get("preferredLocationId");
  const fullName = formData.get("fullName");
  const phone = formData.get("phone");
  const email = formData.get("email");
  const bookingNotes = formData.get("bookingNotes");

  if (typeof clinicSlug !== "string" || !clinicSlug) {
    return { error: "Clinic мэдээлэл дутуу байна." };
  }

  if (typeof serviceId !== "string" || !serviceId) {
    return { error: "Үйлчилгээ сонгоно уу." };
  }

  if (typeof fullName !== "string" || !fullName.trim()) {
    return { error: "Нэрээ оруулна уу." };
  }

  if (typeof phone !== "string" || !phone.trim()) {
    return { error: "Утасны дугаараа оруулна уу." };
  }

  const scheduledStart =
    typeof scheduledStartValue === "string" ? parseLocalDateTime(scheduledStartValue) : null;
  if (!scheduledStart) {
    return { error: "Хүссэн цагаа зөв оруулна уу." };
  }

  try {
    const clinic = await getPublicClinicBySlug(clinicSlug);
    if (!clinic) {
      return { error: "Clinic олдсонгүй." };
    }

    const service = clinic.services.find((item) => item.id === serviceId);
    if (!service) {
      return { error: "Сонгосон үйлчилгээ олдсонгүй." };
    }

    const scheduledEnd = new Date(scheduledStart.getTime() + service.duration_minutes * 60 * 1000);
    const admin = getSupabaseAdminClient();
    const [{ data: availabilityRules, error: availabilityError }, { data: existingAppointments, error: appointmentReadError }] =
      await Promise.all([
        admin
          .from("staff_availability_rules")
          .select("staff_member_id,location_id,weekday,start_local,end_local,is_available")
          .eq("organization_id", clinic.id),
        admin
          .from("appointments")
          .select("staff_member_id,scheduled_start,scheduled_end,status")
          .eq("organization_id", clinic.id)
          .lte("scheduled_start", scheduledEnd.toISOString())
          .gte("scheduled_end", scheduledStart.toISOString())
      ]);

    if (availabilityError) {
      return { error: toFriendlyPublicBookingError(availabilityError) };
    }
    if (appointmentReadError) {
      return { error: toFriendlyPublicBookingError(appointmentReadError) };
    }

    const assignment = findAvailableStaffAssignment({
      preferredStaffId: typeof preferredStaffId === "string" && preferredStaffId ? preferredStaffId : undefined,
      preferredLocationId:
        typeof preferredLocationId === "string" && preferredLocationId
          ? preferredLocationId
          : service.location_id ?? undefined,
      requestedStart: scheduledStart,
      requestedEnd: scheduledEnd,
      bufferBeforeMinutes: service.buffer_before_minutes,
      bufferAfterMinutes: service.buffer_after_minutes,
      rules: availabilityRules ?? [],
      appointments: existingAppointments ?? []
    });

    if ((availabilityRules ?? []).length > 0 && !assignment) {
      return { error: "Сонгосон цаг одоогоор сул биш байна. Suggested slot-оос сонгоод дахин оролдоно уу." };
    }

    const normalizedPhone = phone.trim();
    const normalizedEmail = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;

    let patientId: string | null = null;

    const { data: existingPatient } = await admin
      .from("patients")
      .select("id")
      .eq("organization_id", clinic.id)
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (existingPatient?.id) {
      patientId = existingPatient.id;
      await admin
        .from("patients")
        .update({
          full_name: fullName.trim(),
          email: normalizedEmail,
          updated_at: new Date().toISOString()
        })
        .eq("id", patientId);
    } else {
      const { data: patient, error: patientError } = await admin
        .from("patients")
        .insert({
          organization_id: clinic.id,
          full_name: fullName.trim(),
          phone: normalizedPhone,
          email: normalizedEmail,
          source: "online_booking"
        })
        .select("id")
        .single();

      if (patientError || !patient) {
        return { error: toFriendlyPublicBookingError(patientError) };
      }

      patientId = patient.id;
    }

    const { error: appointmentError } = await admin.from("appointments").insert({
      organization_id: clinic.id,
      patient_id: patientId,
      service_id: service.id,
      staff_member_id: assignment?.staffMemberId ?? null,
      location_id:
        (typeof preferredLocationId === "string" && preferredLocationId) ||
        service.location_id ||
        assignment?.locationId ||
        null,
      source: "online_booking",
      status: "booked",
      scheduled_start: scheduledStart.toISOString(),
      scheduled_end: scheduledEnd.toISOString(),
      duration_minutes: service.duration_minutes,
      booking_notes: typeof bookingNotes === "string" && bookingNotes.trim() ? bookingNotes.trim() : null
    });

    if (appointmentError) {
      return { error: toFriendlyPublicBookingError(appointmentError) };
    }

    return {
      message: "Таны цаг захиалах хүсэлт амжилттай бүртгэгдлээ. Clinic удахгүй холбогдоно."
    };
  } catch (error) {
    return { error: toFriendlyPublicBookingError(error) };
  }
}
