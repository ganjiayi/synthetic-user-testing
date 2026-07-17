# synthetic-user-testing

Synthetic UX research pipeline for Astro Malaysia. Runs simulated persona sessions
against a product/prototype and produces scored, stakeholder-ready research reports —
without requiring real user recruitment.

## Pipeline

```
intake questionnaire (ui/)
        │
        ▼
research-planner.md  ──▶  study plan (plan.js)
        │
        ▼
simulation-runner.md ──▶  persona sessions, turn by turn (evaluate.js)
        │
        ▼
report.js            ──▶  per-session deliverables JSON (think-aloud transcript,
                           key moments, findings) — no cross-session synthesis
        │
        ▼
RunDetail.js (ui/, client-side) ──▶  CSV / PPTX download, built directly from
                                      plan + sessions — independent of report.js's
                                      output, not a downstream consumer of it
```

Note: `.docx` is not a live deliverable — the UI only exports CSV and PPTX. A `.docx`
transcript builder exists solely in `scripts/local-report-helpers.js`, used by the
local-only `run-local-test.js` harness, and is unreachable from the deployed app.

- **`.claude/agents/research-planner.md`** — system prompt that turns a validated intake
  into a full study plan. Read directly by `api/runs/[id]/plan.js`.
- **`.claude/agents/simulation-runner.md`** — system prompt each persona uses to generate
  turns during a session. Read by `src/lib/evaluate.js` and `scripts/run-local-test.js`.
- **`src/lib/methodology-config.js`** — single source of truth for everything that varies
  by research methodology (eval schema, session config, task derivation rules). Consumed
  by the planner, evaluator, report builder, and the UI's run detail page.

## Structure

- `api/` — Vercel serverless functions (run CRUD, plan generation, session evaluation, reports)
- `ui/` — React frontend (intake questionnaire, plan review, run dashboard)
- `src/lib/` — pipeline logic (evaluation loop, report synthesis, persona/product validation)
- `src/providers/` — model providers (Claude, OpenAI)
- `personas/` — persona library (`v4_library.json`) + schema
- `products/` — product context database (e.g. `ACM.json`) + schema
- `runs/` — per-run artefacts (intake, plan, sessions, report). `DDMMYYYY_study-slug/` is a
  committed empty template showing the expected folder shape. `_comparisons/` holds
  standalone Claude-vs-OpenAI comparison outputs, not tied to a specific run.
- `scripts/run-local-test.js` — drives the real pipeline in-process for a one-off local
  test, skipping Supabase persistence.

## Setup

```bash
npm install
cp .env.example .env   # fill in ANTHROPIC_API_KEY / OPENAI_API_KEY / SUPABASE_* as needed
```

The Claude CLI path uses your Claude Code subscription; `ANTHROPIC_API_KEY` is only needed
for vision calls. See `.env.example` for the full list of variables.

## Related

The Claude Code skill governing how research plans/sessions/reports should be structured
(NNG-standard methodology, quality checks) lives in `.claude/skills/ux-research/SKILL.md`.
Unlike the two agent prompts above, this file is only read by Claude itself when asked to
work on research plans/sessions/reports in this repo — the app never reads it.
