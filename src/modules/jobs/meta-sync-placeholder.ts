import { enqueueMetaSyncJob } from "@/modules/sync/enqueue";
import { executeMetaSyncJob } from "@/modules/sync/execute-meta-sync";

/**
 * After a page is selected, enqueue `initial_sync` then run it inline.
 * Phase 6+: replace inline execution with worker dequeue; keep enqueue + `executeMetaSyncJob(jobId)` as the worker entrypoint.
 */
export async function onMetaPageSelectionChanged(params: {
  organizationId: string;
  metaPageRowId: string;
  selected: boolean;
}): Promise<void> {
  if (!params.selected) {
    return;
  }

  const jobId = await enqueueMetaSyncJob({
    organizationId: params.organizationId,
    internalPageId: params.metaPageRowId,
    jobType: "initial_sync",
    payload: { trigger: "page_selected" }
  });

  try {
    await executeMetaSyncJob(jobId);
  } catch {
    // Selection already succeeded; job row records failure for dashboard visibility
  }
}
