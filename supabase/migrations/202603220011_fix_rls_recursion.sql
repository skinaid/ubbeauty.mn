-- Fix: RLS infinite recursion (42P17) on organization_members self-referencing policy.
-- Solution: use SECURITY DEFINER helper that bypasses RLS for membership checks.

create or replace function public.is_org_member(target_org_id uuid)
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
      and om.status = 'active'
  );
$$;

-- 1) Fix organization_members: replace self-referencing policy
drop policy if exists "organization_members_select_same_org" on public.organization_members;
create policy "organization_members_select_same_org"
on public.organization_members
for select
using (public.is_org_member(organization_id));

-- 2) Fix organizations SELECT: use SECURITY DEFINER function
drop policy if exists "organizations_select_member_orgs" on public.organizations;
create policy "organizations_select_member_orgs"
on public.organizations
for select
using (public.is_org_member(id));

-- 3) Fix organizations UPDATE: use existing is_org_owner (already SECURITY DEFINER)
drop policy if exists "organizations_update_owner" on public.organizations;
create policy "organizations_update_owner"
on public.organizations
for update
using (public.is_org_owner(id))
with check (public.is_org_owner(id));
