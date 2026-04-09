type AvailabilityRuleLike = {
  staff_member_id: string;
  location_id?: string | null;
  weekday: number;
  start_local: string;
  end_local: string;
  is_available: boolean;
};

type AppointmentLike = {
  staff_member_id?: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status?: string | null;
};

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function getLocalMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function withMinutes(date: Date, minutes: number): Date {
  const next = new Date(date);
  next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return next;
}

function overlaps(start: Date, end: Date, otherStart: Date, otherEnd: Date): boolean {
  return start < otherEnd && end > otherStart;
}

export function findAvailableStaffAssignment(params: {
  preferredStaffId?: string | null;
  preferredLocationId?: string | null;
  requestedStart: Date;
  requestedEnd: Date;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  rules: AvailabilityRuleLike[];
  appointments: AppointmentLike[];
}): { staffMemberId: string; locationId: string | null } | null {
  const weekday = params.requestedStart.getDay();
  const bufferBeforeMinutes = params.bufferBeforeMinutes ?? 0;
  const bufferAfterMinutes = params.bufferAfterMinutes ?? 0;
  const windowStart = new Date(params.requestedStart.getTime() - bufferBeforeMinutes * 60 * 1000);
  const windowEnd = new Date(params.requestedEnd.getTime() + bufferAfterMinutes * 60 * 1000);
  const startMinutes = getLocalMinutes(windowStart);
  const endMinutes = getLocalMinutes(windowEnd);

  const candidateRules = params.rules.filter((rule) => {
    if (!rule.is_available) return false;
    if (rule.weekday !== weekday) return false;
    if (params.preferredStaffId && rule.staff_member_id !== params.preferredStaffId) return false;
    if (params.preferredLocationId && rule.location_id !== params.preferredLocationId) return false;

    const ruleStart = timeToMinutes(rule.start_local);
    const ruleEnd = timeToMinutes(rule.end_local);
    return startMinutes >= ruleStart && endMinutes <= ruleEnd;
  });

  for (const rule of candidateRules) {
    const hasOverlap = params.appointments.some((appointment) => {
      if (!appointment.staff_member_id || appointment.staff_member_id !== rule.staff_member_id) return false;
      if (appointment.status === "canceled" || appointment.status === "no_show") return false;
      return overlaps(
        windowStart,
        windowEnd,
        new Date(appointment.scheduled_start),
        new Date(appointment.scheduled_end)
      );
    });

    if (!hasOverlap) {
      return {
        staffMemberId: rule.staff_member_id,
        locationId: rule.location_id ?? null
      };
    }
  }

  return null;
}

export function buildSuggestedSlots(params: {
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  preferredStaffId?: string | null;
  preferredLocationId?: string | null;
  rules: AvailabilityRuleLike[];
  appointments: AppointmentLike[];
  from?: Date;
  days?: number;
  maxSuggestions?: number;
}): string[] {
  const from = params.from ?? new Date();
  const days = params.days ?? 10;
  const maxSuggestions = params.maxSuggestions ?? 6;
  const suggestions: string[] = [];

  for (let offset = 0; offset < days && suggestions.length < maxSuggestions; offset += 1) {
    const day = new Date(from);
    day.setDate(from.getDate() + offset);
    day.setHours(0, 0, 0, 0);
    const weekday = day.getDay();

    const dayRules = params.rules.filter((rule) => rule.is_available && rule.weekday === weekday);
    for (const rule of dayRules) {
      const ruleStart = timeToMinutes(rule.start_local);
      const ruleEnd = timeToMinutes(rule.end_local);

      for (let minute = ruleStart; minute + params.durationMinutes <= ruleEnd; minute += 30) {
        const slotStart = withMinutes(day, minute);
        if (slotStart <= from) continue;

        const slotEnd = new Date(slotStart.getTime() + params.durationMinutes * 60 * 1000);
        const assignment = findAvailableStaffAssignment({
          preferredStaffId: params.preferredStaffId,
          preferredLocationId: params.preferredLocationId,
          requestedStart: slotStart,
          requestedEnd: slotEnd,
          bufferBeforeMinutes: params.bufferBeforeMinutes,
          bufferAfterMinutes: params.bufferAfterMinutes,
          rules: [rule],
          appointments: params.appointments
        });

        if (assignment) {
          suggestions.push(slotStart.toISOString());
        }
        if (suggestions.length >= maxSuggestions) break;
      }

      if (suggestions.length >= maxSuggestions) break;
    }
  }

  return suggestions;
}
