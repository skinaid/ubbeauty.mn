-- Phase 6: AI analysis jobs, reports, recommendations (no billing)

create table if not exists public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meta_page_id uuid not null references public.meta_pages(id) on delete cascade,
  source_sync_job_id uuid null references public.meta_sync_jobs(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  idempotency_key text not null unique,
  scheduled_at timestamptz not null default now(),
  started_at timestamptz null,
  finished_at timestamptz null,
  error_message text null,
  created_at timestamptz not null default now()
);

create table if not exists public.analysis_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meta_page_id uuid not null references public.meta_pages(id) on delete cascade,
  analysis_job_id uuid null references public.analysis_jobs(id) on delete set null,
  report_type text not null check (report_type in ('daily_summary', 'weekly_summary', 'manual_analysis')),
  status text not null default 'ready' check (status in ('ready', 'failed', 'superseded')),
  summary text not null default '',
  findings_json jsonb not null default '[]'::jsonb,
  recommendations_json jsonb not null default '[]'::jsonb,
  model_name text null,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meta_page_id uuid not null references public.meta_pages(id) on delete cascade,
  analysis_report_id uuid not null references public.analysis_reports(id) on delete cascade,
  priority text not null check (priority in ('high', 'medium', 'low')),
  category text not null check (category in ('content', 'timing', 'engagement', 'growth')),
  title text not null,
  description text not null,
  action_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analysis_jobs_org_idx on public.analysis_jobs (organization_id);
create index if not exists analysis_jobs_page_idx on public.analysis_jobs (meta_page_id);
create index if not exists analysis_jobs_status_idx on public.analysis_jobs (status);
create index if not exists analysis_jobs_sync_source_idx on public.analysis_jobs (source_sync_job_id);

create index if not exists analysis_reports_org_idx on public.analysis_reports (organization_id);
create index if not exists analysis_reports_page_idx on public.analysis_reports (meta_page_id);
create index if not exists analysis_reports_status_idx on public.analysis_reports (status);
create index if not exists analysis_reports_created_idx on public.analysis_reports (meta_page_id, created_at desc);

create index if not exists recommendations_org_idx on public.recommendations (organization_id);
create index if not exists recommendations_page_idx on public.recommendations (meta_page_id);
create index if not exists recommendations_report_idx on public.recommendations (analysis_report_id);

alter table public.analysis_jobs enable row level security;
alter table public.analysis_reports enable row level security;
alter table public.recommendations enable row level security;

create policy "analysis_jobs_select_owner_org"
on public.analysis_jobs
for select
to authenticated
using (public.is_org_owner(organization_id));

create policy "analysis_reports_select_owner_org"
on public.analysis_reports
for select
to authenticated
using (public.is_org_owner(organization_id));

create policy "recommendations_select_owner_org"
on public.recommendations
for select
to authenticated
using (public.is_org_owner(organization_id));
