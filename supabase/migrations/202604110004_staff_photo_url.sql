alter table public.staff_members
  add column if not exists photo_url text;

comment on column public.staff_members.photo_url is 'Ажилтны профайл зурагны URL';
