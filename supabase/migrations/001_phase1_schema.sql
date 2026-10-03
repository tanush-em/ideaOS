-- IdeaOS Phase 1 schema
-- Run in Supabase SQL Editor or via supabase db push

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ideas (branching via parent_id in Phase 5)
create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.ideas(id) on delete set null,
  branch_reason text,
  title text not null default 'Untitled Idea',
  raw_input text,
  current_stage text not null default 'intake',
  is_root boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Agent runs
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_name text not null,
  stage text not null,
  status text not null default 'pending',
  provider text,
  model text,
  input jsonb,
  output jsonb,
  error text,
  tokens_input integer,
  tokens_output integer,
  estimated_cost numeric(10, 6),
  latency_ms integer,
  validation_passed boolean,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Agent outputs (structured artifacts per stage)
create table if not exists public.agent_outputs (
  id uuid primary key default gen_random_uuid(),
  agent_run_id uuid not null references public.agent_runs(id) on delete cascade,
  idea_id uuid not null references public.ideas(id) on delete cascade,
  stage text not null,
  schema_version text not null default '1.0',
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_ideas_project_id on public.ideas(project_id);
create index if not exists idx_ideas_parent_id on public.ideas(parent_id);
create index if not exists idx_agent_runs_idea_id on public.agent_runs(idea_id);
create index if not exists idx_agent_outputs_idea_id on public.agent_outputs(idea_id);

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.handle_updated_at();

drop trigger if exists ideas_updated_at on public.ideas;
create trigger ideas_updated_at
  before update on public.ideas
  for each row execute function public.handle_updated_at();

-- Row Level Security
alter table public.projects enable row level security;
alter table public.ideas enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_outputs enable row level security;

-- Projects policies
create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can create own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Ideas policies
create policy "Users can view own ideas"
  on public.ideas for select
  using (auth.uid() = user_id);

create policy "Users can create own ideas"
  on public.ideas for insert
  with check (auth.uid() = user_id);

create policy "Users can update own ideas"
  on public.ideas for update
  using (auth.uid() = user_id);

create policy "Users can delete own ideas"
  on public.ideas for delete
  using (auth.uid() = user_id);

-- Agent runs policies
create policy "Users can view own agent runs"
  on public.agent_runs for select
  using (auth.uid() = user_id);

create policy "Users can create own agent runs"
  on public.agent_runs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own agent runs"
  on public.agent_runs for update
  using (auth.uid() = user_id);

create policy "Users can delete own agent runs"
  on public.agent_runs for delete
  using (auth.uid() = user_id);

-- Agent outputs policies
create policy "Users can view own agent outputs"
  on public.agent_outputs for select
  using (
    exists (
      select 1 from public.agent_runs ar
      where ar.id = agent_run_id and ar.user_id = auth.uid()
    )
  );

create policy "Users can create own agent outputs"
  on public.agent_outputs for insert
  with check (
    exists (
      select 1 from public.agent_runs ar
      where ar.id = agent_run_id and ar.user_id = auth.uid()
    )
  );

create policy "Users can update own agent outputs"
  on public.agent_outputs for update
  using (
    exists (
      select 1 from public.agent_runs ar
      where ar.id = agent_run_id and ar.user_id = auth.uid()
    )
  );

create policy "Users can delete own agent outputs"
  on public.agent_outputs for delete
  using (
    exists (
      select 1 from public.agent_runs ar
      where ar.id = agent_run_id and ar.user_id = auth.uid()
    )
  );
