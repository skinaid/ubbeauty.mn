type ReportAppointment = {
  scheduled_start: string;
  status: string;
  staff_member?: { full_name?: string | null } | null;
  location?: { name?: string | null } | null;
};

type ReportCheckoutPayment = {
  amount?: number | null;
  payment_kind?: string | null;
  paid_at?: string | null;
};

type ReportCheckout = {
  currency: string;
  total?: number | null;
  appointment?:
    | {
        scheduled_start?: string | null;
        staff_member?: { full_name?: string | null } | null;
        location?: { name?: string | null } | null;
      }
    | null;
  status?: string | null;
  payment_status?: string | null;
  payments?: ReportCheckoutPayment[] | null;
};

type ReportEngagementJob = {
  job_type: string;
  status: string;
  scheduled_for: string;
};

type ReportNotificationDelivery = {
  channel: string;
  provider: string;
  status: string;
  attempted_at: string;
  recipient?: string | null;
  error_message?: string | null;
};

export type ReportRangePreset = "today" | "7d" | "30d" | "custom";
export type ReportDateRange = {
  startIso: string;
  endIso: string;
};

export type ProviderLoadSummary = {
  providerName: string;
  totalAppointments: number;
  activeVisits: number;
  completedVisits: number;
};

export type DashboardReportSummary = {
  noShowRate: number;
  noShowCount: number;
  totalAppointments: number;
  todayRevenue: number;
  revenueCurrency: string;
  followUpDueCount: number;
  deliverySuccessRate: number;
  deliverySuccessCount: number;
  deliveryFailureCount: number;
  failedDeliveryCount: number;
  providerLoad: ProviderLoadSummary[];
};

export type NotificationDeliverySummary = {
  totalAttempts: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  channelBreakdown: Array<{
    channel: string;
    total: number;
    succeeded: number;
    failed: number;
  }>;
  failedItems: Array<{
    channel: string;
    provider: string;
    attemptedAt: string;
    recipient: string | null;
    errorMessage: string | null;
  }>;
};

export type AppointmentStatusBreakdownItem = {
  status: string;
  count: number;
};

export type CheckoutCollectionSummary = {
  collectingCount: number;
  paidCount: number;
  voidedCount: number;
  outstandingAmount: number;
  currency: string;
};

export type ExportableReportSummary = {
  title: string;
  lines: string[];
};

export type ReportPresetLinkParams = {
  rangePreset: ReportRangePreset;
  provider: string;
  location: string;
  startDate?: string | null;
  endDate?: string | null;
  printView?: boolean;
};

function escapeCsvCell(value: string | number) {
  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function isWithinRange(isoDate: string, range: ReportDateRange) {
  const timestamp = new Date(isoDate).getTime();
  return timestamp >= new Date(range.startIso).getTime() && timestamp <= new Date(range.endIso).getTime();
}

export function resolveReportDateRange(nowIso: string, preset: ReportRangePreset): ReportDateRange {
  if (preset === "custom") {
    return {
      startIso: getStartOfDay(new Date(nowIso)).toISOString(),
      endIso: new Date(nowIso).toISOString()
    };
  }

  const now = new Date(nowIso);
  const end = now;
  const start = getStartOfDay(new Date(now));

  if (preset === "7d") {
    start.setDate(start.getDate() - 6);
  } else if (preset === "30d") {
    start.setDate(start.getDate() - 29);
  }

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString()
  };
}

export function resolveCustomReportDateRange(params: {
  nowIso: string;
  startDate?: string;
  endDate?: string;
}): ReportDateRange {
  const fallback = resolveReportDateRange(params.nowIso, "today");
  if (!params.startDate || !params.endDate) {
    return fallback;
  }

  const start = new Date(`${params.startDate}T00:00:00`);
  const end = new Date(`${params.endDate}T23:59:59.999`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.getTime() > end.getTime()) {
    return fallback;
  }

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString()
  };
}

export function formatReportRangeLabel(range: ReportDateRange) {
  const start = new Date(range.startIso).toLocaleDateString("mn-MN");
  const end = new Date(range.endIso).toLocaleDateString("mn-MN");
  return start === end ? start : `${start} - ${end}`;
}

