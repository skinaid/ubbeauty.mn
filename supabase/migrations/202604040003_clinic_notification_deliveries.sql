create table if not exists public.clinic_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  engagement_job_id uuid not null references public.clinic_engagement_jobs(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  channel text not null,
  provider text not null,
  recipient text,
  subject text,
  body_preview text,
  status text not null default 'queued',
  provider_message_id text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  error_message text,
  attempted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_clinic_notification_deliveries_org_attempted
  on public.clinic_notification_deliveries (organization_id, attempted_at desc);

create index if not exists idx_clinic_notification_deliveries_job
  on public.clinic_notification_deliveries (engagement_job_id, attempted_at desc);

create index if not exists idx_clinic_notification_deliveries_patient
  on public.clinic_notification_deliveries (patient_id, attempted_at desc);
