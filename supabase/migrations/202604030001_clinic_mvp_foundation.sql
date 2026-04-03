-- Clinic SaaS MVP 1 foundation
-- Keeps organizations as the tenancy root while introducing clinic operating tables.

create table if not exists public.clinic_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  address_line1 text null,
  address_line2 text null,
  district text null,
  city text not null default 'Ulaanbaatar',
  phone text null,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists clinic_locations_org_idx
  on public.clinic_locations (organization_id, status);

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid null references public.clinic_locations(id) on delete set null,
  profile_id uuid null references public.profiles(id) on delete set null,
  full_name text not null,
  role text not null
    check (role in ('owner', 'manager', 'front_desk', 'provider', 'assistant', 'billing')),
  specialty text null,
  bio text null,
  phone text null,
  email text null,
  accepts_online_booking boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_members_org_idx
  on public.staff_members (organization_id, status, role);

create index if not exists staff_members_location_idx
  on public.staff_members (location_id);

create table if not exists public.staff_availability_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  staff_member_id uuid not null references public.staff_members(id) on delete cascade,
  location_id uuid null references public.clinic_locations(id) on delete set null,
  weekday smallint not null check (weekday between 0 and 6),
  start_local time not null,
  end_local time not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_local < end_local)
);

create index if not exists staff_availability_rules_staff_idx
  on public.staff_availability_rules (staff_member_id, weekday);

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists service_categories_org_idx
  on public.service_categories (organization_id, status, sort_order);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid null references public.service_categories(id) on delete set null,
  location_id uuid null references public.clinic_locations(id) on delete set null,
  name text not null,
  slug text not null,
  description text null,
  duration_minutes integer not null check (duration_minutes > 0),
  buffer_before_minutes integer not null default 0 check (buffer_before_minutes >= 0),
  buffer_after_minutes integer not null default 0 check (buffer_after_minutes >= 0),
  price_from numeric(12, 2) not null default 0,
  currency text not null default 'MNT',
  is_bookable boolean not null default true,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists services_org_idx
  on public.services (organization_id, status, is_bookable);

create index if not exists services_category_idx
  on public.services (category_id);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  phone text null,
  email text null,
  birth_date date null,
  gender text null
    check (gender in ('female', 'male', 'other', 'prefer_not_to_say')),
  source text not null default 'manual'
    check (source in ('manual', 'online_booking', 'walk_in', 'imported')),
  tags jsonb not null default '[]',
  notes text null,
  no_show_count integer not null default 0 check (no_show_count >= 0),
  cancellation_count integer not null default 0 check (cancellation_count >= 0),
  last_visit_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patients_org_idx
  on public.patients (organization_id, created_at desc);

create index if not exists patients_phone_idx
  on public.patients (organization_id, phone);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  staff_member_id uuid null references public.staff_members(id) on delete set null,
  location_id uuid null references public.clinic_locations(id) on delete set null,
  source text not null default 'admin'
    check (source in ('admin', 'online_booking', 'walk_in')),
  status text not null default 'booked'
    check (status in ('booked', 'confirmed', 'arrived', 'in_progress', 'completed', 'canceled', 'no_show')),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  booking_notes text null,
  internal_notes text null,
  confirmation_sent_at timestamptz null,
  checked_in_at timestamptz null,
  completed_at timestamptz null,
  canceled_at timestamptz null,
  cancellation_reason text null,
  created_by_user_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end > scheduled_start)
);

create index if not exists appointments_org_time_idx
  on public.appointments (organization_id, scheduled_start desc);

create index if not exists appointments_staff_time_idx
  on public.appointments (staff_member_id, scheduled_start desc);

create index if not exists appointments_patient_idx
  on public.appointments (patient_id, scheduled_start desc);

create table if not exists public.appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  from_status text null,
  to_status text not null
    check (to_status in ('booked', 'confirmed', 'arrived', 'in_progress', 'completed', 'canceled', 'no_show')),
  changed_by_user_id uuid null references public.profiles(id) on delete set null,
  reason text null,
  created_at timestamptz not null default now()
);

create index if not exists appointment_status_history_appointment_idx
  on public.appointment_status_history (appointment_id, created_at desc);

create table if not exists public.treatment_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  staff_member_id uuid null references public.staff_members(id) on delete set null,
  subjective_notes text null,
  objective_notes text null,
  assessment_notes text null,
  plan_notes text null,
  contraindications text null,
  consent_confirmed boolean not null default false,
  follow_up_plan text null,
  before_after_asset_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists treatment_records_org_idx
  on public.treatment_records (organization_id, created_at desc);

drop trigger if exists set_clinic_locations_updated_at on public.clinic_locations;
create trigger set_clinic_locations_updated_at
  before update on public.clinic_locations
  for each row execute function public.set_updated_at();

drop trigger if exists set_staff_members_updated_at on public.staff_members;
create trigger set_staff_members_updated_at
  before update on public.staff_members
  for each row execute function public.set_updated_at();

drop trigger if exists set_staff_availability_rules_updated_at on public.staff_availability_rules;
create trigger set_staff_availability_rules_updated_at
  before update on public.staff_availability_rules
  for each row execute function public.set_updated_at();

drop trigger if exists set_service_categories_updated_at on public.service_categories;
create trigger set_service_categories_updated_at
  before update on public.service_categories
  for each row execute function public.set_updated_at();

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

drop trigger if exists set_patients_updated_at on public.patients;
create trigger set_patients_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

drop trigger if exists set_appointments_updated_at on public.appointments;
create trigger set_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

drop trigger if exists set_treatment_records_updated_at on public.treatment_records;
create trigger set_treatment_records_updated_at
  before update on public.treatment_records
  for each row execute function public.set_updated_at();

alter table public.clinic_locations enable row level security;
alter table public.staff_members enable row level security;
alter table public.staff_availability_rules enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_status_history enable row level security;
alter table public.treatment_records enable row level security;

create policy "org members can manage clinic locations"
  on public.clinic_locations
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

create policy "org members can manage staff members"
  on public.staff_members
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

create policy "org members can manage staff availability rules"
  on public.staff_availability_rules
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

create policy "org members can manage service categories"
  on public.service_categories
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

create policy "org members can manage services"
  on public.services
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

create policy "org members can manage patients"
  on public.patients
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

create policy "org members can manage appointments"
  on public.appointments
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

create policy "org members can manage appointment status history"
  on public.appointment_status_history
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

create policy "org members can manage treatment records"
  on public.treatment_records
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
