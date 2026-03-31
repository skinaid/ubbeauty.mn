-- Hardening for Phase 2 + Phase 3 before Meta integration

-- 1) Make subscription bootstrap semantics explicit for pre-billing state.
alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('bootstrap_pending_billing', 'trialing', 'active', 'past_due', 'canceled', 'expired', 'suspended'));

-- 2) Restrict direct writes that bypass transactional bootstrap flow.
drop policy if exists "organizations_insert_authenticated" on public.organizations;
drop policy if exists "organization_members_insert_self_owner_only" on public.organization_members;

-- 3) Replace multi-step org creation with one transactional RPC.
create or replace function public.create_organization_with_starter(
  target_name text,
  target_slug text
)
returns table (
  organization_id uuid,
  organization_member_id uuid,
  subscription_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  created_org_id uuid;
  created_member_id uuid;
  starter_plan_id uuid;
  created_subscription_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
  ) then
    raise exception 'organization already exists for user';
  end if;

  select id
  into starter_plan_id
  from public.plans
  where code = 'starter'
    and is_active = true
  limit 1;

  if starter_plan_id is null then
    raise exception 'starter plan not seeded';
  end if;

  insert into public.organizations (name, slug, status)
  values (trim(target_name), target_slug, 'active')
  returning id into created_org_id;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (created_org_id, auth.uid(), 'owner', 'active')
  returning id into created_member_id;

  insert into public.subscriptions (
    organization_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    trial_ends_at,
    last_billed_at
  )
  values (
    created_org_id,
    starter_plan_id,
    'bootstrap_pending_billing',
    now(),
    null,
    false,
    null,
    null
  )
  returning id into created_subscription_id;

  return query
  select created_org_id, created_member_id, created_subscription_id;
end;
$$;

revoke all on function public.create_organization_with_starter(text, text) from public;
grant execute on function public.create_organization_with_starter(text, text) to authenticated;

-- 4) Restrict bootstrap function to deterministic starter-only path.
create or replace function public.bootstrap_organization_subscription(
  target_org_id uuid,
  target_plan_code text default 'starter'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_plan_id uuid;
  created_subscription_id uuid;
begin
  if target_plan_code <> 'starter' then
    raise exception 'paid plan selection requires billing integration';
  end if;

  if not public.is_org_owner(target_org_id) then
    raise exception 'not allowed';
  end if;

  select id
  into selected_plan_id
  from public.plans
  where code = 'starter'
    and is_active = true
  limit 1;

  if selected_plan_id is null then
    raise exception 'starter plan not found';
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
    'bootstrap_pending_billing',
    now()
  )
  on conflict (organization_id) do update
  set
    plan_id = excluded.plan_id,
    status = excluded.status,
    updated_at = now()
  returning id into created_subscription_id;

  return created_subscription_id;
end;
$$;
