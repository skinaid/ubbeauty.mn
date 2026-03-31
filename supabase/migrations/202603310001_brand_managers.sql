-- Phase: AI Brand Manager
-- brand_managers: нэг байгуулага олон брэнд менежер үүсгэх боломжтой
-- brand_knowledge_sections: 10 давхаргын мэдлэг (JSONB)
-- brand_training_sessions: conversational training session

-- ============================================================
-- 1. brand_managers
-- ============================================================
create table if not exists public.brand_managers (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  name                text not null,
  description         text null,
  avatar_color        text not null default '#0043FF',
  status              text not null default 'draft'
                      check (status in ('draft', 'training', 'active', 'archived')),
  overall_score       integer not null default 0 check (overall_score between 0 and 100),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists brand_managers_org_idx
  on public.brand_managers (organization_id);

create index if not exists brand_managers_status_idx
  on public.brand_managers (organization_id, status);

-- ============================================================
-- 2. brand_knowledge_sections
-- ============================================================
create table if not exists public.brand_knowledge_sections (
  id                  uuid primary key default gen_random_uuid(),
  brand_manager_id    uuid not null references public.brand_managers(id) on delete cascade,
  section_type        text not null check (section_type in (
                        'brand_core',
                        'audience',
                        'positioning',
                        'voice_tone',
                        'messaging_system',
                        'product_knowledge',
                        'customer_journey',
                        'content_examples',
                        'guardrails',
                        'feedback_loop'
                      )),
  content             jsonb not null default '{}',
  completeness_score  integer not null default 0 check (completeness_score between 0 and 100),
  is_complete         boolean not null default false,
  last_trained_at     timestamptz null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (brand_manager_id, section_type)
);

create index if not exists brand_knowledge_sections_bm_idx
  on public.brand_knowledge_sections (brand_manager_id);

create index if not exists brand_knowledge_sections_type_idx
  on public.brand_knowledge_sections (brand_manager_id, section_type);

-- ============================================================
-- 3. brand_training_sessions
-- ============================================================
create table if not exists public.brand_training_sessions (
  id                  uuid primary key default gen_random_uuid(),
  brand_manager_id    uuid not null references public.brand_managers(id) on delete cascade,
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  current_section     text not null default 'brand_core'
                      check (current_section in (
                        'brand_core', 'audience', 'positioning', 'voice_tone',
                        'messaging_system', 'product_knowledge', 'customer_journey',
                        'content_examples', 'guardrails', 'feedback_loop'
                      )),
  messages            jsonb not null default '[]',
  status              text not null default 'active'
                      check (status in ('active', 'completed', 'paused')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists brand_training_sessions_bm_idx
  on public.brand_training_sessions (brand_manager_id);

create index if not exists brand_training_sessions_org_idx
  on public.brand_training_sessions (organization_id);

-- ============================================================
-- 4. Updated_at triggers
-- ============================================================
drop trigger if exists set_brand_managers_updated_at on public.brand_managers;
create trigger set_brand_managers_updated_at
  before update on public.brand_managers
  for each row execute function public.set_updated_at();

drop trigger if exists set_brand_knowledge_sections_updated_at on public.brand_knowledge_sections;
create trigger set_brand_knowledge_sections_updated_at
  before update on public.brand_knowledge_sections
  for each row execute function public.set_updated_at();

drop trigger if exists set_brand_training_sessions_updated_at on public.brand_training_sessions;
create trigger set_brand_training_sessions_updated_at
  before update on public.brand_training_sessions
  for each row execute function public.set_updated_at();

-- ============================================================
-- 5. RLS
-- ============================================================
alter table public.brand_managers enable row level security;
alter table public.brand_knowledge_sections enable row level security;
alter table public.brand_training_sessions enable row level security;

-- brand_managers: org members can read/write their own
create policy "org members can manage their brand managers"
  on public.brand_managers
  for all
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  )
  with check (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  );

-- brand_knowledge_sections: via brand_manager ownership
create policy "org members can manage knowledge sections"
  on public.brand_knowledge_sections
  for all
  using (
    brand_manager_id in (
      select id from public.brand_managers
      where organization_id in (
        select organization_id from public.organization_members
        where user_id = auth.uid()
      )
    )
  )
  with check (
    brand_manager_id in (
      select id from public.brand_managers
      where organization_id in (
        select organization_id from public.organization_members
        where user_id = auth.uid()
      )
    )
  );

-- brand_training_sessions: same pattern
create policy "org members can manage training sessions"
  on public.brand_training_sessions
  for all
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  )
  with check (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  );

-- ============================================================
-- 6. Function: recalculate brand_managers.overall_score
-- Called after any knowledge section update
-- ============================================================
create or replace function public.recalculate_brand_manager_score(p_brand_manager_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg integer;
begin
  select coalesce(round(avg(completeness_score)), 0)::integer
  into v_avg
  from public.brand_knowledge_sections
  where brand_manager_id = p_brand_manager_id;

  update public.brand_managers
  set overall_score = v_avg,
      status = case
        when v_avg >= 80 then 'active'
        when v_avg > 0   then 'training'
        else 'draft'
      end
  where id = p_brand_manager_id;
end;
$$;
