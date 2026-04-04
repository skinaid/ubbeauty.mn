import { describe, expect, it } from "vitest";
import {
  buildAppointmentStatusBreakdown,
  buildCheckoutCollectionSummary,
  buildDashboardReportSummary,
  buildNotificationDeliverySummary,
  buildReportPresetHref,
  buildOperationalReportCsv,
  buildExportableReportSummary,
  filterReportAppointments,
  filterReportCheckouts,
  filterReportEngagementJobs,
  filterReportNotificationDeliveries,
  formatReportRangeLabel,
  resolveCustomReportDateRange,
  resolveReportDateRange
} from "./reporting";

describe("buildDashboardReportSummary", () => {
  it("calculates no-show rate, same-day revenue, follow-up due, and provider load", () => {
    const summary = buildDashboardReportSummary({
      range: {
        startIso: "2026-04-04T00:00:00.000Z",
        endIso: "2026-04-04T10:00:00.000Z"
      },
      appointments: [
        {
          scheduled_start: "2026-04-04T02:00:00.000Z",
          status: "completed",
          staff_member: { full_name: "Dr. Saraa" },
          location: { name: "Central" }
        },
        {
          scheduled_start: "2026-04-04T04:00:00.000Z",
          status: "no_show",
          staff_member: { full_name: "Dr. Saraa" },
          location: { name: "Central" }
        },
        {
          scheduled_start: "2026-04-04T05:00:00.000Z",
          status: "arrived",
          staff_member: { full_name: "Dr. Enkh" },
          location: { name: "River" }
        },
        {
          scheduled_start: "2026-04-03T05:00:00.000Z",
          status: "completed",
          staff_member: { full_name: "Dr. Enkh" },
          location: { name: "River" }
        }
      ],
      checkouts: [
        {
          currency: "MNT",
          total: 100000,
          appointment: {
            scheduled_start: "2026-04-04T02:00:00.000Z",
            staff_member: { full_name: "Dr. Saraa" },
            location: { name: "Central" }
          },
          status: "closed",
          payment_status: "paid",
          payments: [
            { amount: 100000, payment_kind: "card", paid_at: "2026-04-04T03:00:00.000Z" },
            { amount: 10000, payment_kind: "refund", paid_at: "2026-04-04T06:00:00.000Z" }
          ]
        },
        {
          currency: "MNT",
          total: 50000,
          appointment: {
            scheduled_start: "2026-04-03T02:00:00.000Z",
            staff_member: { full_name: "Dr. Enkh" },
            location: { name: "River" }
          },
          status: "closed",
          payment_status: "paid",
          payments: [{ amount: 50000, payment_kind: "cash", paid_at: "2026-04-03T03:00:00.000Z" }]
        }
      ],
      engagementJobs: [
        {
          job_type: "follow_up_24h",
          status: "queued",
          scheduled_for: "2026-04-04T08:00:00.000Z"
        },
        {
          job_type: "follow_up_7d",
          status: "succeeded",
          scheduled_for: "2026-04-04T07:00:00.000Z"
        },
        {
          job_type: "appointment_reminder_2h",
          status: "queued",
          scheduled_for: "2026-04-04T07:00:00.000Z"
        }
      ],
      notificationDeliveries: [
        {
          channel: "sms",
          provider: "twilio",
          status: "succeeded",
          attempted_at: "2026-04-04T06:30:00.000Z"
        },
        {
          channel: "email",
          provider: "resend",
          status: "failed",
          attempted_at: "2026-04-04T07:15:00.000Z",
          recipient: "demo@ubbeauty.mn",
          error_message: "Mailbox unavailable"
        }
      ]
    });

    expect(summary.noShowRate).toBe(33.3);
    expect(summary.noShowCount).toBe(1);
    expect(summary.totalAppointments).toBe(3);
    expect(summary.todayRevenue).toBe(90000);
    expect(summary.revenueCurrency).toBe("MNT");
    expect(summary.followUpDueCount).toBe(1);
    expect(summary.deliverySuccessRate).toBe(50);
    expect(summary.deliverySuccessCount).toBe(1);
    expect(summary.deliveryFailureCount).toBe(1);
    expect(summary.failedDeliveryCount).toBe(1);
    expect(summary.providerLoad).toEqual([
      {
        providerName: "Dr. Saraa",
        totalAppointments: 2,
        activeVisits: 0,
        completedVisits: 1
      },
      {
        providerName: "Dr. Enkh",
        totalAppointments: 1,
        activeVisits: 1,
        completedVisits: 0
      }
    ]);
  });
});

