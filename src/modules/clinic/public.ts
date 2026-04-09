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
  locationLabel: string | null;
  district: string | null;
  city: string | null;
  minPrice: number | null;
  currency: string | null;
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
    if (isClinicFoundationMissingError(error)) {
      return [];
    }
    throw error;
  }

  const organizationIds = (clinics ?? []).map((clinic) => clinic.id);
  if (organizationIds.length === 0) return [];

  const { data: services, error: servicesError } = await admin
    .from("services")
    .select("organization_id,name,price_from,currency")
    .in("organization_id", organizationIds)
    .eq("status", "active")
    .eq("is_bookable", true);

  if (servicesError) {
    if (isClinicFoundationMissingError(servicesError)) {
      return (clinics ?? []).map((clinic) => ({
        ...clinic,
        serviceCount: 0,
        serviceNames: [],
        locationLabel: null,
        district: null,
        city: null,
        minPrice: null,
        currency: null
      }));
    }
    throw servicesError;
  }

  const { data: locations, error: locationsError } = await admin
    .from("clinic_locations")
    .select("organization_id,name,district,city,status")
    .in("organization_id", organizationIds)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (locationsError) {
    if (!isClinicFoundationMissingError(locationsError)) {
      throw locationsError;
    }
  }

  const servicesByOrg = new Map<string, string[]>();
  const minPriceByOrg = new Map<string, { minPrice: number | null; currency: string | null }>();
  for (const service of services ?? []) {
    const current = servicesByOrg.get(service.organization_id) ?? [];
    current.push(service.name);
    servicesByOrg.set(service.organization_id, current);

    const currentMin = minPriceByOrg.get(service.organization_id);
    if (!currentMin || Number(service.price_from) < Number(currentMin.minPrice ?? Number.POSITIVE_INFINITY)) {
      minPriceByOrg.set(service.organization_id, {
        minPrice: Number(service.price_from),
        currency: service.currency
      });
    }
  }

  const firstLocationByOrg = new Map<
    string,
    { locationLabel: string | null; district: string | null; city: string | null }
  >();
  for (const location of locations ?? []) {
    if (!firstLocationByOrg.has(location.organization_id)) {
      firstLocationByOrg.set(location.organization_id, {
        locationLabel: location.name,
        district: location.district,
        city: location.city
      });
    }
  }

  return (clinics ?? []).map((clinic) => {
    const names = servicesByOrg.get(clinic.id) ?? [];
    const location = firstLocationByOrg.get(clinic.id) ?? {
      locationLabel: null,
      district: null,
      city: null
    };
    const minPrice = minPriceByOrg.get(clinic.id) ?? { minPrice: null, currency: null };
    return {
      ...clinic,
      serviceCount: names.length,
      serviceNames: names.slice(0, 3),
      locationLabel: location.locationLabel,
      district: location.district,
      city: location.city,
      minPrice: minPrice.minPrice,
      currency: minPrice.currency
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
    if (isClinicFoundationMissingError(error)) {
      return null;
    }
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
