-- Clinic POS payment capture foundation
-- Keeps a durable payment log separate from checkout header totals.

create table if not exists public.clinic_checkout_payments (
  id uuid primary key default gen_random_uuid(),
  checkout_id uuid not null references public.clinic_checkouts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'MNT',
  payment_method text not null
    check (payment_method in ('cash', 'card', 'qpay', 'bank_transfer', 'other')),
  reference_code text null,
  notes text null,
  paid_at timestamptz not null default now(),
  received_by_user_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists clinic_checkout_payments_checkout_idx
  on public.clinic_checkout_payments (checkout_id, paid_at desc);

create index if not exists clinic_checkout_payments_org_idx
  on public.clinic_checkout_payments (organization_id, paid_at desc);

alter table public.clinic_checkout_payments enable row level security;

create policy "org members can manage clinic checkout payments"
  on public.clinic_checkout_payments
  for all
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and status = 'active'
    )
  )
  with check (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and status = 'active'
    )
  );
