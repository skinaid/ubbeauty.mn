# Meta sync pipeline (Phase 5)

## Tables

- **`meta_sync_jobs`** — async-ready job records: `initial_sync`, `scheduled_sync`, `manual_sync`; statuses `queued` → `running` → `succeeded` | `failed` | `canceled`. Includes `idempotency_key`, `attempt_count`, `payload`, timestamps, `error_message`.
- **`page_daily_metrics`** — normalized daily aggregates per internal `meta_pages` row (`metric_date` unique per page). `raw_metrics` retains a compact provider snapshot; typed columns are the primary read surface.
- **`page_post_metrics`** — normalized per-post metrics; unique on (`meta_page_id`, `meta_post_id`).

Customers have **SELECT** only on these tables (RLS + `is_org_owner`). Inserts/updates run via **service role** in server modules.

## Execution flow (server-only)

1. **`enqueueMetaSyncJob`** (`modules/sync/enqueue.ts`) — creates a row (service role).
2. **`executeMetaSyncJob(jobId)`** (`modules/sync/execute-meta-sync.ts`) — loads tokens via service role, calls Meta Graph, normalizes data, upserts metrics, updates `meta_pages.last_synced_at`, finalizes job status. Failures set `status = failed` and `error_message`.

**Triggers today**

- Page **selected** → `onMetaPageSelectionChanged` (`modules/jobs/meta-sync-placeholder.ts`) enqueues `initial_sync` then calls `executeMetaSyncJob` inline (selection UX stays resilient if sync fails).
- **Manual sync** on dashboard → `manual_sync` job + execute; on success increments `usage_counters` for `manual_syncs_used` (daily key), aligned with `checkOrganizationFeatureLimit`.

## Later phases

- **Cron / queue**: dequeue jobs and invoke `executeMetaSyncJob(jobId)` without changing persistence shape.
- **AI**: consumes normalized metrics + `analysis_jobs` (not in Phase 5).
