-- Phase 3: Plans + Subscription foundation

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price_monthly numeric(12, 2) not null check (price_monthly >= 0),
  currency text not null check (char_length(currency) = 3),
  max_pages integer not null check (max_pages > 0),
  syncs_per_day integer not null check (syncs_per_day > 0),
  monthly_ai_reports integer not null check (monthly_ai_reports >= 0),
  report_retention_days integer not null check (report_retention_days > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired', 'suspended')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz null,
  cancel_at_period_end boolean not null default false,
  trial_ends_at timestamptz null,
  last_billed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_key text not null,
  metric_key text not null check (metric_key in ('pages_connected', 'ai_reports_generated', 'manual_syncs_used')),
  value bigint not null default 0 check (value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, period_key, metric_key)
);

create index if not exists plans_code_idx on public.plans (code);
create index if not exists plans_is_active_idx on public.plans (is_active);
create index if not exists subscriptions_plan_id_idx on public.subscriptions (plan_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);
create index if not exists usage_counters_org_period_idx on public.usage_counters (organization_id, period_key);

drop trigger if exists set_plans_updated_at on public.plans;
create trigger set_plans_updated_at
before update on public.plans
for each row
execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

drop trigger if exists set_usage_counters_updated_at on public.usage_counters;
create trigger set_usage_counters_updated_at
before update on public.usage_counters
for each row
execute function public.set_updated_at();

create or replace function public.is_org_owner(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org_id
      and om.user_id = auth.uid()
      and om.role = 'owner'
      and om.status = 'active'
  );
$$;

create or replace function public.bootstrap_organization_subscription(target_org_id uuid, target_plan_code text default 'starter')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_plan_id uuid;
  created_subscription_id uuid;
begin
  if not public.is_org_owner(target_org_id) then
    raise exception 'not allowed';
  end if;

  select id
  into selected_plan_id
  from public.plans
  where code = target_plan_code
    and is_active = true
  limit 1;

  if selected_plan_id is null then
    raise exception 'plan not found: %', target_plan_code;
  end if;

  insert into public.subscriptions (
    organization_id,
    plan_id,
    status,
    current_period_start
  )
  values (
    target_org_id,
    selected_plan_id,
    'active',
    now()
  )
  on conflict (organization_id) do update
  set
    updated_at = now()
  returning id into created_subscription_id;

  return created_subscription_id;
end;
$$;

alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;

create policy "plans_select_active_public"
on public.plans
for select
to anon, authenticated
using (is_active = true);

create policy "subscriptions_select_owner_org"
on public.subscriptions
for select
to authenticated
using (public.is_org_owner(organization_id));

create policy "usage_counters_select_owner_org"
on public.usage_counters
for select
to authenticated
using (public.is_org_owner(organization_id));
