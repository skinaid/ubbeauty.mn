-- Phase 4: Meta OAuth + page connection foundation

create table if not exists public.meta_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  meta_user_id text null,
  access_token_encrypted text null,
  refresh_token_encrypted text null,
  token_expires_at timestamptz null,
  granted_scopes text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'revoked', 'error')),
  last_validated_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meta_pages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meta_connection_id uuid not null references public.meta_connections(id) on delete cascade,
  meta_page_id text not null,
  name text not null,
  category text null,
  page_access_token_encrypted text null,
  is_selectable boolean not null default true,
  is_selected boolean not null default false,
  status text not null default 'active' check (status in ('active', 'deselected', 'revoked', 'error')),
  last_synced_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, meta_page_id)
);

create index if not exists meta_connections_org_idx on public.meta_connections (organization_id);
create index if not exists meta_connections_status_idx on public.meta_connections (status);
create index if not exists meta_pages_org_idx on public.meta_pages (organization_id);
create index if not exists meta_pages_conn_idx on public.meta_pages (meta_connection_id);
create index if not exists meta_pages_selected_idx on public.meta_pages (organization_id, is_selected);

drop trigger if exists set_meta_connections_updated_at on public.meta_connections;
create trigger set_meta_connections_updated_at
before update on public.meta_connections
for each row
execute function public.set_updated_at();

drop trigger if exists set_meta_pages_updated_at on public.meta_pages;
create trigger set_meta_pages_updated_at
before update on public.meta_pages
for each row
execute function public.set_updated_at();

create or replace function public.get_plan_max_pages(target_org_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select p.max_pages
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.organization_id = target_org_id
    and s.status in ('bootstrap_pending_billing', 'trialing', 'active')
  limit 1;
$$;

create or replace function public.set_meta_page_selected(
  target_org_id uuid,
  target_meta_page_id uuid,
  target_selected boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_max_pages integer;
  selected_count integer;
begin
  if not public.is_org_owner(target_org_id) then
    raise exception 'not allowed';
  end if;

  if target_selected then
    allowed_max_pages := public.get_plan_max_pages(target_org_id);
    if allowed_max_pages is null then
      raise exception 'subscription plan not found';
    end if;

    select count(*)
    into selected_count
    from public.meta_pages mp
    where mp.organization_id = target_org_id
      and mp.is_selected = true
      and mp.status = 'active'
      and mp.id <> target_meta_page_id;

    if selected_count >= allowed_max_pages then
      raise exception 'plan page limit reached';
    end if;
  end if;

  if target_selected and exists (
    select 1
    from public.meta_pages mp
    where mp.id = target_meta_page_id
      and mp.organization_id = target_org_id
      and mp.is_selectable = false
  ) then
    raise exception 'page is not selectable';
  end if;

  update public.meta_pages mp
  set
    is_selected = target_selected,
    status = case
      when target_selected and mp.status in ('active', 'deselected') then 'active'
      when not target_selected and mp.status in ('active', 'deselected') then 'deselected'
      else mp.status
    end,
    updated_at = now()
  where mp.id = target_meta_page_id
    and mp.organization_id = target_org_id;

  if not found then
    raise exception 'meta page not found';
  end if;

  return true;
end;
$$;

revoke all on function public.set_meta_page_selected(uuid, uuid, boolean) from public;
grant execute on function public.set_meta_page_selected(uuid, uuid, boolean) to authenticated;

alter table public.meta_connections enable row level security;
alter table public.meta_pages enable row level security;

create policy "meta_connections_select_owner_org"
on public.meta_connections
for select
to authenticated
using (public.is_org_owner(organization_id));

create policy "meta_pages_select_owner_org"
on public.meta_pages
for select
to authenticated
using (public.is_org_owner(organization_id));
