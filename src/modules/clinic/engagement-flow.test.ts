import { describe, expect, it } from "vitest";
import {
  buildClinicEngagementJobPlan,
  getExecutableClinicEngagementJobs
} from "./engagement";

describe("clinic engagement reminder flow", () => {
  it("keeps future reminders queued while executing only due operational jobs", () => {
    const plannedJobs = buildClinicEngagementJobPlan({
      organizationId: "org-1",
      upcomingAppointments: [
        {
          id: "appt-future",
          patient_id: "patient-1",
          scheduled_start: "2026-04-05T10:00:00.000Z",
          status: "confirmed"
        }
      ],
      noShowAppointments: [
        {
          id: "appt-no-show",
          patient_id: "patient-2",
          updated_at: "2026-04-03T10:00:00.000Z",
          status: "no_show"
        }
      ],
      followUpTreatments: [
        {
          id: "tx-1",
          patient_id: "patient-3",
          appointment_id: "appt-treatment",
          updated_at: "2026-03-28T10:00:00.000Z",
          follow_up_plan: "7 хоногийн дараа call хийх"
        }
      ]
    });

    const executableJobs = getExecutableClinicEngagementJobs(
      plannedJobs.map((job, index) => ({
        id: `job-${index + 1}`,
        channel: job.channel,
        status: job.status,
        scheduled_for: job.scheduled_for
      })),
      "2026-04-04T10:00:00.000Z"
    );

    expect(plannedJobs.map((job) => `${job.job_type}:${job.channel}`)).toEqual([
      "appointment_reminder_24h:sms",
      "appointment_reminder_2h:call_task",
      "no_show_recovery_24h:call_task",
      "follow_up_24h:call_task",
      "follow_up_7d:call_task"
    ]);

    expect(executableJobs.map((job) => job.id)).toEqual(["job-3", "job-4", "job-5"]);
  });

  it("does not execute sms reminders even when their scheduled time is due", () => {
    const plannedJobs = buildClinicEngagementJobPlan({
      organizationId: "org-2",
      upcomingAppointments: [
        {
          id: "appt-due",
          patient_id: "patient-9",
          scheduled_start: "2026-04-05T08:00:00.000Z",
          status: "booked"
        }
      ],
      noShowAppointments: [],
      followUpTreatments: []
    });

    const executableJobs = getExecutableClinicEngagementJobs(
      plannedJobs.map((job, index) => ({
        id: `due-job-${index + 1}`,
        channel: job.channel,
        status: job.status,
        scheduled_for: job.scheduled_for
      })),
      "2026-04-04T10:00:00.000Z"
    );

    expect(executableJobs.map((job) => job.id)).toEqual([]);
  });
});
