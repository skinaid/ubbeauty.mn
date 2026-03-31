# Billing + QPay (Phase 7)

## Layering (separate concerns)

| Concern | Module / artifact |
|--------|-------------------|
| Selected target plan (checkout intent, no subscription write) | `layer-target-plan.ts` (`CheckoutTargetPlanSnapshot`, `validateCheckoutTargetAgainstSubscription`) |
| Invoice row (`pending` charge) | `layer-invoice.ts` (`insertPendingInvoiceRecord`, …) |
| Payment transaction row (initiated / paid) | `layer-payment-transaction.ts`, `layer-subscription-activation.ts` |
| Provider webhook HTTP delivery | `webhook-handler.ts` → `billing_events` |
| Provider verification (`payment/check`) | `layer-verification.ts` |
| Verification outcome + audit counters | `verify-payment.ts` + `invoices.verification_attempt_count` / `last_verification_*` |
| Subscription state transition to `active` | **`layer-subscription-activation.ts` only** (after verified PAID) |

Plan pickers and RPCs must **not** set `subscriptions.status = active` for paid activation — only `applySubscriptionTransitionAfterVerifiedPayment`.

## Model

- **`subscriptions`**: one per organization; defines current plan + lifecycle status. **Never** moved to a paid tier (or from `bootstrap_pending_billing` to `active`) without a **provider-verified** payment.
- **`invoices`**: organization-level charge attempt for a **`target_plan_id`**. Stores QPay `invoice_id`, optional deeplink, webhook token, amounts, and status (`pending` → `paid` / `failed` / …).
- **`payment_transactions`**: one row per checkout attempt / observed payment; holds **raw** QPay create payload and **verification** payload from `payment/check`.
- **`billing_events`**: append-only audit log (webhooks, verification outcomes, errors). **`provider_event_id`** is unique when set for deduplication.

## Flow

1. Owner clicks **Pay with QPay** on `/pricing` → server creates `invoices` (`pending`) + calls QPay `POST /v2/invoice` with `callback_url` pointing at our webhook (includes `invoice_id` + secret `token`).
2. User pays via QR / bank app.
3. QPay hits **`POST /api/webhooks/qpay?invoice_id=…&token=…`** (body varies). We:
   - validate `token` against `invoices.webhook_verify_token`
   - insert `billing_events` (`webhook_received`) with optional `provider_event_id` (unique when set). **Duplicate** provider IDs log `webhook_provider_duplicate_delivery` and **still run verification** (retries / late settlement).
   - call QPay **`POST /v2/payment/check`** with `object_type: INVOICE` and `object_id: <QPay invoice_id>`
4. Each provider verification increments `invoices.verification_attempt_count` and sets `last_verification_outcome` / `last_verification_at` for reconciliation and future retry jobs.
5. Only if QPay reports **PAID** and **amount/currency** match the invoice do we:
   - flip `invoices.status` to `paid` (single conditional update `where status = pending`) — **idempotent** under duplicate webhooks
   - update `subscriptions` to **`active`**, `plan_id = target_plan_id`, period fields + `last_billed_at`
   - mark the `payment_transactions` row **paid** with verification JSON
   - duplicate activations log `activation_idempotent_skip` and do not double-charge state

Webhook payload is **not** sufficient to grant access; verification is always a separate provider round-trip.

## Bootstrap vs billing-activated

- **`bootstrap_pending_billing`**: unpaid bootstrap; org may still use **assigned** `plan_id` limits (e.g. starter) — see `subscriptions/billing-lifecycle.ts` (`isBootstrapPendingBilling` vs `isBillingActivatedStatus`).
- **`active` / `trialing`**: billing-activated lifecycle states; do not conflate with bootstrap in UI or transition logic.

## Environment

| Variable | Purpose |
|----------|---------|
| `QPAY_BASE_URL` | e.g. `https://merchant-sandbox.qpay.mn` or production host |
| `QPAY_CLIENT_ID` | OAuth client id |
| `QPAY_CLIENT_SECRET` | OAuth client secret |
| `QPAY_INVOICE_CODE` | Merchant invoice code from QPay |
| `NEXT_PUBLIC_APP_URL` | Public base URL for webhook callback construction |
| `MARTECH_INTERNAL_OPS_EMAILS` | Comma-separated — internal ops + bootstrap + env mutations (see `docs/admin-auth-v1.md`) |
| `QPAY_WEBHOOK_SECRET` | Reserved for future HMAC validation (optional) |

## RLS

- Authenticated **owners** can `SELECT` their org’s `invoices`, `payment_transactions`, and `billing_events` (where `organization_id` is set).
- **No** insert/update/delete policies for these tables on the anon/authenticated roles; writes use **service role** on the server.

## Internal ops / admin billing

Canonical billing ops: **`/admin/billing`**. Transitional **`/internal/ops/billing`** overlaps. Service role reads run after server guards (`docs/admin-auth-v1.md`):

- **`/admin` overview** — health counts + recent `operator_audit_events`
- **Organizations** — subscriptions + Meta connection
- **Jobs** — recent sync/analysis + audited operator retries
- **Billing** — pending invoice reconciliation markers, **Re-verify QPay** (same path as webhook verification), plus global invoice / payment / billing event lists

See `docs/private-beta-launch.md` for deployment and ops checklist.

## Currency note

Plans are seeded with business currency (e.g. USD). QPay merchants are often settled in **MNT**. Align `plans.currency` and merchant configuration with QPay expectations before production.
