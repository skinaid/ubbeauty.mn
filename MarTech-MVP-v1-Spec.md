# MarTech MVP v1 Spec

## 1) Product Scope

### Product summary
MarTech is a SaaS product for small-to-mid organizations that want to connect a Meta account, select one or more Facebook Pages, import page insight data through the Meta Graph API, and receive AI-generated recommendations.

### MVP goals
- Support up to **1000 organizations** reliably.
- Each organization has **exactly 1 owner user** in v1.
- Allow the owner to:
  - sign in
  - connect Meta
  - select page(s)
  - sync insights
  - view dashboard trends
  - get AI recommendations
  - subscribe and pay monthly via QPay
- Provide internal admin visibility for operations, sync health, billing health, and failures.

### Core user journey
1. User signs up / signs in.
2. User creates an organization.
3. User connects Meta account via OAuth.
4. System fetches available Meta pages.
5. User selects allowed page(s) based on plan.
6. System starts initial async sync.
7. Data is normalized and stored.
8. AI report is generated asynchronously.
9. User sees dashboard + recommendations.
10. User subscribes or upgrades via QPay.

### MVP customer constraints
- **1 organization = 1 owner user**
- No multi-user collaboration in v1
- No custom roles in v1
- Subscription is **organization-level**
- Billing is **monthly**
- Sync runs asynchronously only
- Manual refresh allowed within quota/rate rules

### MVP features in scope
- Auth (Supabase Auth)
- Organization creation
- Single owner membership model
- Meta OAuth connection
- Meta page listing + selection
- Async page insight sync
- Dashboard with key metrics
- AI-generated summary + recommendations
- Monthly QPay billing
- Plan/quota enforcement
- Internal admin observability panel

### Out of scope for v1
- Multiple members per organization
- Advanced RBAC
- Instagram, Ads, competitor tracking
- Custom report builder
- Multi-currency billing
- Advanced invoicing/tax engine
- Enterprise SSO
- Real-time sync
- White-labeling

### Suggested plans for v1
#### Starter
- 1 organization
- 1 page
- Daily sync
- Basic AI recommendations

#### Growth
- Up to 5 pages
- More frequent sync
- Full report history
- Advanced AI recommendations

#### Agency (optional later in v1.1/v2)
- Higher page limits
- Better sync priority
- Export/report tools

---

## 2) Architecture

### High-level architecture
- **Frontend**: Next.js app
- **Auth + Database**: Supabase
- **Background jobs**: app worker / scheduled jobs
- **External integration**: Meta Graph API
- **Billing**: QPay integration
- **AI layer**: LLM provider for recommendations
- **Admin ops**: internal dashboard + logs + job visibility

### Logical components
#### A. Web app
Responsible for:
- auth UI
- org setup
- Meta connect flow
- page selection
- dashboard rendering
- billing UI
- manual sync actions

#### B. API/backend layer
Responsible for:
- organization lifecycle
- subscription checks
- entitlement checks
- QPay invoice creation
- webhook validation
- secure Meta token handling
- admin endpoints

#### C. Meta integration service
Responsible for:
- OAuth callback handling
- page discovery
- token status tracking
- page insight fetches
- retry behavior
- normalization of external data

#### D. Sync job system
Responsible for async execution of:
- initial page sync
- scheduled sync
- manual refresh sync
- metrics recompute jobs
- AI report generation
- billing reconciliation jobs
- subscription expiry checks

#### E. AI analysis pipeline
Responsible for:
- consuming normalized metrics
- producing structured findings
- generating human-readable recommendations
- storing reports for dashboard display

#### F. Billing subsystem
Responsible for:
- plan selection
- invoice creation
- QPay payment initiation
- webhook receipt
- payment verification
- subscription activation/renewal
- failed payment handling
- reconciliation

#### G. Admin observability
Responsible for:
- org-level status visibility
- sync/job failure visibility
- billing/payment visibility
- connection/token health
- manual retry tools

### Recommended system flow
#### 1. Auth flow
- User signs in with Supabase Auth.
- A `profiles` record is created.
- User creates an `organization`.
- System creates `organization_members` with role=`owner`.

#### 2. Meta connect flow
- User initiates Meta OAuth.
- App receives callback and stores connection details securely.
- System fetches accessible pages.
- User selects page(s).
- Initial sync job(s) are enqueued.

