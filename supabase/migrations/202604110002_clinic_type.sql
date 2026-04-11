-- ============================================================
-- Clinic Type — organizations table
-- ============================================================

alter table public.organizations
  add column if not exists clinic_type text;

comment on column public.organizations.clinic_type is 'Эмнэлгийн төрөл (арьс гоо засал, арьсны өвчин, харилцааны эмнэлэг г.м.)';
