# IdeaOS

Agentic product discovery platform for founders — brainstorm, critique, research, branch, and synthesize ideas into implementation-ready blueprints.

## Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js Route Handlers
- **Database & Auth:** Supabase (PostgreSQL + RLS + magic link auth)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_phase1_schema.sql` via the SQL Editor
3. Enable Email auth (magic link) under Authentication → Providers
4. Add redirect URL: `http://localhost:3000/auth/callback`

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Phase progress

See [PHASES.md](./PHASES.md) for the full implementation roadmap.

| Phase | Status |
|-------|--------|
| 1 — Foundation | ✅ Complete |
| 2 — First Agent | ✅ Complete |
| 3 — Linear Pipeline | ✅ Complete |
| 4 — Web Research | ⬜ Next |

## Project structure

```text
src/
├── agents/           # Agent implementations
├── app/              # Pages & API routes
├── components/       # UI components
├── providers/llm/    # Multi-provider LLM abstraction
├── schemas/          # Zod schemas for structured outputs
├── lib/supabase/     # Supabase clients
└── types/            # Shared TypeScript types
supabase/migrations/  # Database schema
```
