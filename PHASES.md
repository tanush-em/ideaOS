# IdeaOS — Implementation Phases

Run these **one at a time**. Each phase has a clear done criteria before moving on.

**Constraints:** Solo vibecode · Minimal API cost · Multi-provider LLM · Branching required · Founders audience · Portfolio-polish UI

---

## Principles (all phases)

| Area | Rule |
|------|------|
| **Cost** | Cheap models default (`gpt-4o-mini`, `claude-3-5-haiku`, `gemini-2.0-flash`). Max 5 candidates, 6 searches, 1 retry per agent. |
| **LLM** | `LLMProvider` interface + OpenAI, Anthropic, Google adapters from Phase 2 onward. |
| **Founders** | Prompts and UI framed around: Should I build this? MVP scope? Competition? Kill criteria? |
| **Branching** | Copy-on-write via `parent_id` on ideas. Table comparison before React Flow graph. |
| **Jobs** | Async pipeline from Phase 3 — never block the browser on full agent runs. |

---

## Phase 1 — Foundation

**Goal:** SaaS shell — auth, database, landing, dashboard.

**Build**
- [x] Next.js + TypeScript + Tailwind + shadcn/ui (dark mode default)
- [x] Landing page (hero, 3-step flow, CTA)
- [x] Supabase Auth (email magic link)
- [x] DB tables: `projects`, `ideas`, `agent_runs`, `agent_outputs`
- [x] RLS on all tables
- [x] Dashboard: project list + create project
- [x] Workspace shell (3-panel layout placeholder)

**Done when**
- Sign in → create project → land in workspace shell

**Skip**
- Agents, research, graph, eval, billing, teams

o run locally
Supabase setup

Create a project at supabase.com
Run supabase/migrations/001_phase1_schema.sql in the SQL Editor
Enable Email auth (magic link)
Add redirect URL: http://localhost:3000/auth/callback
Env vars

cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
Start dev server


npm run dev
---

## Phase 2 — First Agent

**Goal:** One working agent with structured output.

**Build**
- [x] Founder idea intake form
- [x] Brainstorm agent + Zod schema
- [x] `LLMProvider` abstraction (OpenAI, Anthropic, Google)
- [x] Agent run UI + detail drawer (input, output, tokens, cost, validation)
- [x] Persist runs to `agent_runs` / `agent_outputs`

**Done when**
- Raw founder idea → 3–5 structured candidates saved to DB
'Add at least one LLM key to .env.local:

OPENAI_API_KEY=sk-...
# or ANTHROPIC_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY
npm run dev → sign in → open a project

Describe your idea → Run Brainstorm → see 3–5 candidates

Click a pipeline stage or recent run to inspect the agent trace


---

## Phase 3 — Linear Pipeline

**Goal:** End-to-end multi-agent flow (research stubbed).

**Build**
- [x] Orchestrator: Intake → Brainstorm → Expansion → Critic → Refiner → Blueprint
- [x] Stub Web Scout / Market Analyst (“Phase 4”)
- [x] Schema validation + 1 repair retry
- [x] Background jobs + polling for UI
- [x] Pipeline progress UI

**Done when**
- Full run produces founder-facing blueprint with cost logged (~$0.05–0.15)

Before testing
Run the new migration in Supabase SQL Editor:

supabase/migrations/002_phase3_pipeline_runs.sql
How to test
npm run dev → open a project
Enter your founder idea
Click Run pipeline (not just Run Brainstorm)
Watch stages update every ~2s
When complete: blueprint appears + total cost in sidebar (~$0.05–0.15 on cheap models)
Run Brainstorm still works for quick single-agent testing.

---

## Phase 4 — Web Research

**Goal:** Evidence-backed ideation.

**Build**
- [x] `SearchProvider` abstraction
- [x] DuckDuckGo provider (Tavily optional)
- [x] Web Scout + evidence storage (`research_queries`, `research_sources`, `evidence`)
- [x] Evidence surfaced in workspace (top claims + links)
- [ ] Human approval gate before search

**Pipeline insert:** After Critic → Web Scout → Market Analyst → Refiner

**Done when**
- Evidence is stored; market scores and blueprint reasoning reflect that evidence; top evidence is visible in the workspace

Required Supabase migration (run this)
You must apply this SQL in Supabase (SQL Editor or migration runner):

supabase/migrations/003_phase4_research_tables.sql
Note (remaining for perfection)
Human approval gate is implemented before web research. The blueprint output still doesn’t include explicit URL citations (but scoring/refinement is evidence-driven and top evidence is visible in the workspace).
---

## Phase 5 — Branching

### 5a — Data + actions

**Build**
- [x] `POST /ideas/:id/branch` with `branch_reason`
- [x] Copy-on-write parent outputs to new idea
- [ ] Re-run pipeline from chosen stage on branch
- [x] Comparison table: two branches, scores, “Why is X better?”

**Done when**
- Root → 2 branches → different blueprints → compare works

### 5b — Idea graph UI

**Build**
- [x] React Flow graph (root + branches) with active idea selection
- [x] Click node → load idea

**Done when**
- Graph demo matches spec; portfolio-ready visuals

---

## Phase 6 — Evaluation

**Build**
- [x] 20–30 golden test ideas
- [x] Schema validity & cost summary in workspace
- [x] `/evaluations` dashboard

**Done when**
- Screenshot-able metrics for README / case study

---

## Phase 7 — Observability

**Build**
- [x] Run trace drawer already included (latency/tokens/cost)
- [x] Cost totals in workspace sidebar

**Skip initially:** OpenTelemetry unless needed for resume

---

## Phase 8 — Polish

**Build**
- [x] Export blueprint as Markdown
- [x] Demo project seeded
- [ ] Founder onboarding + example prompts
- [ ] Settings: default LLM provider per agent
- [ ] README + architecture diagram + demo script
- [ ] Usage limits (`MAX_RUNS_PER_DAY`) for future billing

**Done when**
- Portfolio-ready: live demo, docs, case study material
Quick “how to demo” checklist
Start app: npm run dev
Sign in → create project (or click Create demo project)
Open project workspace → enter idea (or use demo prompt)
Click Run pipeline
Create a branch → click the branch node → run pipeline again
When complete: see blueprint + evidence + evaluation quick card
Use Export Markdown from the blueprint

---

## Suggested run order

```text
Phase 1 → 2 → 3 → (5a if time) → 4 → 5b → 8 → 6 → 7
```

**Today target:** Phases 1–3 + start 5a

---

## Phase status

| Phase | Status |
|-------|--------|
| 1 — Foundation | ✅ Complete |
| 2 — First Agent | ✅ Complete |
| 3 — Linear Pipeline | ✅ Complete |
| 4 — Web Research | ✅ Complete |
| 5a — Branching logic | ✅ Complete |
| 5b — Idea graph UI | ✅ Complete |
| 6 — Evaluation | ✅ Complete |
| 7 — Observability | ✅ Complete (minimal) |
| 8 — Polish | 🔄 Partial (export + demo) |
