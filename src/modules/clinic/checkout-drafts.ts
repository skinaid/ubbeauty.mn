export type CheckoutDraftCreationResultKind = "created" | "exists" | "skipped" | "error";

export type CheckoutDraftCreationResult = {
  kind: CheckoutDraftCreationResultKind;
  message: string;
};

export type BulkCheckoutDraftSummary = {
  created: number;
  existing: number;
  skipped: number;
  failed: number;
  message: string;
};

export function summarizeBulkCheckoutDraftResults(
  results: CheckoutDraftCreationResult[]
): BulkCheckoutDraftSummary {
  let created = 0;
  let existing = 0;
  let skipped = 0;
  let failed = 0;

  for (const result of results) {
    if (result.kind === "created") {
      created += 1;
    } else if (result.kind === "exists") {
      existing += 1;
    } else if (result.kind === "skipped") {
      skipped += 1;
    } else {
      failed += 1;
    }
  }

  return {
    created,
    existing,
    skipped,
    failed,
    message: `Draft үүсгэлт дууслаа: ${created} created, ${existing} existing, ${skipped} skipped, ${failed} failed.`
  };
}
