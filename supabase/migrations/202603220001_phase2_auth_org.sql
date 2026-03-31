-- Phase 2: Auth + Organization foundation

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text null,
  avatar_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role = 'owner'),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (user_id)
);

create unique index if not exists organization_members_one_active_owner_per_org_idx
  on public.organization_members (organization_id)
  where role = 'owner' and status = 'active';

create index if not exists organization_members_user_id_idx
  on public.organization_members (user_id);

create index if not exists organization_members_organization_id_idx
  on public.organization_members (organization_id);

create index if not exists organizations_slug_idx
  on public.organizations (slug);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_organizations_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_auth_user_created();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "organizations_select_member_orgs"
on public.organizations
for select
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = organizations.id
      and om.user_id = auth.uid()
      and om.status = 'active'
  )
);

create policy "organizations_insert_authenticated"
on public.organizations
for insert
to authenticated
with check (true);

create policy "organizations_update_owner"
on public.organizations
for update
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = organizations.id
      and om.user_id = auth.uid()
      and om.role = 'owner'
      and om.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = organizations.id
      and om.user_id = auth.uid()
      and om.role = 'owner'
      and om.status = 'active'
  )
);

create policy "organization_members_select_same_org"
on public.organization_members
for select
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = organization_members.organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  )
);

create policy "organization_members_insert_self_owner_only"
on public.organization_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'owner'
);
