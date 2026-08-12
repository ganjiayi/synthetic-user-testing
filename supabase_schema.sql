-- SynthUX — Supabase schema
-- Run this once in: Supabase dashboard → SQL Editor → New query

create table if not exists runs (
  id           text primary key,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  status       text,
  stage        text,
  error        text,
  intake       jsonb,
  plan         jsonb,
  materials    text[],
  qa_review    jsonb, -- Step 6.5 QA gate: { decisions: [{persona_id, decision, reason}], confirmed_at }
  analysis     jsonb  -- Step 8 analysis.json: { pass_a: {...}, pass_b: {...}, generated_at, based_on_session_count }
);

-- Migrations for existing databases created before these columns existed —
-- safe to re-run, no-ops if the columns are already there.
alter table runs add column if not exists qa_review jsonb;
alter table runs add column if not exists analysis  jsonb;

create table if not exists sessions (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  run_id       text references runs(id) on delete cascade,
  persona_id   text,
  persona_name text,
  data         jsonb
);

-- Indexes for common query patterns
create index if not exists sessions_run_id_idx on sessions(run_id);
create index if not exists runs_created_at_idx on runs(created_at desc);