describe("buildOperationalReportCsv", () => {
  it("serializes summary, status, and provider sections into CSV", () => {
    const csv = buildOperationalReportCsv({
      rangeLabel: "2026.04.01 - 2026.04.03",
      dashboard: {
        noShowRate: 10,
        noShowCount: 1,
        totalAppointments: 10,
        todayRevenue: 250000,
        revenueCurrency: "MNT",
        followUpDueCount: 2,
        deliverySuccessRate: 80,
        deliverySuccessCount: 4,
        deliveryFailureCount: 1,
        failedDeliveryCount: 1,
        providerLoad: []
      },
      collection: {
        collectingCount: 3,
        paidCount: 6,
        voidedCount: 1,
        outstandingAmount: 120000,
        currency: "MNT"
      },
      statusBreakdown: [{ status: "completed", count: 7 }],
      providerLoad: [
        {
          providerName: "Dr. Saraa",
          totalAppointments: 5,
          activeVisits: 1,
          completedVisits: 3
        }
      ],
      notificationSummary: {
        totalAttempts: 5,
        successCount: 4,
        failedCount: 1,
        successRate: 80,
        channelBreakdown: [{ channel: "sms", total: 3, succeeded: 2, failed: 1 }],
        failedItems: []
      }
    });

    expect(csv).toContain("section,label,value,meta");
    expect(csv).toContain("summary,range,2026.04.01 - 2026.04.03,");
    expect(csv).toContain("summary,delivery_success_rate,80%,4 succeeded / 1 failed");
    expect(csv).toContain("appointment_status,completed,7,");
    expect(csv).toContain("provider_load,Dr. Saraa,5,1 active / 3 completed");
    expect(csv).toContain("notification_channel,sms,3,2 succeeded / 1 failed");
  });
});

describe("buildNotificationDeliverySummary", () => {
  it("builds channel breakdown and failed item list", () => {
    const summary = buildNotificationDeliverySummary([
      {
        channel: "sms",
        provider: "twilio",
        status: "succeeded",
        attempted_at: "2026-04-04T06:00:00.000Z",
        recipient: "+97699112233"
      },
      {
        channel: "sms",
        provider: "twilio",
        status: "failed",
        attempted_at: "2026-04-04T07:00:00.000Z",
        recipient: "+97699112244",
        error_message: "Rate limited"
      },
      {
        channel: "email",
        provider: "resend",
        status: "succeeded",
        attempted_at: "2026-04-04T08:00:00.000Z",
        recipient: "demo@ubbeauty.mn"
      }
    ]);

    expect(summary.totalAttempts).toBe(3);
    expect(summary.successCount).toBe(2);
    expect(summary.failedCount).toBe(1);
    expect(summary.successRate).toBe(66.7);
    expect(summary.channelBreakdown).toEqual([
      { channel: "sms", total: 2, succeeded: 1, failed: 1 },
      { channel: "email", total: 1, succeeded: 1, failed: 0 }
    ]);
    expect(summary.failedItems).toEqual([
      {
        channel: "sms",
        provider: "twilio",
        attemptedAt: "2026-04-04T07:00:00.000Z",
        recipient: "+97699112244",
        errorMessage: "Rate limited"
      }
    ]);
  });
});

describe("buildReportPresetHref", () => {
  it("builds shareable report links from saved preset params", () => {
    expect(
      buildReportPresetHref({
        rangePreset: "custom",
        provider: "Dr. Saraa",
        location: "Central",
        startDate: "2026-04-01",
        endDate: "2026-04-03"
      })
    ).toBe(
      "/reports?range=custom&provider=Dr.+Saraa&location=Central&startDate=2026-04-01&endDate=2026-04-03"
    );

    expect(
      buildReportPresetHref({
        rangePreset: "7d",
        provider: "all",
        location: "all",
        printView: true
      })
    ).toBe("/reports?range=7d&provider=all&location=all&print=1");
  });
});

describe("buildAppointmentStatusBreakdown", () => {
  it("counts today's appointment statuses in descending order", () => {
    const breakdown = buildAppointmentStatusBreakdown({
      range: {
        startIso: "2026-04-04T00:00:00.000Z",
        endIso: "2026-04-04T10:00:00.000Z"
      },
      appointments: [
        { scheduled_start: "2026-04-04T02:00:00.000Z", status: "completed", location: { name: "Central" } },
        { scheduled_start: "2026-04-04T03:00:00.000Z", status: "completed", location: { name: "Central" } },
        { scheduled_start: "2026-04-04T04:00:00.000Z", status: "booked", location: { name: "River" } },
        { scheduled_start: "2026-04-03T04:00:00.000Z", status: "no_show", location: { name: "River" } }
      ]
    });

    expect(breakdown).toEqual([
      { status: "completed", count: 2 },
      { status: "booked", count: 1 }
    ]);
  });
});

