# AI analysis foundation (Phase 6 + hardening)

## Layering (separation of concerns)

| Layer | Responsibility | Location |
|--------|----------------|----------|
| **Signal extraction** | Rules over normalized columns only (no `raw_metrics`, no Graph blobs) | `modules/ai/signals.ts` |
| **Metrics read** | Service-role selects with explicit column lists | `modules/ai/metrics-reader.ts` |
| **LLM input construction** | User prompt from signals + compact normalized slices | `modules/ai/llm-input-construction.ts` |
| **LLM execution** | OpenAI HTTP only | `modules/ai/llm-execution.ts` |
| **Merge / fallback** | Parse JSON, merge with rule-based recs | `modules/ai/llm-adapter.ts` |
| **Persistence** | `analysis_reports` + `recommendations` rows | `modules/ai/persist-report.ts` |
| **Job lifecycle** | Queue, idempotency, payload, status/errors | `modules/ai/enqueue-analysis.ts`, `execute-analysis-job.ts` |
| **Dashboard reads** | RLS-safe queries | `modules/ai/data.ts` |
| **Triggers** | Post-sync hook | `modules/ai/post-sync-hook.ts` |

## LLM input policy

- The model path uses **deterministic signals** and **normalized** `page_daily_metrics` / `page_post_metrics` fields only (explicit `select` lists — **`raw_metrics` is never loaded** for AI).
- Do not pass raw provider payloads into prompt construction.

## Canonical recommendations

- **`recommendations` table** is the source for filtering, prioritization, and future actions.
- **`analysis_reports.recommendations_json`** stores **`{ version, recommendation_row_ids }`** only (pointers for audit), not full recommendation blobs.

## Analysis jobs & failures

`analysis_jobs` exposes operational state explicitly:

- **`status`**: `queued` → `running` → `succeeded` | `failed`
- **`error_message`**: trimmed failure text when `failed`
- **`scheduled_at`**, **`started_at`**, **`finished_at`**, **`created_at`**
- **`source_sync_job_id`**: set when the job was triggered after a Meta sync; `null` for manual / scheduled-style runs
- **`payload`**: JSON metadata (e.g. `{ "trigger": "post_sync", "source_sync_job_id": "..." }` or `{ "trigger": "manual_regenerate" }`) — migration `202603220007_phase6_ai_hardening.sql`

## Triggers & independence from sync

- **Post-sync**: `schedulePostSyncAnalysis` → `enqueueAnalysisJobAfterSync` (idempotent per `meta_sync_jobs.id`) → `executeAnalysisJob`.
- **Regenerate without sync**: server action `regenerateAnalysisAction` → `enqueueManualRegenerateAnalysisJob` → `executeAnalysisJob` (uses metrics already in DB).
- **Future scheduling**: `enqueueScheduledAnalysisJob` reserved for cron/queue; same executor.

## History & comparison

- Each successful run creates a new `analysis_reports` row; prior `ready` rows for the page are marked **`superseded`**.
- Dashboard loads **latest `ready`** report + **`recommendations`** rows; **report history** (ready + superseded) supports over-time comparison UI.

## Configuration

- `OPENAI_API_KEY` (optional): JSON-mode narrative via `llm-execution.ts`.
- `AI_MODEL` (optional, default `gpt-4o-mini`).

## Billing

- QPay / paid plan enforcement is **out of scope**; limits use existing plan + usage counters (`generate_ai_report` entitlement).
