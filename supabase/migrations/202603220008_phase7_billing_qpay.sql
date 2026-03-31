-- Phase 7: Billing + QPay foundation (invoices, payment_transactions, billing_events)

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  target_plan_id uuid not null references public.plans (id),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null check (char_length(currency) = 3),
  status text not null check (status in ('pending', 'paid', 'expired', 'failed', 'canceled')),
  provider text not null default 'qpay' check (provider = 'qpay'),
  provider_invoice_id text null,
  provider_payment_url text null,
  qpay_sender_invoice_no text not null,
  webhook_verify_token text not null,
  issued_at timestamptz not null default now(),
  due_at timestamptz not null,
  paid_at timestamptz null,
  idempotency_key text null,
  provider_last_error text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_qpay_sender_invoice_no_key unique (qpay_sender_invoice_no)
);

create index if not exists invoices_idempotency_key_idx on public.invoices (idempotency_key)
  where idempotency_key is not null;

create index if not exists invoices_org_created_idx on public.invoices (organization_id, created_at desc);
create index if not exists invoices_org_status_idx on public.invoices (organization_id, status);
create index if not exists invoices_provider_invoice_idx on public.invoices (provider_invoice_id)
  where provider_invoice_id is not null;

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null default 'qpay',
  provider_txn_id text null,
  status text not null check (status in ('pending', 'initiated', 'paid', 'failed', 'reversed')),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null check (char_length(currency) = 3),
  raw_payload jsonb not null default '{}'::jsonb,
  verification_payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz null,
  last_verification_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_transactions_invoice_idx on public.payment_transactions (invoice_id);
create index if not exists payment_transactions_org_created_idx
  on public.payment_transactions (organization_id, created_at desc);

create unique index if not exists payment_transactions_provider_txn_uidx
  on public.payment_transactions (provider, provider_txn_id)
  where provider_txn_id is not null;

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null references public.organizations (id) on delete set null,
  invoice_id uuid null references public.invoices (id) on delete set null,
  event_type text not null,
  provider_event_id text null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz null,
  processing_error text null,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_org_created_idx on public.billing_events (organization_id, created_at desc);
create index if not exists billing_events_invoice_idx on public.billing_events (invoice_id, created_at desc);

create unique index if not exists billing_events_provider_event_uidx
  on public.billing_events (provider_event_id)
  where provider_event_id is not null;

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at
before update on public.invoices
for each row
execute function public.set_updated_at();

drop trigger if exists set_payment_transactions_updated_at on public.payment_transactions;
create trigger set_payment_transactions_updated_at
before update on public.payment_transactions
for each row
execute function public.set_updated_at();

-- RLS: owners read own org rows only; no client writes (service role bypasses RLS)
alter table public.invoices enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.billing_events enable row level security;

create policy "invoices_select_owner_org"
on public.invoices
for select
to authenticated
using (public.is_org_owner(organization_id));

create policy "payment_transactions_select_owner_org"
on public.payment_transactions
for select
to authenticated
using (public.is_org_owner(organization_id));

create policy "billing_events_select_owner_org"
on public.billing_events
for select
to authenticated
using (
  organization_id is not null
  and public.is_org_owner(organization_id)
);