export function filterReportAppointments(
  appointments: ReportAppointment[],
  params: {
    range: ReportDateRange;
    provider: string;
    location: string;
  }
) {
  return appointments.filter((appointment) => {
    const matchesRange = isWithinRange(appointment.scheduled_start, params.range);
    const matchesProvider =
      params.provider === "all" || (appointment.staff_member?.full_name ?? "") === params.provider;
    const matchesLocation =
      params.location === "all" || (appointment.location?.name ?? "") === params.location;

    return matchesRange && matchesProvider && matchesLocation;
  });
}

export function filterReportCheckouts(
  checkouts: ReportCheckout[],
  params: {
    range: ReportDateRange;
    provider: string;
    location: string;
  }
) {
  return checkouts.filter((checkout) => {
    if (!checkout.appointment?.scheduled_start) return false;

    const matchesRange = isWithinRange(checkout.appointment.scheduled_start, params.range);
    const matchesProvider =
      params.provider === "all" || (checkout.appointment?.staff_member?.full_name ?? "") === params.provider;
    const matchesLocation =
      params.location === "all" || (checkout.appointment?.location?.name ?? "") === params.location;

    return matchesRange && matchesProvider && matchesLocation;
  });
}

export function filterReportEngagementJobs(
  jobs: ReportEngagementJob[],
  params: {
    range: ReportDateRange;
  }
) {
  return jobs.filter((job) => isWithinRange(job.scheduled_for, params.range));
}

export function filterReportNotificationDeliveries<T extends ReportNotificationDelivery>(
  deliveries: T[],
  params: {
    range: ReportDateRange;
  }
) {
  return deliveries.filter((delivery) => isWithinRange(delivery.attempted_at, params.range));
}

function getSignedPaymentAmount(payment: ReportCheckoutPayment) {
  const amount = Number(payment.amount ?? 0);
  return payment.payment_kind === "refund" ? -amount : amount;
}

export function getCheckoutOutstandingAmount(checkout: ReportCheckout) {
  const total = Number(checkout.total ?? 0);
  const netPaid = (checkout.payments ?? []).reduce(
    (sum, payment) => sum + getSignedPaymentAmount(payment),
    0
  );
  return Number(Math.max(total - netPaid, 0).toFixed(2));
}

export function buildDashboardReportSummary(params: {
  appointments: ReportAppointment[];
  checkouts: ReportCheckout[];
  engagementJobs: ReportEngagementJob[];
  notificationDeliveries?: ReportNotificationDelivery[];
  range: ReportDateRange;
}): DashboardReportSummary {
  const rangeAppointments = params.appointments.filter((appointment) =>
    isWithinRange(appointment.scheduled_start, params.range)
  );
  const noShowCount = rangeAppointments.filter((appointment) => appointment.status === "no_show").length;
  const noShowRate =
    rangeAppointments.length === 0 ? 0 : Number(((noShowCount / rangeAppointments.length) * 100).toFixed(1));

  const todayRevenue = Number(
    params.checkouts
      .flatMap((checkout) => checkout.payments ?? [])
      .filter((payment) => payment.paid_at && isWithinRange(payment.paid_at, params.range))
      .reduce((sum, payment) => sum + getSignedPaymentAmount(payment), 0)
      .toFixed(2)
  );

  const revenueCurrency = params.checkouts[0]?.currency ?? "MNT";

  const providerLoad = Array.from(
    rangeAppointments.reduce((map, appointment) => {
      const providerName = appointment.staff_member?.full_name ?? "Unassigned";
      const current = map.get(providerName) ?? {
        providerName,
        totalAppointments: 0,
        activeVisits: 0,
        completedVisits: 0
      };

      current.totalAppointments += 1;
      if (["arrived", "in_progress"].includes(appointment.status)) {
        current.activeVisits += 1;
      }
      if (appointment.status === "completed") {
        current.completedVisits += 1;
      }

      map.set(providerName, current);
      return map;
    }, new Map<string, ProviderLoadSummary>())
  )
    .map(([, value]) => value)
    .sort((left, right) => {
      if (right.totalAppointments !== left.totalAppointments) {
        return right.totalAppointments - left.totalAppointments;
      }
      return right.activeVisits - left.activeVisits;
    });

  const followUpDueCount = params.engagementJobs.filter(
    (job) =>
      job.status === "queued" &&
      job.job_type.startsWith("follow_up") &&
      new Date(job.scheduled_for).getTime() <= new Date(params.range.endIso).getTime()
  ).length;

  const deliveryAttempts = params.notificationDeliveries ?? [];
  const deliverySuccessCount = deliveryAttempts.filter((delivery) => delivery.status === "succeeded").length;
  const deliveryFailureCount = deliveryAttempts.filter((delivery) => delivery.status === "failed").length;
  const deliverySuccessRate =
    deliveryAttempts.length === 0
      ? 0
      : Number(((deliverySuccessCount / deliveryAttempts.length) * 100).toFixed(1));

  return {
    noShowRate,
    noShowCount,
    totalAppointments: rangeAppointments.length,
    todayRevenue,
    revenueCurrency,
    followUpDueCount,
    deliverySuccessRate,
    deliverySuccessCount,
    deliveryFailureCount,
    failedDeliveryCount: deliveryFailureCount,
    providerLoad
  };
}

