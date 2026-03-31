-- Phase: Brand Visual Strategy
-- Storage bucket + brand_visual_assets metadata table + design_tokens JSONB

-- ============================================================
-- 1. Storage bucket: brand-assets
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-assets',
  'brand-assets',
  false,
  52428800, -- 50 MB per file
  array[
    'image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif',
    'application/pdf',
    'application/zip', 'application/x-zip-compressed',
    'font/ttf', 'font/otf', 'font/woff', 'font/woff2',
    'application/octet-stream' -- fallback for some font mimes
  ]
)
on conflict (id) do nothing;

-- ============================================================
-- 2. Storage RLS policies — org members only
-- ============================================================

-- SELECT: read own org's files
create policy "org members can read brand assets"
  on storage.objects for select
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] in (
      select organization_id::text
      from public.organization_members
      where user_id = auth.uid()
    )
  );

-- INSERT: upload to own org folder
create policy "org members can upload brand assets"
  on storage.objects for insert
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] in (
      select organization_id::text
      from public.organization_members
      where user_id = auth.uid()
    )
  );

-- DELETE: remove own org's files
create policy "org members can delete brand assets"
  on storage.objects for delete
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] in (
      select organization_id::text
      from public.organization_members
      where user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. brand_visual_assets — file metadata
-- ============================================================
create table if not exists public.brand_visual_assets (
  id                  uuid primary key default gen_random_uuid(),
  brand_manager_id    uuid not null references public.brand_managers(id) on delete cascade,
  organization_id     uuid not null references public.organizations(id) on delete cascade,

  -- Asset classification
  asset_type          text not null check (asset_type in (
                        'logo',           -- Logo variants
                        'color_palette',  -- Color swatch/palette file
                        'typography',     -- Font files
                        'pattern',        -- Background patterns, textures
                        'icon_set',       -- Icon collection
                        'photo',          -- Brand photography
                        'illustration',   -- Brand illustrations
                        'brandbook',      -- Full brandbook PDF
                        'guideline',      -- Usage guideline PDF/doc
                        'mockup',         -- Product/brand mockups
                        'inspiration',    -- Mood board, reference
                        'other'
                      )),

  -- Sub-classification
  asset_tag           text null, -- e.g. 'primary', 'dark', 'horizontal', 'icon-only'
  usage_context       text null, -- e.g. 'digital', 'print', 'social', 'all'

  -- File info
  file_name           text not null,
  file_path           text not null,  -- storage path: {org_id}/{bm_id}/{asset_type}/{uuid}.{ext}
  file_size           bigint not null default 0,
  mime_type           text not null,
  width_px            integer null,
  height_px           integer null,

  -- Visual metadata (extracted / manually entered)
  extracted_colors    text[] null,      -- hex codes extracted from image
  description         text null,        -- human note
  usage_rules         text null,        -- "Do / Don't" guidance

  -- AI analysis
  ai_audit_score      integer null check (ai_audit_score between 0 and 100),
  ai_audit_notes      text null,
  ai_audited_at       timestamptz null,

  -- Ordering
  sort_order          integer not null default 0,
  is_primary          boolean not null default false, -- primary logo, primary palette etc.

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists bva_bm_idx      on public.brand_visual_assets (brand_manager_id);
create index if not exists bva_org_idx     on public.brand_visual_assets (organization_id);
create index if not exists bva_type_idx    on public.brand_visual_assets (brand_manager_id, asset_type);

-- ============================================================
-- 4. design_tokens — structured visual identity (no files)
-- ============================================================
create table if not exists public.brand_design_tokens (
  id                  uuid primary key default gen_random_uuid(),
  brand_manager_id    uuid not null references public.brand_managers(id) on delete cascade,

  -- Color palette
  colors              jsonb not null default '[]',
  -- [{ "name": "Primary Blue", "hex": "#0043FF", "role": "primary|secondary|accent|neutral|background|text" }]

  -- Typography
  fonts               jsonb not null default '[]',
  -- [{ "name": "Inter", "role": "heading|body|accent", "weights": [400,700], "source": "google|custom" }]

  -- Spacing & layout
  spacing_unit        integer not null default 8, -- base unit px
  border_radius       text not null default 'medium' check (border_radius in ('none','subtle','medium','large','pill')),

  -- Visual personality
  visual_style        text null check (visual_style in ('minimal','bold','playful','elegant','corporate','organic','techy','warm')),
  visual_keywords     text[] not null default '{}', -- ['clean', 'modern', 'trustworthy']

  -- Logo rules
  logo_min_size_px    integer null,
  logo_clear_space    text null,  -- e.g. "1x logo height on all sides"
  logo_dont_rules     text[] not null default '{}',

  -- Motion & feel
  animation_style     text null check (animation_style in ('none','subtle','expressive','playful')),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (brand_manager_id)
);

create index if not exists bdt_bm_idx on public.brand_design_tokens (brand_manager_id);

-- ============================================================
-- 5. Triggers
-- ============================================================
drop trigger if exists set_bva_updated_at on public.brand_visual_assets;
create trigger set_bva_updated_at
  before update on public.brand_visual_assets
  for each row execute function public.set_updated_at();

drop trigger if exists set_bdt_updated_at on public.brand_design_tokens;
create trigger set_bdt_updated_at
  before update on public.brand_design_tokens
  for each row execute function public.set_updated_at();

-- ============================================================
-- 6. RLS
-- ============================================================
alter table public.brand_visual_assets enable row level security;
alter table public.brand_design_tokens enable row level security;

create policy "org members manage visual assets"
  on public.brand_visual_assets for all
  using (
    organization_id in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
  )
  with check (
    organization_id in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
  );

create policy "org members manage design tokens"
  on public.brand_design_tokens for all
  using (
    brand_manager_id in (
      select id from public.brand_managers
      where organization_id in (
        select organization_id from public.organization_members where user_id = auth.uid()
      )
    )
  )
  with check (
    brand_manager_id in (
      select id from public.brand_managers
      where organization_id in (
        select organization_id from public.organization_members where user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- 7. Update overall_score to include visual completeness
-- ============================================================
create or replace function public.recalculate_brand_manager_score(p_brand_manager_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_knowledge_avg integer;
  v_has_logo      boolean;
  v_has_tokens    boolean;
  v_visual_score  integer;
  v_final_score   integer;
begin
  -- Knowledge sections average (70% weight)
  select coalesce(round(avg(completeness_score)), 0)::integer
  into v_knowledge_avg
  from public.brand_knowledge_sections
  where brand_manager_id = p_brand_manager_id;

  -- Visual completeness (30% weight)
  select exists(
    select 1 from public.brand_visual_assets
    where brand_manager_id = p_brand_manager_id and asset_type = 'logo'
  ) into v_has_logo;

  select exists(
    select 1 from public.brand_design_tokens
    where brand_manager_id = p_brand_manager_id
  ) into v_has_tokens;

  v_visual_score := (case when v_has_logo then 50 else 0 end)
                  + (case when v_has_tokens then 50 else 0 end);

  v_final_score := round(v_knowledge_avg * 0.7 + v_visual_score * 0.3)::integer;

  update public.brand_managers
  set overall_score = v_final_score,
      status = case
        when v_final_score >= 80 then 'active'
        when v_final_score > 0   then 'training'
        else 'draft'
      end
  where id = p_brand_manager_id;
end;
$$;
