-- Phase 5: Meta sync pipeline + normalized metrics (no AI)

create table if not exists public.meta_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meta_page_id uuid not null references public.meta_pages(id) on delete cascade,
  job_type text not null check (job_type in ('initial_sync', 'scheduled_sync', 'manual_sync')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  idempotency_key text not null unique,
  scheduled_at timestamptz not null default now(),
  started_at timestamptz null,
  finished_at timestamptz null,
  error_message text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.page_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meta_page_id uuid not null references public.meta_pages(id) on delete cascade,
  metric_date date not null,
  followers_count integer null,
  follower_delta integer null,
  reach integer null,
  impressions integer null,
  engaged_users integer null,
  post_count integer null,
  engagement_rate numeric null,
  raw_metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (meta_page_id, metric_date)
);

create table if not exists public.page_post_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meta_page_id uuid not null references public.meta_pages(id) on delete cascade,
  meta_post_id text not null,
  post_created_at timestamptz not null,
  message_excerpt text null,
  post_type text null,
  reach integer null,
  impressions integer null,
  engagements integer null,
  reactions integer null,
  comments integer null,
  shares integer null,
  clicks integer null,
  raw_metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meta_page_id, meta_post_id)
);

create index if not exists meta_sync_jobs_org_idx on public.meta_sync_jobs (organization_id);
create index if not exists meta_sync_jobs_page_idx on public.meta_sync_jobs (meta_page_id);
create index if not exists meta_sync_jobs_status_idx on public.meta_sync_jobs (status);
create index if not exists meta_sync_jobs_scheduled_idx on public.meta_sync_jobs (scheduled_at);

create index if not exists page_daily_metrics_org_idx on public.page_daily_metrics (organization_id);
create index if not exists page_daily_metrics_page_date_idx on public.page_daily_metrics (meta_page_id, metric_date desc);

create index if not exists page_post_metrics_org_idx on public.page_post_metrics (organization_id);
create index if not exists page_post_metrics_page_idx on public.page_post_metrics (meta_page_id);

drop trigger if exists set_page_post_metrics_updated_at on public.page_post_metrics;
create trigger set_page_post_metrics_updated_at
before update on public.page_post_metrics
for each row
execute function public.set_updated_at();

alter table public.meta_sync_jobs enable row level security;
alter table public.page_daily_metrics enable row level security;
alter table public.page_post_metrics enable row level security;

create policy "meta_sync_jobs_select_owner_org"
on public.meta_sync_jobs
for select
to authenticated
using (public.is_org_owner(organization_id));

create policy "page_daily_metrics_select_owner_org"
on public.page_daily_metrics
for select
to authenticated
using (public.is_org_owner(organization_id));

create policy "page_post_metrics_select_owner_org"
on public.page_post_metrics
for select
to authenticated
using (public.is_org_owner(organization_id));
