-- Phase 4: Evidence system storage

create table if not exists public.research_queries (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  query_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.research_sources (
  id uuid primary key default gen_random_uuid(),
  research_query_id uuid not null references public.research_queries(id) on delete cascade,
  idea_id uuid not null references public.ideas(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text not null,
  snippet text not null,
  relevance real,
  provider text,
  created_at timestamptz not null default now()
);

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  research_source_id uuid not null references public.research_sources(id) on delete cascade,
  idea_id uuid not null references public.ideas(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  claim text not null,
  evidence_type text not null,
  excerpt text not null,
  relevance real,
  confidence real,
  source_title text not null,
  source_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_research_queries_idea_id on public.research_queries(idea_id);
create index if not exists idx_research_sources_idea_id on public.research_sources(idea_id);
create index if not exists idx_evidence_idea_id on public.evidence(idea_id);
create index if not exists idx_evidence_source_url on public.evidence(source_url);

alter table public.research_queries enable row level security;
alter table public.research_sources enable row level security;
alter table public.evidence enable row level security;

create policy "Users can view own research queries"
  on public.research_queries for select
  using (auth.uid() = user_id);

create policy "Users can insert own research queries"
  on public.research_queries for insert
  with check (auth.uid() = user_id);

create policy "Users can view own research sources"
  on public.research_sources for select
  using (auth.uid() = user_id);

create policy "Users can insert own research sources"
  on public.research_sources for insert
  with check (auth.uid() = user_id);

create policy "Users can view own evidence"
  on public.evidence for select
  using (auth.uid() = user_id);

create policy "Users can insert own evidence"
  on public.evidence for insert
  with check (auth.uid() = user_id);