#### 3. Sync flow
- Job runner picks `initial_page_sync` or `scheduled_page_sync`.
- Calls Meta Graph API.
- Stores normalized metrics.
- Updates current page sync state.
- Enqueues `generate_ai_report`.

#### 4. AI flow
- AI job reads latest normalized metrics.
- Produces summary, findings, and recommendations.
- Saves `analysis_reports` and `recommendations`.
- Dashboard shows latest completed report.

#### 5. Billing flow
- User chooses plan.
- System creates invoice.
- QPay payment request is generated.
- User pays.
- Webhook arrives.
- System verifies payment.
- Subscription is activated/renewed.
- Entitlements are updated.

### Reliability principles
- Async jobs for all long-running tasks
- Idempotent webhook processing
- Retry with exponential backoff
- Rate-limit aware Meta sync scheduling
- Separation of current state vs history
- Graceful degradation when sync/AI fails
- Admin visibility for failures and retries

### Capacity assumptions for MVP
Assuming:
- 1000 organizations
- average 1 page each in early phase
- 1–4 scheduled syncs per day

Estimated daily sync load:
- 1000 to 4000 sync jobs/day

This is manageable if:
- sync timing is distributed (not all at once)
- jobs are queued
- Meta API calls are rate-limited and retried safely
- AI generation is asynchronous and optionally throttled

---

## 3) Database Schema

Below is the recommended v1 logical schema.

### A. Identity and organization
#### `profiles`
- `id` uuid pk (references auth user)
- `email` text
- `full_name` text null
- `avatar_url` text null
- `created_at` timestamptz
- `updated_at` timestamptz

#### `organizations`
- `id` uuid pk
- `name` text
- `slug` text unique
- `status` text (`active`, `suspended`, `canceled`)
- `created_at` timestamptz
- `updated_at` timestamptz

#### `organization_members`
- `id` uuid pk
- `organization_id` uuid fk
- `user_id` uuid fk -> profiles.id
- `role` text (`owner` only in v1)
- `status` text (`active`, `inactive`)
- `created_at` timestamptz
- unique (`organization_id`, `user_id`)

**Business rule:** enforce max 1 active owner per organization in app logic and/or database constraint strategy.

### B. Plans, subscriptions, usage
#### `plans`
- `id` uuid pk
- `code` text unique
- `name` text
- `price_monthly` numeric
- `currency` text
- `max_pages` integer
- `syncs_per_day` integer
- `monthly_ai_reports` integer
- `report_retention_days` integer
- `is_active` boolean

#### `subscriptions`
- `id` uuid pk
- `organization_id` uuid fk unique
- `plan_id` uuid fk
- `status` text (`trialing`, `active`, `past_due`, `canceled`, `expired`, `suspended`)
- `current_period_start` timestamptz
- `current_period_end` timestamptz
- `cancel_at_period_end` boolean
- `trial_ends_at` timestamptz null
- `last_billed_at` timestamptz null
- `created_at` timestamptz
- `updated_at` timestamptz

#### `usage_counters`
- `id` uuid pk
- `organization_id` uuid fk
- `period_key` text
- `metric_key` text (`pages_connected`, `ai_reports_generated`, `manual_syncs_used`)
- `value` bigint
- `updated_at` timestamptz
- unique (`organization_id`, `period_key`, `metric_key`)

### C. Billing
#### `invoices`
- `id` uuid pk
- `organization_id` uuid fk
- `subscription_id` uuid fk
- `amount` numeric
- `currency` text
- `status` text (`pending`, `paid`, `expired`, `failed`, `canceled`)
- `provider` text (`qpay`)
- `provider_invoice_id` text null
- `provider_payment_url` text null
- `issued_at` timestamptz
- `due_at` timestamptz
- `paid_at` timestamptz null
- `created_at` timestamptz

#### `payment_transactions`
- `id` uuid pk
- `invoice_id` uuid fk
- `organization_id` uuid fk
- `provider` text
- `provider_txn_id` text null
- `status` text (`pending`, `paid`, `failed`, `reversed`)
- `amount` numeric
- `currency` text
- `raw_payload` jsonb
- `processed_at` timestamptz null
- `created_at` timestamptz

