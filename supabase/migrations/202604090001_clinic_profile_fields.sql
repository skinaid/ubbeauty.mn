-- ============================================================
-- Clinic Profile Fields — organizations table enrichment
-- ============================================================

alter table public.organizations
  add column if not exists description        text,
  add column if not exists tagline            text,
  add column if not exists phone              text,
  add column if not exists website            text,
  add column if not exists address            text,
  add column if not exists city               text,
  add column if not exists working_hours      jsonb,
  add column if not exists services_summary   text[],
  add column if not exists social_instagram   text,
  add column if not exists social_facebook    text,
  add column if not exists founded_year       integer,
  add column if not exists staff_count        integer,
  add column if not exists profile_completed  boolean not null default false;

comment on column public.organizations.description      is 'Эмнэлгийн дэлгэрэнгүй тайлбар';
comment on column public.organizations.tagline          is 'Богино уриа үг';
comment on column public.organizations.phone            is 'Холбоо барих утас';
comment on column public.organizations.website          is 'Вебсайтын хаяг';
comment on column public.organizations.address          is 'Байршлын хаяг';
comment on column public.organizations.city             is 'Хот/Дүүрэг';
comment on column public.organizations.working_hours    is 'Ажлын цаг {"mon":"09:00-18:00",...}';
comment on column public.organizations.services_summary is 'Үйлчилгээний жагсаалт';
comment on column public.organizations.social_instagram is 'Instagram хаяг';
comment on column public.organizations.social_facebook  is 'Facebook хаяг';
comment on column public.organizations.founded_year     is 'Үүсгэн байгуулагдсан он';
comment on column public.organizations.staff_count      is 'Ажилтны тоо';
comment on column public.organizations.profile_completed is 'Профайл бүрэн бөглөгдсөн эсэх';
