/**
 * Layer: orchestration — load job, metrics read → signals → LLM input → LLM → persist.
 * Dashboard reads stay in `modules/ai/data.ts`.
 */
import { getOrganizationAiReportEntitlement } from "@/modules/ai/entitlements-org";
import { loadNormalizedMetricsBundleForPage } from "@/modules/ai/metrics-reader";
import { buildAnalysisLlmUserPrompt } from "@/modules/ai/llm-input-construction";
import { buildDeterministicAnalysisResult, runAnalysisLlmLayer } from "@/modules/ai/llm-adapter";
import { persistAnalysisOutput } from "@/modules/ai/persist-report";
import { extractDeterministicSignals } from "@/modules/ai/signals";
import { incrementAiReportGeneratedForOrganization } from "@/modules/subscriptions/usage-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const ERR_MAX = 4000;

const SYSTEM_PROMPT = `You are a senior social analytics advisor for Facebook Pages.
You must respect the provided deterministic signals (rule-based). Do not invent metrics.
Output must follow the user's JSON schema exactly. No markdown.`;

function jobPayloadRecord(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

export async function executeAnalysisJob(jobId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseAdminClient();
  const { data: job, error: jobErr } = await admin.from("analysis_jobs").select("*").eq("id", jobId).single();

  if (jobErr || !job) {
    return { ok: false, error: "Analysis job not found" };
  }

  if (job.status === "succeeded") {
    return { ok: true };
  }

  const nextAttempt = job.attempt_count + 1;
  await admin
    .from("analysis_jobs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      attempt_count: nextAttempt,
      error_message: null
    })
    .eq("id", jobId);

  try {
    const entitlement = await getOrganizationAiReportEntitlement(job.organization_id);
    if (!entitlement.allowed) {
      throw new Error(
        `AI generation blocked: ${entitlement.reason ?? "not_allowed"} (${entitlement.used}/${entitlement.limit} used)`
      );
    }

    const { daily, posts } = await loadNormalizedMetricsBundleForPage(job.meta_page_id);
    if (daily.length === 0 && posts.length === 0) {
      throw new Error("Insufficient normalized metrics to analyze (run a successful sync first).");
    }

    const { data: pageRow } = await admin.from("meta_pages").select("name").eq("id", job.meta_page_id).single();

    const signals = extractDeterministicSignals(daily, posts);
    const userPrompt = buildAnalysisLlmUserPrompt({
      pageName: pageRow?.name ?? "Page",
      signals,
      daily,
      posts
    });

    let llmResult = buildDeterministicAnalysisResult(signals);
    let modelName: string | null = null;

    try {
      const layer = await runAnalysisLlmLayer({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
        signals
      });
      llmResult = layer.result;
      modelName = layer.modelName;
    } catch (e) {
      console.warn("[ai] LLM layer failed, using deterministic fallback:", e instanceof Error ? e.message : e);
      llmResult = buildDeterministicAnalysisResult(signals);
      modelName = null;
    }

    const payload = jobPayloadRecord(job.payload);

    await persistAnalysisOutput({
      organizationId: job.organization_id,
      internalPageId: job.meta_page_id,
      analysisJobId: jobId,
      signals,
      llm: llmResult,
      modelName,
      jobContext: {
        trigger: typeof payload.trigger === "string" ? payload.trigger : undefined,
        source_sync_job_id: job.source_sync_job_id,
        analysis_job_id: jobId
      }
    });

    try {
      await incrementAiReportGeneratedForOrganization(job.organization_id);
    } catch (e) {
      console.warn("[ai] Usage increment failed (best-effort):", e instanceof Error ? e.message : e);
    }

    await admin
      .from("analysis_jobs")
      .update({
        status: "succeeded",
        finished_at: new Date().toISOString(),
        error_message: null
      })
      .eq("id", jobId);

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const trimmed = msg.length > ERR_MAX ? msg.slice(0, ERR_MAX) : msg;
    await admin
      .from("analysis_jobs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: trimmed
      })
      .eq("id", jobId);
    return { ok: false, error: trimmed };
  }
}
