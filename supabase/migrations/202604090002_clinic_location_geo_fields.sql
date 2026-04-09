-- ============================================================
-- Clinic Locations — geo + extended fields
-- ============================================================

alter table public.clinic_locations
  add column if not exists latitude       float8,
  add column if not exists longitude      float8,
  add column if not exists google_maps_url text,
  add column if not exists working_hours  jsonb,
  add column if not exists description    text;

comment on column public.clinic_locations.latitude        is 'GPS өргөрөг';
comment on column public.clinic_locations.longitude       is 'GPS уртраг';
comment on column public.clinic_locations.google_maps_url is 'Google Maps холбоос';
comment on column public.clinic_locations.working_hours   is 'Ажлын цаг {"mon":"09:00-18:00",...}';
comment on column public.clinic_locations.description     is 'Салбарын тайлбар';
