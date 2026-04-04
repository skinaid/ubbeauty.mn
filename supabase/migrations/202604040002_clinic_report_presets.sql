create table if not exists public.clinic_report_presets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  range_preset text not null default 'today',
  start_date date null,
  end_date date null,
  provider_filter text not null default 'all',
  location_filter text not null default 'all',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists clinic_report_presets_org_user_idx
  on public.clinic_report_presets (organization_id, user_id, created_at desc);

create unique index if not exists clinic_report_presets_org_user_name_idx
  on public.clinic_report_presets (organization_id, user_id, lower(name));

alter table public.clinic_report_presets enable row level security;

create policy "clinic_report_presets_select_own"
  on public.clinic_report_presets
  for select
  using (auth.uid() = user_id);

create policy "clinic_report_presets_insert_own"
  on public.clinic_report_presets
  for insert
  with check (auth.uid() = user_id);

create policy "clinic_report_presets_update_own"
  on public.clinic_report_presets
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "clinic_report_presets_delete_own"
  on public.clinic_report_presets
  for delete
  using (auth.uid() = user_id);
