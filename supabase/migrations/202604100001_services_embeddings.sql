-- Enable pgvector extension (idempotent)
create extension if not exists vector with schema extensions;

-- Add embedding column to services table
alter table public.services
  add column if not exists embedding extensions.vector(1536);

-- Create HNSW index for fast similarity search
create index if not exists services_embedding_idx
  on public.services
  using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Helper function: search services by similarity
create or replace function match_services(
  query_embedding extensions.vector(1536),
  org_id          uuid,
  match_threshold float default 0.3,
  match_count     int   default 5
)
returns table (
  id               uuid,
  name             text,
  description      text,
  duration_minutes int,
  price_from       numeric,
  currency         text,
  is_bookable      boolean,
  status           text,
  category_id      uuid,
  similarity       float
)
language sql stable
set search_path = public, extensions
as $$
  select
    s.id,
    s.name,
    s.description,
    s.duration_minutes,
    s.price_from,
    s.currency,
    s.is_bookable,
    s.status,
    s.category_id,
    1 - (s.embedding <=> query_embedding) as similarity
  from public.services s
  where
    s.organization_id = org_id
    and s.status = 'active'
    and s.embedding is not null
    and 1 - (s.embedding <=> query_embedding) > match_threshold
  order by s.embedding <=> query_embedding
  limit match_count;
$$;
