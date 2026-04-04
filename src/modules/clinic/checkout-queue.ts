export type QueueCheckout = {
  id: string;
  patient?: { full_name?: string | null } | null;
  appointment?: {
    scheduled_start?: string | null;
    staff_member?: { full_name?: string | null } | null;
    location?: { name?: string | null } | null;
  } | null;
  payment_status?: string | null;
  status?: string | null;
  currency: string;
  items?: Array<{ id: string }> | null;
  total?: number | null;
  payments?: Array<{ amount: number; payment_kind?: string | null }> | null;
};

export type CheckoutQueueStatusFilter = "all" | "collecting" | "paid" | "voided";
export type CheckoutQueueTimeFilter = "all" | "morning" | "afternoon" | "evening";
export type CheckoutQueueSortMode =
  | "priority_balance"
  | "oldest"
  | "newest"
  | "alphabetical";

function getSignedCheckoutPaymentAmount(payment: {
  amount: number;
  payment_kind?: string | null;
}) {
  return payment.payment_kind === "refund" ? -Number(payment.amount) : Number(payment.amount);
}

export function getCheckoutOutstandingAmount(checkout: QueueCheckout): number {
  const total = Number(checkout.total ?? 0);
  const paid = (checkout.payments ?? []).reduce(
    (sum, payment) => sum + getSignedCheckoutPaymentAmount(payment),
    0
  );
  return Number(Math.max(total - paid, 0).toFixed(2));
}

function getAppointmentStartTs(checkout: QueueCheckout) {
  return checkout.appointment?.scheduled_start
    ? new Date(checkout.appointment.scheduled_start).getTime()
    : 0;
}

function matchesTimeFilter(checkout: QueueCheckout, timeFilter: CheckoutQueueTimeFilter) {
  const appointmentHour = checkout.appointment?.scheduled_start
    ? new Date(checkout.appointment.scheduled_start).getHours()
    : null;

  return (
    timeFilter === "all" ||
    (timeFilter === "morning" && appointmentHour !== null && appointmentHour < 12) ||
    (timeFilter === "afternoon" &&
      appointmentHour !== null &&
      appointmentHour >= 12 &&
      appointmentHour < 17) ||
    (timeFilter === "evening" && appointmentHour !== null && appointmentHour >= 17)
  );
}

export function filterAndSortCheckoutQueue(params: {
  checkouts: QueueCheckout[];
  query: string;
  statusFilter: CheckoutQueueStatusFilter;
  providerFilter: string;
  locationFilter: string;
  timeFilter: CheckoutQueueTimeFilter;
  sortMode: CheckoutQueueSortMode;
}): QueueCheckout[] {
  const normalized = params.query.trim().toLowerCase();

  return params.checkouts
    .filter((checkout) => {
      const matchesQuery =
        normalized.length === 0 ||
        (checkout.patient?.full_name ?? "").toLowerCase().includes(normalized) ||
        checkout.id.toLowerCase().includes(normalized);

      const matchesStatus =
        params.statusFilter === "all" ||
        (params.statusFilter === "collecting" &&
          checkout.status !== "voided" &&
          checkout.payment_status !== "paid") ||
        (params.statusFilter === "paid" && checkout.payment_status === "paid") ||
        (params.statusFilter === "voided" && checkout.status === "voided");

      const matchesProvider =
        params.providerFilter === "all" ||
        (checkout.appointment?.staff_member?.full_name ?? "") === params.providerFilter;

      const matchesLocation =
        params.locationFilter === "all" ||
        (checkout.appointment?.location?.name ?? "") === params.locationFilter;

      return (
        matchesQuery &&
        matchesStatus &&
        matchesProvider &&
        matchesLocation &&
        matchesTimeFilter(checkout, params.timeFilter)
      );
    })
    .sort((left, right) => {
      if (params.sortMode === "alphabetical") {
        return (left.patient?.full_name ?? "").localeCompare(
          right.patient?.full_name ?? "",
          "mn"
        );
      }

      const leftStart = getAppointmentStartTs(left);
      const rightStart = getAppointmentStartTs(right);

      if (params.sortMode === "oldest") {
        return leftStart - rightStart;
      }

      if (params.sortMode === "newest") {
        return rightStart - leftStart;
      }

      const leftBalance = getCheckoutOutstandingAmount(left);
      const rightBalance = getCheckoutOutstandingAmount(right);
      if (rightBalance !== leftBalance) {
        return rightBalance - leftBalance;
      }

      return leftStart - rightStart;
    });
}
