"use server";

import { revalidatePath } from "next/cache";
import { requireInternalOpsActor } from "@/modules/admin/guard";
import { safeRecordOperatorAuditEvent } from "@/modules/ops-audit/record";
import { runInvoicePaymentReverification } from "@/modules/billing/reconciliation";
import { executeAnalysisJob } from "@/modules/ai/execute-analysis-job";
import { executeMetaSyncJob } from "@/modules/sync/execute-meta-sync";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type OperatorActionState = {
  error?: string;
  message?: string;
};

export async function operatorReverifyInvoiceAction(
  _prev: OperatorActionState,
  formData: FormData
): Promise<OperatorActionState> {
  const actor = await requireInternalOpsActor();
  const invoiceId = formData.get("invoiceId");
  if (typeof invoiceId !== "string" || !invoiceId) {
    return { error: "Invalid invoice." };
  }

  const admin = getSupabaseAdminClient();
  const { data: invRow, error: invErr } = await admin
    .from("invoices")
    .select("organization_id")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr || !invRow) {
    return { error: "Invoice not found." };
  }

  try {
    const result = await runInvoicePaymentReverification({ invoiceId, actorEmail: actor });

    await safeRecordOperatorAuditEvent({
      actorEmail: actor,
      actionType: "invoice_payment_reverification",
      organizationId: invRow.organization_id,
      resourceType: "invoice",
      resourceId: invoiceId,
      metadata: { verify_result: result.status }
    });

    revalidatePath("/internal/ops");
    revalidatePath("/internal/ops/billing");
    return { message: `Verification finished: ${result.status}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Reverification failed.";
    await safeRecordOperatorAuditEvent({
      actorEmail: actor,
      actionType: "invoice_payment_reverification",
      organizationId: invRow.organization_id,
      resourceType: "invoice",
      resourceId: invoiceId,
      metadata: { outcome: "error", error: msg }
    });
    return { error: msg };
  }
}

export async function operatorRetrySyncJobAction(
  _prev: OperatorActionState,
  formData: FormData
): Promise<OperatorActionState> {
  const actor = await requireInternalOpsActor();
  const jobId = formData.get("jobId");
  if (typeof jobId !== "string" || !jobId) {
    return { error: "Invalid job." };
  }

  const admin = getSupabaseAdminClient();
  const { data: job, error } = await admin
    .from("meta_sync_jobs")
    .select("id,organization_id,status")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job) {
    return { error: "Job not found." };
  }

  if (job.status === "running") {
    return { error: "Job is running." };
  }
  if (job.status === "succeeded" || job.status === "canceled") {
    return { error: "Job cannot be retried (terminal success/canceled)." };
  }

  try {
    await executeMetaSyncJob(jobId);

    await safeRecordOperatorAuditEvent({
      actorEmail: actor,
      actionType: "sync_job_retry",
      organizationId: job.organization_id,
      resourceType: "meta_sync_job",
      resourceId: jobId,
      metadata: { prior_status: job.status, outcome: "success" }
    });

    revalidatePath("/internal/ops");
    revalidatePath("/internal/ops/jobs");
    revalidatePath("/dashboard");
    return { message: "Sync job executed." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync retry failed.";
    await safeRecordOperatorAuditEvent({
      actorEmail: actor,
      actionType: "sync_job_retry",
      organizationId: job.organization_id,
      resourceType: "meta_sync_job",
      resourceId: jobId,
      metadata: { prior_status: job.status, outcome: "error", error: msg }
    });
    return { error: msg };
  }
}

export async function operatorRetryAnalysisJobAction(
  _prev: OperatorActionState,
  formData: FormData
): Promise<OperatorActionState> {
  const actor = await requireInternalOpsActor();
  const jobId = formData.get("jobId");
  if (typeof jobId !== "string" || !jobId) {
    return { error: "Invalid job." };
  }

  const admin = getSupabaseAdminClient();
  const { data: job, error } = await admin
    .from("analysis_jobs")
    .select("id,organization_id,status")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job) {
    return { error: "Job not found." };
  }

  if (job.status === "running") {
    return { error: "Job is running." };
  }
  if (job.status === "succeeded") {
    return { error: "Job already succeeded (idempotent no-op if re-run needed, use customer regenerate)." };
  }

  try {
    const result = await executeAnalysisJob(jobId);

    await safeRecordOperatorAuditEvent({
      actorEmail: actor,
      actionType: "analysis_job_retry",
      organizationId: job.organization_id,
      resourceType: "analysis_job",
      resourceId: jobId,
      metadata: { prior_status: job.status, ok: result.ok, error: result.error ?? null }
    });

    revalidatePath("/internal/ops");
    revalidatePath("/internal/ops/jobs");
    revalidatePath("/dashboard");
    if (!result.ok) {
      return { error: result.error ?? "Analysis still failed." };
    }
    return { message: "Analysis job completed." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analysis retry failed.";
    await safeRecordOperatorAuditEvent({
      actorEmail: actor,
      actionType: "analysis_job_retry",
      organizationId: job.organization_id,
      resourceType: "analysis_job",
      resourceId: jobId,
      metadata: { prior_status: job.status, outcome: "exception", error: msg }
    });
    return { error: msg };
  }
}
