create table public.clinic_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index on public.clinic_photos(organization_id, sort_order);

alter table public.clinic_photos enable row level security;

create policy "org members manage photos"
  on public.clinic_photos
  for all
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and status = 'active'
    )
  );