describe("buildCheckoutCollectionSummary", () => {
  it("calculates collecting, paid, voided counts and outstanding amount", () => {
    const summary = buildCheckoutCollectionSummary([
      {
        currency: "MNT",
        total: 100000,
        appointment: {
          scheduled_start: "2026-04-04T02:00:00.000Z",
          staff_member: { full_name: "Dr. Saraa" },
          location: { name: "Central" }
        },
        status: "draft",
        payment_status: "partial",
        payments: [{ amount: 40000, payment_kind: "card" }]
      },
      {
        currency: "MNT",
        total: 80000,
        appointment: {
          scheduled_start: "2026-04-04T03:00:00.000Z",
          staff_member: { full_name: "Dr. Enkh" },
          location: { name: "River" }
        },
        status: "closed",
        payment_status: "paid",
        payments: [{ amount: 80000, payment_kind: "cash" }]
      },
      {
        currency: "MNT",
        total: 20000,
        appointment: {
          scheduled_start: "2026-04-04T04:00:00.000Z",
          staff_member: { full_name: "Dr. Enkh" },
          location: { name: "River" }
        },
        status: "voided",
        payment_status: "unpaid",
        payments: []
      }
    ]);

    expect(summary).toEqual({
      collectingCount: 1,
      paidCount: 1,
      voidedCount: 1,
      outstandingAmount: 60000,
      currency: "MNT"
    });
  });
});

describe("report filters", () => {
  it("resolves report presets and filters appointments, checkouts, and jobs", () => {
    const range = resolveReportDateRange("2026-04-04T10:00:00.000Z", "7d");

    const appointments = filterReportAppointments(
      [
        {
          scheduled_start: "2026-04-04T02:00:00.000Z",
          status: "completed",
          staff_member: { full_name: "Dr. Saraa" },
          location: { name: "Central" }
        },
        {
          scheduled_start: "2026-03-20T02:00:00.000Z",
          status: "completed",
          staff_member: { full_name: "Dr. Saraa" },
          location: { name: "Central" }
        }
      ],
      {
        range,
        provider: "Dr. Saraa",
        location: "Central"
      }
    );

    const checkouts = filterReportCheckouts(
      [
        {
          currency: "MNT",
          total: 100000,
          appointment: {
            scheduled_start: "2026-04-04T02:00:00.000Z",
            staff_member: { full_name: "Dr. Saraa" },
            location: { name: "Central" }
          }
        },
        {
          currency: "MNT",
          total: 90000,
          appointment: {
            scheduled_start: "2026-04-04T02:00:00.000Z",
            staff_member: { full_name: "Dr. Enkh" },
            location: { name: "River" }
          }
        }
      ],
      {
        range,
        provider: "Dr. Saraa",
        location: "Central"
      }
    );

    const jobs = filterReportEngagementJobs(
      [
        {
          job_type: "follow_up_24h",
          status: "queued",
          scheduled_for: "2026-04-04T08:00:00.000Z"
        },
        {
          job_type: "follow_up_24h",
          status: "queued",
          scheduled_for: "2026-03-01T08:00:00.000Z"
        }
      ],
      { range }
    );

    const deliveries = filterReportNotificationDeliveries(
      [
        {
          channel: "sms",
          provider: "twilio",
          status: "succeeded",
          attempted_at: "2026-04-04T08:30:00.000Z"
        },
        {
          channel: "email",
          provider: "resend",
          status: "failed",
          attempted_at: "2026-03-01T08:30:00.000Z"
        }
      ],
      { range }
    );

    expect(range.startIso).toBe("2026-03-28T16:00:00.000Z");
    expect(appointments).toHaveLength(1);
    expect(checkouts).toHaveLength(1);
    expect(jobs).toHaveLength(1);
    expect(deliveries).toHaveLength(1);
  });
});

describe("custom report range and export summary", () => {
  it("resolves custom range and builds shareable summary lines", () => {
    const range = resolveCustomReportDateRange({
      nowIso: "2026-04-04T10:00:00.000Z",
      startDate: "2026-04-01",
      endDate: "2026-04-03"
    });

    const summary = buildExportableReportSummary({
      clinicName: "UbBeauty Central",
      rangeLabel: formatReportRangeLabel(range),
      dashboard: {
        noShowRate: 12.5,
        noShowCount: 1,
        totalAppointments: 8,
        todayRevenue: 450000,
        revenueCurrency: "MNT",
        followUpDueCount: 2,
        deliverySuccessRate: 75,
        deliverySuccessCount: 3,
        deliveryFailureCount: 1,
        failedDeliveryCount: 1,
        providerLoad: [
          {
            providerName: "Dr. Saraa",
            totalAppointments: 5,
            activeVisits: 1,
            completedVisits: 3
          }
        ]
      },
      collection: {
        collectingCount: 3,
        paidCount: 6,
        voidedCount: 1,
        outstandingAmount: 120000,
        currency: "MNT"
      },
      topProvider: {
        providerName: "Dr. Saraa",
        totalAppointments: 5,
        activeVisits: 1,
        completedVisits: 3
      }
    });

    expect(range.startIso).toBe("2026-03-31T16:00:00.000Z");
    expect(summary.title).toBe("UbBeauty Central operational summary");
    expect(summary.lines).toContain("Follow-up due: 2");
    expect(summary.lines).toContain("Delivery success: 75% (3 succeeded / 1 failed)");
    expect(summary.lines.at(-1)).toBe("Top provider: Dr. Saraa (5 appointments)");
  });
});
