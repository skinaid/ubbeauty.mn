-- Private beta: append-only audit log for operator/support actions (service role writes only).

create table if not exists public.operator_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  action_type text not null,
  organization_id uuid null references public.organizations (id) on delete set null,
  resource_type text not null,
  resource_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists operator_audit_events_created_idx on public.operator_audit_events (created_at desc);
create index if not exists operator_audit_events_org_idx on public.operator_audit_events (organization_id, created_at desc);
create index if not exists operator_audit_events_action_idx on public.operator_audit_events (action_type, created_at desc);

comment on table public.operator_audit_events is 'Support/operator actions (reverify, job retries). No client RLS policies — reads via service role in internal tools only.';

alter table public.operator_audit_events enable row level security;
