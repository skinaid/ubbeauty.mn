-- Phase 6 hardening: job payload for triggers / future scheduling; explicit operational metadata

alter table public.analysis_jobs
  add column if not exists payload jsonb not null default '{}'::jsonb;

create index if not exists analysis_jobs_created_idx on public.analysis_jobs (meta_page_id, created_at desc);