export function buildNotificationDeliverySummary(
  deliveries: ReportNotificationDelivery[]
): NotificationDeliverySummary {
  const successCount = deliveries.filter((delivery) => delivery.status === "succeeded").length;
  const failedCount = deliveries.filter((delivery) => delivery.status === "failed").length;
  const successRate =
    deliveries.length === 0 ? 0 : Number(((successCount / deliveries.length) * 100).toFixed(1));

  const channelBreakdown = Array.from(
    deliveries.reduce((map, delivery) => {
      const current = map.get(delivery.channel) ?? {
        channel: delivery.channel,
        total: 0,
        succeeded: 0,
        failed: 0
      };

      current.total += 1;
      if (delivery.status === "succeeded") current.succeeded += 1;
      if (delivery.status === "failed") current.failed += 1;
      map.set(delivery.channel, current);
      return map;
    }, new Map<string, { channel: string; total: number; succeeded: number; failed: number }>())
  )
    .map(([, value]) => value)
    .sort((left, right) => right.total - left.total);

  const failedItems = deliveries
    .filter((delivery) => delivery.status === "failed")
    .slice(0, 8)
    .map((delivery) => ({
      channel: delivery.channel,
      provider: delivery.provider,
      attemptedAt: delivery.attempted_at,
      recipient: delivery.recipient ?? null,
      errorMessage: delivery.error_message ?? null
    }));

  return {
    totalAttempts: deliveries.length,
    successCount,
    failedCount,
    successRate,
    channelBreakdown,
    failedItems
  };
}

export function buildAppointmentStatusBreakdown(params: {
  appointments: ReportAppointment[];
  range: ReportDateRange;
}): AppointmentStatusBreakdownItem[] {
  return Array.from(
    params.appointments
      .filter((appointment) => isWithinRange(appointment.scheduled_start, params.range))
      .reduce((map, appointment) => {
        map.set(appointment.status, (map.get(appointment.status) ?? 0) + 1);
        return map;
      }, new Map<string, number>())
  )
    .map(([status, count]) => ({ status, count }))
    .sort((left, right) => right.count - left.count);
}

export function buildCheckoutCollectionSummary(checkouts: Array<
  ReportCheckout
>): CheckoutCollectionSummary {
  const collectingCheckouts = checkouts.filter(
    (checkout) => checkout.status !== "voided" && checkout.payment_status !== "paid"
  );

  return {
    collectingCount: collectingCheckouts.length,
    paidCount: checkouts.filter((checkout) => checkout.payment_status === "paid").length,
    voidedCount: checkouts.filter((checkout) => checkout.status === "voided").length,
    outstandingAmount: Number(
      collectingCheckouts.reduce((sum, checkout) => sum + getCheckoutOutstandingAmount(checkout), 0).toFixed(2)
    ),
    currency: checkouts[0]?.currency ?? "MNT"
  };
}

