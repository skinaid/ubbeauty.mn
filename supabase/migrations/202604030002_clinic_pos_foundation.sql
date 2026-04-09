-- Clinic POS foundation
-- Separate from platform subscription billing.

create table if not exists public.clinic_checkouts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  treatment_record_id uuid null references public.treatment_records(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'paid', 'voided')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'partial', 'paid')),
  subtotal numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  currency text not null default 'MNT',
  notes text null,
  created_by_user_id uuid null references public.profiles(id) on delete set null,
  paid_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clinic_checkouts_org_idx
  on public.clinic_checkouts (organization_id, created_at desc);

create index if not exists clinic_checkouts_status_idx
  on public.clinic_checkouts (organization_id, status, payment_status);

create table if not exists public.clinic_checkout_items (
  id uuid primary key default gen_random_uuid(),
  checkout_id uuid not null references public.clinic_checkouts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id uuid null references public.services(id) on delete set null,
  treatment_record_id uuid null references public.treatment_records(id) on delete set null,
  item_type text not null default 'service'
    check (item_type in ('service', 'add_on', 'product', 'adjustment')),
  label text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists clinic_checkout_items_checkout_idx
  on public.clinic_checkout_items (checkout_id, created_at asc);

drop trigger if exists set_clinic_checkouts_updated_at on public.clinic_checkouts;
create trigger set_clinic_checkouts_updated_at
  before update on public.clinic_checkouts
  for each row execute function public.set_updated_at();

alter table public.clinic_checkouts enable row level security;
alter table public.clinic_checkout_items enable row level security;

create policy "org members can manage clinic checkouts"
  on public.clinic_checkouts
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

create policy "org members can manage clinic checkout items"
  on public.clinic_checkout_items
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
