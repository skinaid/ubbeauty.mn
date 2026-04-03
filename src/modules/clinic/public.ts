import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isClinicFoundationMissingError } from "./data";
import { buildSuggestedSlots } from "./scheduling";
import type { ClinicLocationRow, ServiceRow, StaffMemberRow } from "./types";

export type PublicClinicSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
  serviceCount: number;
  serviceNames: string[];
};

export type PublicClinicDetail = {
  id: string;
  name: string;
  slug: string;
  status: string;
  services: ServiceRow[];
  providers: Pick<StaffMemberRow, "id" | "full_name" | "specialty" | "location_id">[];
  locations: Pick<ClinicLocationRow, "id" | "name" | "district" | "city">[];
  slotSuggestionsByService: Record<string, string[]>;
};

export async function getPublicClinics(limit = 24): Promise<PublicClinicSummary[]> {
  const admin = getSupabaseAdminClient();
  const { data: clinics, error } = await admin
    .from("organizations")
    .select("id,name,slug,status")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const organizationIds = (clinics ?? []).map((clinic) => clinic.id);
  if (organizationIds.length === 0) return [];

  const { data: services, error: servicesError } = await admin
    .from("services")
    .select("organization_id,name")
    .in("organization_id", organizationIds)
    .eq("status", "active")
    .eq("is_bookable", true);

  if (servicesError) {
    if (isClinicFoundationMissingError(servicesError)) {
      return (clinics ?? []).map((clinic) => ({
        ...clinic,
        serviceCount: 0,
        serviceNames: []
      }));
    }
    throw servicesError;
  }

  const servicesByOrg = new Map<string, string[]>();
  for (const service of services ?? []) {
    const current = servicesByOrg.get(service.organization_id) ?? [];
    current.push(service.name);
    servicesByOrg.set(service.organization_id, current);
  }

  return (clinics ?? []).map((clinic) => {
    const names = servicesByOrg.get(clinic.id) ?? [];
    return {
      ...clinic,
      serviceCount: names.length,
      serviceNames: names.slice(0, 3)
    };
  });
}

export async function getPublicClinicBySlug(slug: string): Promise<PublicClinicDetail | null> {
  const admin = getSupabaseAdminClient();
  const { data: clinic, error } = await admin
    .from("organizations")
    .select("id,name,slug,status")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!clinic) {
    return null;
  }

  const { data: services, error: servicesError } = await admin
    .from("services")
    .select("*")
    .eq("organization_id", clinic.id)
    .eq("status", "active")
    .eq("is_bookable", true)
    .order("price_from", { ascending: true });

  if (servicesError) {
    if (isClinicFoundationMissingError(servicesError)) {
      return { ...clinic, services: [], providers: [], locations: [], slotSuggestionsByService: {} };
    }
    throw servicesError;
  }

  const [
    { data: rules, error: rulesError },
    { data: appointments, error: appointmentsError },
    { data: providers, error: providersError },
    { data: locations, error: locationsError }
  ] = await Promise.all([
    admin
      .from("staff_availability_rules")
      .select("staff_member_id,location_id,weekday,start_local,end_local,is_available")
      .eq("organization_id", clinic.id),
    admin
      .from("appointments")
      .select("staff_member_id,scheduled_start,scheduled_end,status")
      .eq("organization_id", clinic.id)
      .gte("scheduled_start", new Date().toISOString())
      .limit(300),
    admin
      .from("staff_members")
      .select("id,full_name,specialty,location_id")
      .eq("organization_id", clinic.id)
      .eq("status", "active")
      .eq("accepts_online_booking", true)
      .order("full_name", { ascending: true }),
    admin
      .from("clinic_locations")
      .select("id,name,district,city")
      .eq("organization_id", clinic.id)
      .eq("status", "active")
      .order("name", { ascending: true })
  ]);

  if (rulesError) {
    if (isClinicFoundationMissingError(rulesError)) {
      return {
        ...clinic,
        services: (services ?? []) as ServiceRow[],
        providers: [],
        locations: [],
        slotSuggestionsByService: {}
      };
    }
    throw rulesError;
  }

  if (appointmentsError) {
    throw appointmentsError;
  }
  if (providersError) {
    throw providersError;
  }
  if (locationsError) {
    throw locationsError;
  }

  const slotSuggestionsByService = Object.fromEntries(
    ((services ?? []) as ServiceRow[]).map((service) => [
      service.id,
      buildSuggestedSlots({
        durationMinutes: service.duration_minutes,
        bufferBeforeMinutes: service.buffer_before_minutes,
        bufferAfterMinutes: service.buffer_after_minutes,
        rules: rules ?? [],
        appointments: appointments ?? [],
        maxSuggestions: 4
      })
    ])
  );

  return {
    ...clinic,
    services: (services ?? []) as ServiceRow[],
    providers: ((providers ?? []) as Pick<StaffMemberRow, "id" | "full_name" | "specialty" | "location_id">[]),
    locations: ((locations ?? []) as Pick<ClinicLocationRow, "id" | "name" | "district" | "city">[]),
    slotSuggestionsByService
  };
}