#### `billing_events`
- `id` uuid pk
- `organization_id` uuid fk null
- `invoice_id` uuid fk null
- `event_type` text
- `provider_event_id` text null
- `payload` jsonb
- `processed_at` timestamptz null
- `created_at` timestamptz
- unique (`provider_event_id`) where applicable

### D. Meta integration
#### `meta_connections`
- `id` uuid pk
- `organization_id` uuid fk unique
- `meta_user_id` text
- `access_token_encrypted` text
- `refresh_token_encrypted` text null
- `token_expires_at` timestamptz null
- `granted_scopes` text[]
- `status` text (`active`, `expired`, `revoked`, `error`)
- `last_validated_at` timestamptz null
- `created_at` timestamptz
- `updated_at` timestamptz

#### `meta_pages`
- `id` uuid pk
- `organization_id` uuid fk
- `meta_connection_id` uuid fk
- `meta_page_id` text
- `name` text
- `category` text null
- `page_access_token_encrypted` text null
- `is_selected` boolean
- `status` text (`active`, `deselected`, `revoked`, `error`)
- `last_synced_at` timestamptz null
- `created_at` timestamptz
- `updated_at` timestamptz
- unique (`organization_id`, `meta_page_id`)

### E. Sync and job processing
#### `meta_sync_jobs`
- `id` uuid pk
- `organization_id` uuid fk
- `meta_page_id` uuid fk -> meta_pages.id
- `job_type` text (`initial_sync`, `scheduled_sync`, `manual_sync`)
- `status` text (`queued`, `running`, `succeeded`, `failed`, `canceled`)
- `attempt_count` integer
- `idempotency_key` text
- `scheduled_at` timestamptz
- `started_at` timestamptz null
- `finished_at` timestamptz null
- `error_message` text null
- `payload` jsonb
- `created_at` timestamptz
- unique (`idempotency_key`)

#### `analysis_jobs`
- `id` uuid pk
- `organization_id` uuid fk
- `meta_page_id` uuid fk -> meta_pages.id
- `source_sync_job_id` uuid fk -> meta_sync_jobs.id null
- `status` text (`queued`, `running`, `succeeded`, `failed`)
- `attempt_count` integer
- `idempotency_key` text
- `scheduled_at` timestamptz
- `started_at` timestamptz null
- `finished_at` timestamptz null
- `error_message` text null
- `created_at` timestamptz
- unique (`idempotency_key`)

### F. Metrics and analytics
#### `page_daily_metrics`
- `id` uuid pk
- `organization_id` uuid fk
- `meta_page_id` uuid fk -> meta_pages.id
- `metric_date` date
- `followers_count` integer null
- `follower_delta` integer null
- `reach` integer null
- `impressions` integer null
- `engaged_users` integer null
- `post_count` integer null
- `engagement_rate` numeric null
- `raw_metrics` jsonb
- `created_at` timestamptz
- unique (`meta_page_id`, `metric_date`)

#### `page_post_metrics`
- `id` uuid pk
- `organization_id` uuid fk
- `meta_page_id` uuid fk -> meta_pages.id
- `meta_post_id` text
- `post_created_at` timestamptz
- `message_excerpt` text null
- `post_type` text null
- `reach` integer null
- `impressions` integer null
- `engagements` integer null
- `reactions` integer null
- `comments` integer null
- `shares` integer null
- `clicks` integer null
- `raw_metrics` jsonb
- `created_at` timestamptz
- `updated_at` timestamptz
- unique (`meta_page_id`, `meta_post_id`)

#### `metrics_rollups`
- `id` uuid pk
- `organization_id` uuid fk
- `meta_page_id` uuid fk -> meta_pages.id
- `window_key` text (`7d`, `30d`, `90d`)
- `computed_at` timestamptz
- `summary_json` jsonb
- unique (`meta_page_id`, `window_key`)

### G. AI reporting
#### `analysis_reports`
- `id` uuid pk
- `organization_id` uuid fk
- `meta_page_id` uuid fk -> meta_pages.id
- `analysis_job_id` uuid fk -> analysis_jobs.id null
- `report_type` text (`daily_summary`, `weekly_summary`, `manual_analysis`)
- `status` text (`ready`, `failed`, `superseded`)
- `summary` text
- `findings_json` jsonb
- `recommendations_json` jsonb
- `model_name` text null
- `created_at` timestamptz

