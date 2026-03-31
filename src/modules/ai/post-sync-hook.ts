/**
 * Layer: trigger wiring — post-sync → enqueue analysis job (with `source_sync_job_id`) → execute.
 * Quota gate lives here; persistence and reads are in other modules.
 */
import { getOrganizationAiReportEntitlement } from "@/modules/ai/entitlements-org";
import { enqueueAnalysisJobAfterSync } from "@/modules/ai/enqueue-analysis";
import { executeAnalysisJob } from "@/modules/ai/execute-analysis-job";

export async function schedulePostSyncAnalysis(params: {
  organizationId: string;
  metaPageId: string;
  sourceSyncJobId: string;
}): Promise<void> {
  const entitlement = await getOrganizationAiReportEntitlement(params.organizationId);
  if (!entitlement.allowed) {
    return;
  }

  const analysisJobId = await enqueueAnalysisJobAfterSync({
    organizationId: params.organizationId,
    internalPageId: params.metaPageId,
    sourceSyncJobId: params.sourceSyncJobId
  });

  if (!analysisJobId) {
    return;
  }

  await executeAnalysisJob(analysisJobId);
}
