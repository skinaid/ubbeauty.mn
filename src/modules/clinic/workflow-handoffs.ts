export type ScheduleHandoffAppointment = {
  id: string;
  patient_id: string;
  status: string;
};

export type ScheduleHandoffCheckout = {
  id: string;
  status?: string | null;
  payment_status?: string | null;
};

export type ScheduleHandoffLink = {
  href: string;
  label: string;
};

export type ScheduleHandoffState =
  | {
      kind: "checkout_ready";
      links: ScheduleHandoffLink[];
      badgeLabel: string;
    }
  | {
      kind: "draft_ready";
      links: ScheduleHandoffLink[];
    }
  | {
      kind: "waiting_for_completion";
      links: ScheduleHandoffLink[];
      message: string;
    };

const HANDOFF_ELIGIBLE_STATUSES = new Set(["completed", "in_progress", "arrived"]);

export function isScheduleHandoffEligible(status: string) {
  return HANDOFF_ELIGIBLE_STATUSES.has(status);
}

export function getScheduleHandoffState(params: {
  appointment: ScheduleHandoffAppointment;
  checkout?: ScheduleHandoffCheckout | null;
}): ScheduleHandoffState {
  const links: ScheduleHandoffLink[] = [
    {
      href: `/patients/${params.appointment.patient_id}`,
      label: "Patient CRM"
    },
    {
      href: "/checkout",
      label: "POS queue"
    }
  ];

  if (params.checkout?.id) {
    return {
      kind: "checkout_ready",
      links,
      badgeLabel: `${params.checkout.status ?? "draft"} / ${params.checkout.payment_status ?? "unpaid"}` 
    };
  }

  if (params.appointment.status === "completed") {
    return {
      kind: "draft_ready",
      links
    };
  }

  return {
    kind: "waiting_for_completion",
    links,
    message: "Checkout нь completed дээр идэвхжинэ"
  };
}

export function getBillingAuditHref(checkout: ScheduleHandoffCheckout) {
  return `/billing?checkoutStatus=${checkout.payment_status === "paid" ? "paid" : "collecting"}#checkout-${checkout.id}`;
}

export function getCheckoutOpenHref(checkout: ScheduleHandoffCheckout) {
  return `/checkout?checkoutId=${checkout.id}`;
}