#### `recommendations`
- `id` uuid pk
- `organization_id` uuid fk
- `meta_page_id` uuid fk -> meta_pages.id
- `analysis_report_id` uuid fk
- `priority` text (`high`, `medium`, `low`)
- `category` text (`content`, `timing`, `engagement`, `growth`)
- `title` text
- `description` text
- `action_items` jsonb
- `created_at` timestamptz

### H. Observability and admin ops
#### `webhook_events`
- `id` uuid pk
- `source` text (`qpay`, `meta`)
- `external_event_id` text null
- `status` text (`received`, `processed`, `ignored`, `failed`)
- `payload` jsonb
- `error_message` text null
- `created_at` timestamptz
- `processed_at` timestamptz null
- unique (`source`, `external_event_id`) where applicable

#### `audit_logs`
- `id` uuid pk
- `organization_id` uuid fk null
- `actor_user_id` uuid fk -> profiles.id null
- `action` text
- `target_type` text
- `target_id` text null
- `metadata` jsonb
- `created_at` timestamptz

#### `system_alerts`
- `id` uuid pk
- `severity` text (`info`, `warning`, `critical`)
- `source` text (`sync`, `billing`, `meta_connection`, `analysis`)
- `organization_id` uuid fk null
- `message` text
- `status` text (`open`, `acknowledged`, `resolved`)
- `created_at` timestamptz
- `resolved_at` timestamptz null

### Security and access notes
- Use Supabase RLS for tenant isolation by `organization_id`.
- In v1, customer-facing access rules are simple because there is only one owner user per org.
- Service-role access is reserved for:
  - webhooks
  - background sync jobs
  - AI generation
  - admin internal tools
- Store tokens encrypted; never expose provider tokens to frontend.

---

## 4) Folder Structure

Recommended project structure:

```text
Martech/
├─ docs/
│  ├─ architecture.md
│  ├─ product-scope.md
│  ├─ database-schema.md
│  ├─ meta-integration.md
│  ├─ billing-qpay.md
│  ├─ ai-analysis.md
│  ├─ admin-observability.md
│  └─ build-order.md
├─ src/
│  ├─ app/
│  │  ├─ (public)/
│  │  │  ├─ login/
│  │  │  └─ pricing/
│  │  ├─ (dashboard)/
│  │  │  ├─ dashboard/
│  │  │  ├─ settings/
│  │  │  ├─ billing/
│  │  │  └─ pages/
│  │  ├─ api/
│  │  │  ├─ meta/
│  │  │  │  ├─ connect/
│  │  │  │  ├─ callback/
│  │  │  │  └─ sync/
│  │  │  ├─ qpay/
│  │  │  │  ├─ create-invoice/
│  │  │  │  └─ webhook/
│  │  │  ├─ reports/
│  │  │  └─ admin/
│  │  └─ layout.tsx
│  ├─ modules/
│  │  ├─ auth/
│  │  ├─ organizations/
│  │  ├─ subscriptions/
│  │  ├─ billing/
│  │  ├─ meta/
│  │  ├─ analytics/
│  │  ├─ ai/
│  │  ├─ jobs/
│  │  └─ admin/
│  ├─ components/
│  │  ├─ dashboard/
│  │  ├─ billing/
│  │  ├─ meta/
│  │  └─ ui/
│  ├─ lib/
│  │  ├─ supabase/
│  │  ├─ qpay/
│  │  ├─ meta/
│  │  ├─ ai/
│  │  ├─ jobs/
│  │  ├─ auth/
│  │  ├─ env/
│  │  ├─ logging/
│  │  └─ utils/
│  ├─ types/
│  └─ config/
├─ supabase/
│  ├─ migrations/
│  ├─ seeds/
│  └─ functions/
├─ scripts/
│  ├─ seed-dev.ts
│  ├─ run-sync.ts
│  ├─ recompute-rollups.ts
│  └─ reconcile-billing.ts
├─ tests/
│  ├─ integration/
│  ├─ unit/
│  └─ e2e/
├─ .env.example
├─ package.json
├─ README.md
└─ roadmap.md
```

### Folder responsibilities
- `docs/`: source of truth for architecture and decisions
- `src/modules/`: domain-oriented business logic
- `src/lib/`: shared infrastructure adapters/clients
- `supabase/migrations/`: schema evolution and SQL policies
- `scripts/`: operational scripts and local tools
- `tests/`: unit/integration/e2e coverage

