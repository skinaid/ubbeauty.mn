import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isClinicFoundationMissingError } from "@/modules/clinic/data";
import { buildSuggestedSlots } from "@/modules/clinic/scheduling";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const serviceId = url.searchParams.get("serviceId");
  const preferredStaffId = url.searchParams.get("preferredStaffId");
  const preferredLocationId = url.searchParams.get("preferredLocationId");

  if (!serviceId) {
    return NextResponse.json({ error: "serviceId is required" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdminClient();
    const { data: clinic, error: clinicError } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (clinicError) throw clinicError;
    if (!clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    const [
      { data: service, error: serviceError },
      { data: rules, error: rulesError },
      { data: appointments, error: appointmentsError }
    ] = await Promise.all([
      admin
        .from("services")
        .select("id,duration_minutes,buffer_before_minutes,buffer_after_minutes,location_id")
        .eq("organization_id", clinic.id)
        .eq("id", serviceId)
        .eq("status", "active")
        .eq("is_bookable", true)
        .maybeSingle(),
      admin
        .from("staff_availability_rules")
        .select("staff_member_id,location_id,weekday,start_local,end_local,is_available")
        .eq("organization_id", clinic.id),
      admin
        .from("appointments")
        .select("staff_member_id,scheduled_start,scheduled_end,status")
        .eq("organization_id", clinic.id)
        .gte("scheduled_start", new Date().toISOString())
        .limit(300)
    ]);

    if (serviceError) throw serviceError;
    if (rulesError) throw rulesError;
    if (appointmentsError) throw appointmentsError;

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const suggestions = buildSuggestedSlots({
      durationMinutes: service.duration_minutes,
      bufferBeforeMinutes: service.buffer_before_minutes,
      bufferAfterMinutes: service.buffer_after_minutes,
      preferredStaffId: preferredStaffId || undefined,
      preferredLocationId: preferredLocationId || service.location_id || undefined,
      rules: rules ?? [],
      appointments: appointments ?? [],
      maxSuggestions: 8,
      timezoneOffsetMinutes: 480, // Asia/Ulaanbaatar = UTC+8
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    if (isClinicFoundationMissingError(error)) {
      return NextResponse.json({ suggestions: [] });
    }

    return NextResponse.json({ error: "Failed to load slot suggestions" }, { status: 500 });
  }
}