export function buildExportableReportSummary(params: {
  clinicName: string;
  rangeLabel: string;
  dashboard: DashboardReportSummary;
  collection: CheckoutCollectionSummary;
  topProvider?: ProviderLoadSummary;
}): ExportableReportSummary {
  return {
    title: `${params.clinicName} operational summary`,
    lines: [
      `Range: ${params.rangeLabel}`,
      `Revenue: ${params.dashboard.todayRevenue.toLocaleString("en-US")} ${params.dashboard.revenueCurrency}`,
      `No-show: ${params.dashboard.noShowRate}% (${params.dashboard.noShowCount}/${params.dashboard.totalAppointments})`,
      `Follow-up due: ${params.dashboard.followUpDueCount}`,
      `Delivery success: ${params.dashboard.deliverySuccessRate}% (${params.dashboard.deliverySuccessCount} succeeded / ${params.dashboard.deliveryFailureCount} failed)`,
      `Collection outstanding: ${params.collection.outstandingAmount.toLocaleString("en-US")} ${params.collection.currency}`,
      `Collecting checkouts: ${params.collection.collectingCount}`,
      params.topProvider
        ? `Top provider: ${params.topProvider.providerName} (${params.topProvider.totalAppointments} appointments)`
        : "Top provider: —"
    ]
  };
}

export function buildOperationalReportCsv(params: {
  rangeLabel: string;
  dashboard: DashboardReportSummary;
  collection: CheckoutCollectionSummary;
  statusBreakdown: AppointmentStatusBreakdownItem[];
  providerLoad: ProviderLoadSummary[];
  notificationSummary?: NotificationDeliverySummary;
}) {
  const rows: string[][] = [
    ["section", "label", "value", "meta"],
    ["summary", "range", params.rangeLabel, ""],
    [
      "summary",
      "revenue",
      `${params.dashboard.todayRevenue.toLocaleString("en-US")} ${params.dashboard.revenueCurrency}`,
      "captured payments minus refunds"
    ],
    [
      "summary",
      "no_show_rate",
      `${params.dashboard.noShowRate}%`,
      `${params.dashboard.noShowCount}/${params.dashboard.totalAppointments}`
    ],
    ["summary", "follow_up_due", String(params.dashboard.followUpDueCount), ""],
    [
      "summary",
      "delivery_success_rate",
      `${params.dashboard.deliverySuccessRate}%`,
      `${params.dashboard.deliverySuccessCount} succeeded / ${params.dashboard.deliveryFailureCount} failed`
    ],
    [
      "summary",
      "collection_outstanding",
      `${params.collection.outstandingAmount.toLocaleString("en-US")} ${params.collection.currency}`,
      `${params.collection.collectingCount} collecting`
    ]
  ];

  for (const item of params.statusBreakdown) {
    rows.push(["appointment_status", item.status, String(item.count), ""]);
  }

  for (const provider of params.providerLoad) {
    rows.push([
      "provider_load",
      provider.providerName,
      String(provider.totalAppointments),
      `${provider.activeVisits} active / ${provider.completedVisits} completed`
    ]);
  }

  if (params.notificationSummary) {
    for (const item of params.notificationSummary.channelBreakdown) {
      rows.push([
        "notification_channel",
        item.channel,
        String(item.total),
        `${item.succeeded} succeeded / ${item.failed} failed`
      ]);
    }
  }

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function buildReportPresetHref(params: ReportPresetLinkParams) {
  const search = new URLSearchParams();
  search.set("range", params.rangePreset);
  search.set("provider", params.provider);
  search.set("location", params.location);
  if (params.startDate) {
    search.set("startDate", params.startDate);
  }
  if (params.endDate) {
    search.set("endDate", params.endDate);
  }
  if (params.printView) {
    search.set("print", "1");
  }
  return `/reports?${search.toString()}`;
}
