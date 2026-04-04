import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/session";
import {
  DEV_CLINIC_ROLE_COOKIE,
  hasClinicRole,
  parseDevClinicRoleOverride
} from "@/modules/clinic/guard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type { StaffRole } from "@/modules/clinic/types";

function isDevMutationAllowed(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const host = request.nextUrl.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

async function runFollowUpRoundtrip(params: {
  organizationId: string;
  supabase: ReturnType<typeof getSupabaseAdminClient>;
}) {
  const { organizationId, supabase } = params;
  const { data: patients, error: patientError } = await supabase
    .from("patients")
    .select("id,next_follow_up_at,last_contacted_at,lifecycle_stage")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (patientError) {
    throw new Error(`Smoke follow-up patient query failed: ${patientError.message}`);
  }

  const patient = patients?.[0] ?? null;
  if (!patient) {
    throw new Error(`Smoke follow-up patient олдсонгүй. org=${organizationId}`);
  }

  const before = {
    nextFollowUpAt: patient.next_follow_up_at,
    lastContactedAt: patient.last_contacted_at,
    lifecycleStage: patient.lifecycle_stage
  };

  const original = {
    next_follow_up_at: patient.next_follow_up_at,
    last_contacted_at: patient.last_contacted_at,
    lifecycle_stage: patient.lifecycle_stage
  } satisfies Pick<
    Database["public"]["Tables"]["patients"]["Update"],
    "next_follow_up_at" | "last_contacted_at" | "lifecycle_stage"
  >;

  const updatedNextFollowUpAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const updatedLastContactedAt = new Date().toISOString();

  const { data: updatedPatient, error: updateError } = await supabase
    .from("patients")
    .update({
      next_follow_up_at: updatedNextFollowUpAt,
      last_contacted_at: updatedLastContactedAt,
      lifecycle_stage: "follow_up_due"
    })
    .eq("id", patient.id)
    .eq("organization_id", organizationId)
    .select("id,next_follow_up_at,last_contacted_at,lifecycle_stage")
    .maybeSingle();

  if (updateError || !updatedPatient) {
    throw new Error(updateError?.message ?? "Smoke follow-up update баталгаажсангүй.");
  }

  const { error: restoreError } = await supabase
    .from("patients")
    .update(original)
    .eq("id", patient.id)
    .eq("organization_id", organizationId);

  if (restoreError) {
    throw restoreError;
  }

  const { data: restoredPatient, error: restoredPatientError } = await supabase
    .from("patients")
    .select("id,next_follow_up_at,last_contacted_at,lifecycle_stage")
    .eq("id", patient.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (restoredPatientError || !restoredPatient) {
    throw new Error(restoredPatientError?.message ?? "Smoke follow-up restore баталгаажсангүй.");
  }

  return {
    patientId: patient.id,
    before,
    afterUpdate: {
      nextFollowUpAt: updatedPatient.next_follow_up_at,
      lastContactedAt: updatedPatient.last_contacted_at,
      lifecycleStage: updatedPatient.lifecycle_stage
    },
    afterRestore: {
      nextFollowUpAt: restoredPatient.next_follow_up_at,
      lastContactedAt: restoredPatient.last_contacted_at,
      lifecycleStage: restoredPatient.lifecycle_stage
    },
    updatedNextFollowUpAt,
    updatedLastContactedAt
  };
}

async function runReportPresetRoundtrip(params: {
  organizationId: string;
  userId: string;
  supabase: ReturnType<typeof getSupabaseAdminClient>;
}) {
  const { organizationId, userId, supabase } = params;
  const tempName = `Smoke preset ${new Date().toISOString()}`;
  const countPresets = async () => {
    const { count, error } = await supabase
      .from("clinic_report_presets")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Smoke preset counts failed: ${error.message}`);
    }

    return count ?? 0;
  };

  const countBefore = await countPresets();

  const { data: inserted, error: insertError } = await supabase
    .from("clinic_report_presets")
    .insert({
      organization_id: organizationId,
      user_id: userId,
      name: tempName,
      range_preset: "7d",
      provider_filter: "all",
      location_filter: "all"
    })
    .select("id,name")
    .maybeSingle();

  if (insertError || !inserted) {
    throw new Error("Smoke report preset create амжилтгүй боллоо.");
  }

  const countAfterInsert = await countPresets();
  const { error: deleteError } = await supabase
    .from("clinic_report_presets")
    .delete()
    .eq("id", inserted.id)
    .eq("organization_id", organizationId)
    .eq("user_id", userId);

  if (deleteError) {
    throw deleteError;
  }

  const countAfterDelete = await countPresets();
  return {
    presetId: inserted.id,
    name: inserted.name,
    countBefore,
    countAfterInsert,
    countAfterDelete
  };
}

async function runNotificationRetryRoundtrip(params: {
  organizationId: string;
  supabase: ReturnType<typeof getSupabaseAdminClient>;
}) {
  const { organizationId, supabase } = params;
  const countStatuses = async () => {
    const { data: jobs, error } = await supabase
      .from("clinic_engagement_jobs")
      .select("status")
      .eq("organization_id", organizationId);

    if (error) {
      throw new Error(`Smoke retry counts failed: ${error.message}`);
    }

    return (jobs ?? []).reduce(
      (acc, item) => {
        if (item.status === "failed") acc.failed += 1;
        if (item.status === "queued") acc.queued += 1;
        return acc;
      },
      { failed: 0, queued: 0 }
    );
  };

  const { data: appointments, error: appointmentError } = await supabase
    .from("appointments")
    .select("id,patient_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (appointmentError) {
    throw new Error(`Smoke appointment query failed: ${appointmentError.message}`);
  }

  const appointment = appointments?.[0] ?? null;
  if (!appointment) {
    throw new Error(`Smoke retry appointment олдсонгүй. org=${organizationId}`);
  }

  const countsBefore = await countStatuses();
  const tempIdempotencyKey = `smoke-retry:${Date.now()}`;
  const { data: job, error: insertError } = await supabase
    .from("clinic_engagement_jobs")
    .insert({
      organization_id: organizationId,
      patient_id: appointment.patient_id,
      appointment_id: appointment.id,
      job_type: "appointment_reminder_24h",
      channel: "sms",
      status: "failed",
      idempotency_key: tempIdempotencyKey,
      scheduled_for: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      finished_at: new Date().toISOString(),
      outcome_notes: "Smoke retry seed"
    })
    .select("id,status")
    .maybeSingle();

  if (insertError || !job) {
    throw new Error(`Smoke retry job create failed: ${insertError?.message ?? "unknown"}`);
  }

  const countsAfterSeed = await countStatuses();
  const retryScheduledFor = new Date().toISOString();
  const { data: updatedJob, error: updateError } = await supabase
    .from("clinic_engagement_jobs")
    .update({
      status: "queued",
      scheduled_for: retryScheduledFor,
      started_at: null,
      finished_at: null,
      outcome_notes: "Smoke retry roundtrip"
    })
    .eq("id", job.id)
    .eq("organization_id", organizationId)
    .select("id,status,scheduled_for")
    .maybeSingle();

  if (updateError || !updatedJob || updatedJob.status !== "queued") {
    throw new Error(`Smoke retry update failed: ${updateError?.message ?? "unknown"}`);
  }

  const countsAfterRetry = await countStatuses();
  const { error: deleteError } = await supabase
    .from("clinic_engagement_jobs")
    .delete()
    .eq("id", job.id)
    .eq("organization_id", organizationId);

  if (deleteError) {
    throw new Error(`Smoke retry cleanup failed: ${deleteError.message}`);
  }

  const countsAfterCleanup = await countStatuses();
  return {
    jobId: job.id,
    beforeStatus: job.status,
    status: updatedJob.status,
    countsBefore,
    countsAfterSeed,
    countsAfterRetry,
    countsAfterCleanup
  };
}

async function runCheckoutPaymentRoundtrip(params: {
  organizationId: string;
  userId: string;
  supabase: ReturnType<typeof getSupabaseAdminClient>;
}) {
  const { organizationId, userId, supabase } = params;
  const countRecords = async () => {
    const [{ count: checkoutCount, error: checkoutCountError }, { count: paymentCount, error: paymentCountError }] =
      await Promise.all([
        supabase
          .from("clinic_checkouts")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId),
        supabase
          .from("clinic_checkout_payments")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId)
      ]);

    if (checkoutCountError) {
      throw new Error(`Smoke checkout count failed: ${checkoutCountError.message}`);
    }
    if (paymentCountError) {
      throw new Error(`Smoke checkout payment count failed: ${paymentCountError.message}`);
    }

    return {
      checkouts: checkoutCount ?? 0,
      payments: paymentCount ?? 0
    };
  };

  const { data: appointments, error: appointmentError } = await supabase
    .from("appointments")
    .select("id,patient_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (appointmentError) {
    throw new Error(`Smoke checkout appointment query failed: ${appointmentError.message}`);
  }

  const appointment = appointments?.[0] ?? null;
  if (!appointment) {
    throw new Error(`Smoke checkout appointment олдсонгүй. org=${organizationId}`);
  }

  const countsBefore = await countRecords();
  const { data: checkout, error: checkoutError } = await supabase
    .from("clinic_checkouts")
    .insert({
      organization_id: organizationId,
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      status: "draft",
      payment_status: "unpaid",
      currency: "MNT",
      subtotal: 120000,
      discount_total: 0,
      total: 120000,
      created_by_user_id: userId
    })
    .select("id,status,payment_status,total,currency")
    .maybeSingle();

  if (checkoutError || !checkout) {
    throw new Error(`Smoke checkout create failed: ${checkoutError?.message ?? "unknown"}`);
  }

  const { error: itemError } = await supabase.from("clinic_checkout_items").insert({
    checkout_id: checkout.id,
    organization_id: organizationId,
    item_type: "service",
    label: "Smoke payment item",
    quantity: 1,
    unit_price: 120000,
    line_total: 120000
  });

  if (itemError) {
    throw new Error(`Smoke checkout item create failed: ${itemError.message}`);
  }

  const countsAfterCheckout = await countRecords();
  const { data: payment, error: paymentError } = await supabase
    .from("clinic_checkout_payments")
    .insert({
      checkout_id: checkout.id,
      organization_id: organizationId,
      patient_id: appointment.patient_id,
      amount: 50000,
      currency: "MNT",
      payment_kind: "payment",
      payment_method: "cash",
      notes: "Smoke payment roundtrip",
      paid_at: new Date().toISOString(),
      received_by_user_id: userId
    })
    .select("id,amount")
    .maybeSingle();

  if (paymentError || !payment) {
    throw new Error(`Smoke checkout payment create failed: ${paymentError?.message ?? "unknown"}`);
  }

  const { data: updatedCheckout, error: updateCheckoutError } = await supabase
    .from("clinic_checkouts")
    .update({
      payment_status: "partial",
      status: "draft"
    })
    .eq("id", checkout.id)
    .eq("organization_id", organizationId)
    .select("id,status,payment_status")
    .maybeSingle();

  if (updateCheckoutError || !updatedCheckout) {
    throw new Error(`Smoke checkout payment status update failed: ${updateCheckoutError?.message ?? "unknown"}`);
  }

  const countsAfterPayment = await countRecords();

  const { error: deletePaymentError } = await supabase
    .from("clinic_checkout_payments")
    .delete()
    .eq("id", payment.id)
    .eq("organization_id", organizationId);

  if (deletePaymentError) {
    throw new Error(`Smoke checkout payment cleanup failed: ${deletePaymentError.message}`);
  }

  const { error: deleteItemError } = await supabase
    .from("clinic_checkout_items")
    .delete()
    .eq("checkout_id", checkout.id)
    .eq("organization_id", organizationId);

  if (deleteItemError) {
    throw new Error(`Smoke checkout item cleanup failed: ${deleteItemError.message}`);
  }

  const { error: deleteCheckoutError } = await supabase
    .from("clinic_checkouts")
    .delete()
    .eq("id", checkout.id)
    .eq("organization_id", organizationId);

  if (deleteCheckoutError) {
    throw new Error(`Smoke checkout cleanup failed: ${deleteCheckoutError.message}`);
  }

  const countsAfterCleanup = await countRecords();

  return {
    checkoutId: checkout.id,
    paymentId: payment.id,
    beforeStatus: checkout.payment_status,
    afterPaymentStatus: updatedCheckout.payment_status,
    countsBefore,
    countsAfterCheckout,
    countsAfterPayment,
    countsAfterCleanup
  };
}

export async function POST(request: NextRequest) {
  if (!isDevMutationAllowed(request)) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: ownerMembership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .eq("status", "active")
    .maybeSingle();

  const { data: staffMember } = ownerMembership
    ? { data: null }
    : await supabase
        .from("staff_members")
        .select("organization_id,role")
        .eq("profile_id", user.id)
        .eq("status", "active")
        .maybeSingle();

  const organizationId = ownerMembership?.organization_id ?? staffMember?.organization_id ?? null;
  if (!organizationId) {
    return NextResponse.json({ error: "no_organization" }, { status: 400 });
  }

  const roleOverride = parseDevClinicRoleOverride(request.cookies.get(DEV_CLINIC_ROLE_COOKIE)?.value);
  const effectiveRole: StaffRole | null = roleOverride ?? (ownerMembership ? "owner" : ((staffMember?.role as StaffRole | undefined) ?? null));

  const body = (await request.json().catch(() => null)) as { operation?: string } | null;
  const operation = body?.operation;

  if (
    operation !== "follow_up_roundtrip" &&
    operation !== "report_preset_roundtrip" &&
    operation !== "notification_retry_roundtrip" &&
    operation !== "checkout_payment_roundtrip"
  ) {
    return NextResponse.json({ error: "unsupported_operation" }, { status: 400 });
  }

  const allowedRoles: StaffRole[] =
    operation === "notification_retry_roundtrip" || operation === "checkout_payment_roundtrip"
      ? ["owner", "manager", "front_desk", "billing"]
      : ["owner", "manager"];

  if (!effectiveRole || !hasClinicRole(effectiveRole, allowedRoles)) {
    return NextResponse.json({ error: "insufficient_role" }, { status: 403 });
  }

  try {
    if (operation === "follow_up_roundtrip") {
      const result = await runFollowUpRoundtrip({
        organizationId,
        supabase
      });
      return NextResponse.json({ ok: true, operation, result });
    }

    if (operation === "notification_retry_roundtrip") {
      const result = await runNotificationRetryRoundtrip({
        organizationId,
        supabase
      });
      return NextResponse.json({ ok: true, operation, result });
    }

    if (operation === "checkout_payment_roundtrip") {
      const result = await runCheckoutPaymentRoundtrip({
        organizationId,
        userId: user.id,
        supabase
      });
      return NextResponse.json({ ok: true, operation, result });
    }

    const result = await runReportPresetRoundtrip({
      organizationId,
      userId: user.id,
      supabase
    });
    return NextResponse.json({ ok: true, operation, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}
