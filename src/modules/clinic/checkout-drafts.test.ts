import { describe, expect, it } from "vitest";
import { summarizeBulkCheckoutDraftResults } from "./checkout-drafts";

describe("summarizeBulkCheckoutDraftResults", () => {
  it("counts created, existing, skipped, and failed results into one summary", () => {
    const summary = summarizeBulkCheckoutDraftResults([
      { kind: "created", message: "ok" },
      { kind: "created", message: "ok" },
      { kind: "exists", message: "existing" },
      { kind: "skipped", message: "skip" },
      { kind: "error", message: "fail" }
    ]);

    expect(summary).toEqual({
      created: 2,
      existing: 1,
      skipped: 1,
      failed: 1,
      message: "Draft үүсгэлт дууслаа: 2 created, 1 existing, 1 skipped, 1 failed."
    });
  });

  it("returns a zeroed summary when no results are provided", () => {
    const summary = summarizeBulkCheckoutDraftResults([]);

    expect(summary).toEqual({
      created: 0,
      existing: 0,
      skipped: 0,
      failed: 0,
      message: "Draft үүсгэлт дууслаа: 0 created, 0 existing, 0 skipped, 0 failed."
    });
  });
});
