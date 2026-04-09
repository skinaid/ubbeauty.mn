-- Clinic engagement automation foundation
-- Phase A: reminder + follow-up event model, queue-ready but not yet background executed.

create table if not exists public.clinic_engagement_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  appointment_id uuid null references public.appointments(id) on delete cascade,
  treatment_record_id uuid null references public.treatment_records(id) on delete cascade,
  job_type text not null
    check (
      job_type in (
        'appointment_reminder_24h',
        'appointment_reminder_2h',
        'no_show_recovery_24h',
        'follow_up_24h',
        'follow_up_7d'
      )
    ),
  channel text not null default 'manual_queue'
    check (channel in ('manual_queue', 'sms', 'email', 'call_task')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  idempotency_key text not null,
  scheduled_for timestamptz not null,
  started_at timestamptz null,
  finished_at timestamptz null,
  payload jsonb not null default '{}'::jsonb,
  outcome_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key),
  check (appointment_id is not null or treatment_record_id is not null)
);

create index if not exists clinic_engagement_jobs_org_status_idx
  on public.clinic_engagement_jobs (organization_id, status, scheduled_for);

create index if not exists clinic_engagement_jobs_patient_idx
  on public.clinic_engagement_jobs (patient_id, scheduled_for desc);

create index if not exists clinic_engagement_jobs_appointment_idx
  on public.clinic_engagement_jobs (appointment_id);

create index if not exists clinic_engagement_jobs_treatment_idx
  on public.clinic_engagement_jobs (treatment_record_id);

drop trigger if exists set_clinic_engagement_jobs_updated_at on public.clinic_engagement_jobs;
create trigger set_clinic_engagement_jobs_updated_at
  before update on public.clinic_engagement_jobs
  for each row execute function public.set_updated_at();

alter table public.clinic_engagement_jobs enable row level security;

create policy "org members can manage clinic engagement jobs"
  on public.clinic_engagement_jobs
  for all
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and status = 'active'
    )
  )
  with check (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and status = 'active'
    )
  );
