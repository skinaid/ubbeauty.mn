-- ============================================================
-- Clinic Logo URL — organizations table
-- ============================================================

alter table public.organizations
  add column if not exists logo_url text;

comment on column public.organizations.logo_url is 'Эмнэлгийн лого зургийн public URL (Supabase Storage)';
