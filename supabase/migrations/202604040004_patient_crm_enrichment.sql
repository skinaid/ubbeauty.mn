alter table public.patients
  add column if not exists lifecycle_stage text not null default 'new_lead'
    check (lifecycle_stage in ('new_lead', 'consulted', 'active', 'follow_up_due', 'at_risk', 'vip', 'inactive')),
  add column if not exists allergy_notes text null,
  add column if not exists contraindication_flags text null,
  add column if not exists preferred_contact_channel text not null default 'phone'
    check (preferred_contact_channel in ('phone', 'sms', 'email', 'any')),
  add column if not exists preferred_service_id uuid null references public.services(id) on delete set null,
  add column if not exists preferred_staff_member_id uuid null references public.staff_members(id) on delete set null,
  add column if not exists follow_up_owner_id uuid null references public.staff_members(id) on delete set null;

create index if not exists patients_lifecycle_stage_idx
  on public.patients (organization_id, lifecycle_stage);

create index if not exists patients_preferred_service_idx
  on public.patients (preferred_service_id);

create index if not exists patients_preferred_staff_member_idx
  on public.patients (preferred_staff_member_id);

create index if not exists patients_follow_up_owner_idx
  on public.patients (follow_up_owner_id);
