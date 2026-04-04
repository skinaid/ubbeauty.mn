import { describe, expect, it } from "vitest";
import {
  buildClinicEngagementJobPlan,
  getExecutableClinicEngagementJobs
} from "./engagement";

describe("buildClinicEngagementJobPlan", () => {
  it("builds reminders, no-show recovery, and follow-up jobs with correct channels", () => {
    const rows = buildClinicEngagementJobPlan({
      organizationId: "org-1",
      upcomingAppointments: [
        {
          id: "appt-1",
          patient_id: "patient-1",
          scheduled_start: "2026-04-10T10:00:00.000Z",
          status: "confirmed"
        }
      ],
      noShowAppointments: [
        {
          id: "appt-2",
          patient_id: "patient-2",
          updated_at: "2026-04-03T08:00:00.000Z",
          status: "no_show"
        }
      ],
      followUpTreatments: [
        {
          id: "tx-1",
          patient_id: "patient-3",
          appointment_id: "appt-3",
          updated_at: "2026-04-02T09:30:00.000Z",
          follow_up_plan: "7 хоногийн дараа шалгах"
        }
      ]
    });

    expect(rows).toHaveLength(6);

    expect(rows[0]).toMatchObject({
      organization_id: "org-1",
      patient_id: "patient-1",
      appointment_id: "appt-1",
      job_type: "appointment_reminder_24h",
      channel: "sms",
      idempotency_key: "appointment:appt-1:reminder_24h"
    });
    expect(rows[1]).toMatchObject({
      job_type: "appointment_reminder_24h",
      channel: "email",
      idempotency_key: "appointment:appt-1:reminder_24h_email"
    });
    expect(rows[2]).toMatchObject({
      job_type: "appointment_reminder_2h",
      channel: "call_task",
      idempotency_key: "appointment:appt-1:reminder_2h"
    });
    expect(rows[3]).toMatchObject({
      job_type: "no_show_recovery_24h",
      channel: "call_task",
      idempotency_key: "appointment:appt-2:no_show_recovery_24h"
    });
    expect(rows[4]).toMatchObject({
      job_type: "follow_up_24h",
      channel: "call_task",
      treatment_record_id: "tx-1"
    });
    expect(rows[5]).toMatchObject({
      job_type: "follow_up_7d",
      channel: "call_task",
      treatment_record_id: "tx-1"
    });
  });
});

describe("getExecutableClinicEngagementJobs", () => {
  it("returns only queued due jobs for executable channels", () => {
    const jobs = getExecutableClinicEngagementJobs(
      [
        {
          id: "job-1",
          channel: "call_task",
          status: "queued",
          scheduled_for: "2026-04-04T08:00:00.000Z"
        },
        {
          id: "job-2",
          channel: "sms",
          status: "queued",
          scheduled_for: "2026-04-04T08:00:00.000Z"
        },
        {
          id: "job-3",
          channel: "email",
          status: "queued",
          scheduled_for: "2026-04-04T08:00:00.000Z"
        },
        {
          id: "job-4",
          channel: "manual_queue",
          status: "queued",
          scheduled_for: "2026-04-04T12:00:00.000Z"
        },
        {
          id: "job-5",
          channel: "call_task",
          status: "succeeded",
          scheduled_for: "2026-04-04T07:00:00.000Z"
        }
      ],
      "2026-04-04T10:00:00.000Z"
    );

    expect(jobs.map((job) => job.id)).toEqual(["job-1", "job-2", "job-3"]);
  });
});
