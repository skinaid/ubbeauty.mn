alter table public.patients
  add column if not exists next_follow_up_at timestamptz null,
  add column if not exists last_contacted_at timestamptz null;

create index if not exists patients_next_follow_up_idx
  on public.patients (organization_id, next_follow_up_at desc);