---

## 5) Build Order

The build order below is optimized for Variant A workflow:
- OpenClaw = planner/reviewer
- Cursor = implementer

### Phase 0 — Spec lock
1. Finalize MVP scope
2. Finalize domain model
3. Finalize table list
4. Finalize billing assumptions
5. Finalize page limits and sync frequency per plan

**Output:** approved spec docs

### Phase 1 — Project bootstrap
1. Create Next.js project
2. Configure TypeScript, linting, formatting
3. Set up environment management
4. Set up Supabase project connection
5. Add base docs and README

**Output:** runnable app skeleton

### Phase 2 — Auth + organization foundation
1. Implement Supabase Auth
2. Create `profiles`
3. Create `organizations`
4. Create `organization_members`
5. Enforce single-owner org rule
6. Add protected dashboard shell
7. Add tenant-aware data access basics

**Output:** user can sign in and create an organization

### Phase 3 — Plans + subscription foundation
1. Create `plans`
2. Create `subscriptions`
3. Create `usage_counters`
4. Seed starter/growth plans
5. Build entitlement helper logic
6. Add pricing/billing settings page shell

**Output:** app understands org subscription state and limits

### Phase 4 — Meta OAuth integration
1. Implement Meta OAuth start/callback flow
2. Create `meta_connections`
3. Securely store tokens
4. Fetch accessible pages
5. Create `meta_pages`
6. Build page selection UI
7. Validate page limits against plan

**Output:** org can connect Meta and select pages

### Phase 5 — Sync jobs pipeline
1. Create `meta_sync_jobs`
2. Build job enqueue logic
3. Build worker execution path
4. Implement initial sync
5. Implement scheduled sync
6. Implement manual sync
7. Add retry/backoff/idempotency
8. Update page sync status fields

**Output:** system can fetch and store Meta data asynchronously

### Phase 6 — Metrics storage and dashboard
1. Create `page_daily_metrics`
2. Create `page_post_metrics`
3. Create `metrics_rollups`
4. Normalize incoming Meta data
5. Build dashboard summary cards
6. Build trend charts
7. Build top-posts section
8. Show latest sync status

**Output:** working metrics dashboard

### Phase 7 — AI recommendation engine
1. Create `analysis_jobs`
2. Create `analysis_reports`
3. Create `recommendations`
4. Build structured analysis pipeline
5. Add AI report generation job
6. Build report rendering UI
7. Add regenerate/report history support if needed

**Output:** users receive actionable AI recommendations from synced data

### Phase 8 — QPay billing
1. Create `invoices`
2. Create `payment_transactions`
3. Create `billing_events`
4. Build invoice creation endpoint
5. Build QPay payment initiation flow
6. Build webhook receiver
7. Implement payment verification
8. Activate/renew subscriptions on verified payment
9. Add failed/expired payment handling

**Output:** orgs can subscribe and pay monthly

### Phase 9 — Observability and admin tools
1. Create `webhook_events`
2. Create `audit_logs`
3. Create `system_alerts`
4. Build internal admin views for:
   - organizations
   - subscriptions
   - sync health
   - billing health
   - failed jobs
5. Add manual retry actions where safe

**Output:** internal admin can monitor system health

### Phase 10 — Reliability hardening
1. Add RLS policies
2. Add deduplication constraints
3. Add better error handling
4. Add timeout guards
5. Add schedule spreading/jitter for syncs
6. Add reconciliation jobs
7. Add token validation checks
8. Add stale-connection alerts
9. Add usage-limit enforcement everywhere

**Output:** MVP becomes production-safe for real customers

### Phase 11 — QA and release readiness
1. End-to-end test core flows
2. Test webhook duplication
3. Test failed sync retries
4. Test expired token behavior
5. Test unpaid subscription behavior
6. Test plan-limit enforcement
7. Prepare seed/demo data
8. Write deployment checklist
9. Release private beta

**Output:** v1 launch candidate

---

## Final recommendation
Do **not** start by coding billing or AI first.

Start in this exact order:
1. auth + organization
2. plans/subscription base
3. Meta connect
4. async sync
5. dashboard
6. AI reports
7. QPay
8. admin observability
9. hardening

That order gives the fastest path to a usable and stable MarTech MVP.
