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
  materials    text[]
);

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
