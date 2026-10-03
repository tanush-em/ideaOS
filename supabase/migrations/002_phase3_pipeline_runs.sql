-- Phase 3: pipeline run tracking for async multi-agent execution

create table if not exists public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  current_stage text not null default 'intake',
  provider text,
  total_cost numeric(10, 6) default 0,
  total_tokens_input integer default 0,
  total_tokens_output integer default 0,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_pipeline_runs_idea_id on public.pipeline_runs(idea_id);
create index if not exists idx_pipeline_runs_user_id on public.pipeline_runs(user_id);

alter table public.pipeline_runs enable row level security;

create policy "Users can view own pipeline runs"
  on public.pipeline_runs for select
  using (auth.uid() = user_id);

create policy "Users can create own pipeline runs"
  on public.pipeline_runs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own pipeline runs"
  on public.pipeline_runs for update
  using (auth.uid() = user_id);

create policy "Users can delete own pipeline runs"
  on public.pipeline_runs for delete
  using (auth.uid() = user_id);
