# Idempotency & retry safety (testable points)

Use this when validating behavior before or during private beta. Automated coverage: `npm run test` (Vitest) includes pure helpers such as invoice reconciliation flag math.

## Billing / QPay

| Flow | Idempotency / safety | How to verify |
|------|----------------------|---------------|
| Webhook delivery | Duplicate `provider_event_id` → dedupe event; verification may still run | Send same payload twice; expect single activation side-effect |
| `verifyInvoiceAndActivateSubscription` | Paid + matching amount/currency → conditional `invoices` update; subscription activation guarded | Re-run verification on already-paid invoice → `already_finalized` / idempotent skip paths in logs & `billing_events` |
| Operator **Re-verify QPay** | Calls same verification orchestrator as webhook (`runInvoicePaymentReverification`) | Click twice on internal ops; check `billing_events` for `operator_payment_reverification` and stable invoice/subscription state |

## Meta sync

| Flow | Idempotency / safety | How to verify |
|------|----------------------|---------------|
| `executeMetaSyncJob` | Terminal `succeeded` / `canceled` → early return (no re-run) | Complete job then trigger retry → operator action should reject or no-op per status guards |
| Failed / queued retry | Same job id re-enters execute pipeline | Retry from dashboard or internal ops; expect `attempt_count` / status transitions; audit row on operator retry |

## AI analysis

| Flow | Idempotency / safety | How to verify |
|------|----------------------|---------------|
| `executeAnalysisJob` | Returns structured `{ ok, error }`; succeeded jobs blocked from operator “retry” in UI | Fail a job, operator retry from `/admin/jobs` (or legacy `/internal/ops/jobs`), then confirm audit metadata |
| Customer regenerate | Product flow may create **new** job rows — distinct from in-place retry | Confirm with DB or UI job list |

## Operator audit

All operator retries and payment reverification should produce rows in `operator_audit_events` with `actor_email`, `action_type`, and `metadata` (outcome / errors).

## Suggested manual smoke (staging)

1. **Webhook retry**: replay QPay webhook for same invoice → no double activation.
2. **Sync retry**: fail sync (e.g. invalid token), fix connection, retry job.
3. **Analysis retry**: fail analysis (e.g. quota or LLM error), operator retry after fix.
4. **Stale pending invoice**: mark scenario with old `pending` invoice → internal ops shows `[pending 3d+]` / `[past due]`, run re-verify.
