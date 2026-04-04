export type EngagementJobType =
  | "appointment_reminder_24h"
  | "appointment_reminder_2h"
  | "no_show_recovery_24h"
  | "follow_up_24h"
  | "follow_up_7d";

export type EngagementChannel = "manual_queue" | "sms" | "email" | "call_task";
export type EngagementStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

export type PlannedEngagementJob = {
  organization_id: string;
  patient_id: string;
  appointment_id?: string | null;
  treatment_record_id?: string | null;
  job_type: EngagementJobType;
  channel: EngagementChannel;
  status: EngagementStatus;
  idempotency_key: string;
  scheduled_for: string;
  payload: Record<string, string | boolean | null>;
};

export type UpcomingAppointmentForEngagement = {
  id: string;
  patient_id: string;
  scheduled_start: string;
  status: string;
};

export type NoShowAppointmentForEngagement = {
  id: string;
  patient_id: string;
  updated_at: string;
  status: string;
};

export type TreatmentFollowUpForEngagement = {
  id: string;
  patient_id: string;
  appointment_id: string;
  updated_at: string;
  follow_up_plan: string | null;
};

export type ExistingEngagementJob = {
  id: string;
  job_type?: string;
  channel: string;
  status: string;
  scheduled_for: string;
};

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function buildClinicEngagementJobPlan(params: {
  organizationId: string;
  upcomingAppointments: UpcomingAppointmentForEngagement[];
  noShowAppointments: NoShowAppointmentForEngagement[];
  followUpTreatments: TreatmentFollowUpForEngagement[];
}): PlannedEngagementJob[] {
  const rows: PlannedEngagementJob[] = [];

  for (const appointment of params.upcomingAppointments) {
    const scheduledStart = new Date(appointment.scheduled_start);
    rows.push({
      organization_id: params.organizationId,
      patient_id: appointment.patient_id,
      appointment_id: appointment.id,
      treatment_record_id: null,
      job_type: "appointment_reminder_24h",
      channel: "sms",
      status: "queued",
      idempotency_key: `appointment:${appointment.id}:reminder_24h`,
      scheduled_for: addHours(scheduledStart, -24).toISOString(),
      payload: {
        trigger: "appointment_reminder_24h",
        appointmentStatus: appointment.status,
        phase: "phase_a"
      }
    });
    rows.push({
      organization_id: params.organizationId,
      patient_id: appointment.patient_id,
      appointment_id: appointment.id,
      treatment_record_id: null,
      job_type: "appointment_reminder_2h",
      channel: "call_task",
      status: "queued",
      idempotency_key: `appointment:${appointment.id}:reminder_2h`,
      scheduled_for: addHours(scheduledStart, -2).toISOString(),
      payload: {
        trigger: "appointment_reminder_2h",
        appointmentStatus: appointment.status,
        phase: "phase_a"
      }
    });
  }

  for (const appointment of params.noShowAppointments) {
    rows.push({
      organization_id: params.organizationId,
      patient_id: appointment.patient_id,
      appointment_id: appointment.id,
      treatment_record_id: null,
      job_type: "no_show_recovery_24h",
      channel: "call_task",
      status: "queued",
      idempotency_key: `appointment:${appointment.id}:no_show_recovery_24h`,
      scheduled_for: addHours(new Date(appointment.updated_at), 24).toISOString(),
      payload: {
        trigger: "no_show_recovery_24h",
        appointmentStatus: appointment.status,
        phase: "phase_a"
      }
    });
  }

  for (const treatment of params.followUpTreatments) {
    const updatedAt = new Date(treatment.updated_at);
    rows.push({
      organization_id: params.organizationId,
      patient_id: treatment.patient_id,
      appointment_id: treatment.appointment_id,
      treatment_record_id: treatment.id,
      job_type: "follow_up_24h",
      channel: "call_task",
      status: "queued",
      idempotency_key: `treatment:${treatment.id}:follow_up_24h`,
      scheduled_for: addHours(updatedAt, 24).toISOString(),
      payload: {
        trigger: "follow_up_24h",
        hasPlan: Boolean(treatment.follow_up_plan),
        phase: "phase_a"
      }
    });
    rows.push({
      organization_id: params.organizationId,
      patient_id: treatment.patient_id,
      appointment_id: treatment.appointment_id,
      treatment_record_id: treatment.id,
      job_type: "follow_up_7d",
      channel: "call_task",
      status: "queued",
      idempotency_key: `treatment:${treatment.id}:follow_up_7d`,
      scheduled_for: addDays(updatedAt, 7).toISOString(),
      payload: {
        trigger: "follow_up_7d",
        hasPlan: Boolean(treatment.follow_up_plan),
        phase: "phase_a"
      }
    });
  }

  return rows;
}

export function getExecutableClinicEngagementJobs(
  jobs: ExistingEngagementJob[],
  nowIso: string
): ExistingEngagementJob[] {
  const nowTs = new Date(nowIso).getTime();
  return jobs.filter((job) => {
    if (job.status !== "queued") return false;
    if (!["manual_queue", "call_task"].includes(job.channel)) return false;
    return new Date(job.scheduled_for).getTime() <= nowTs;
  });
}
