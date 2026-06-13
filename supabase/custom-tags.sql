-- ════════════════════════════════════════════════════════════════════════════
--  Moment Jar — custom tags + hidden supplied tags
--  Run this once in the Supabase SQL Editor for the moment-jar project.
--  Safe to re-run (idempotent: IF NOT EXISTS / DO-NOTHING throughout).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Per-user custom tags (one row per user-defined tag) ──────────────────
-- Tags are plain labels. A moment stores the tag *string*, never a foreign key,
-- so deleting a row here never orphans past moments — they keep their text.
create table if not exists public.custom_tags (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists custom_tags_user_id_idx on public.custom_tags (user_id);
-- One tag name per user (case-insensitive); prevents accidental duplicates.
create unique index if not exists custom_tags_user_name_uniq
  on public.custom_tags (user_id, lower(name));

-- RLS — identical pattern to public.moments (each user sees only their own).
alter table public.custom_tags enable row level security;
do $$ begin
  create policy "own custom tags" on public.custom_tags
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

grant select, insert, update, delete on public.custom_tags to anon, authenticated;

-- ── 2. Hidden supplied tags — a per-user list on the existing prefs table ────
-- Stores the names of code-defined (supplied) tags this user has hidden. It's a
-- per-user array; hiding is purely cosmetic and never affects other users or any
-- already-saved moment. preferences is already RLS-locked to auth.uid() = user_id.
alter table public.preferences
  add column if not exists hidden_tags text[] not null default '{}';
