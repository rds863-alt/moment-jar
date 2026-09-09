-- ════════════════════════════════════════════════════════════════════════════
--  Moment Jar — 0001 initial schema
--  Recorded from SETUP.md §2 and §6 on 2026-09-08. Idempotent: safe to run on
--  a project where these objects already exist (the live project does).
-- ════════════════════════════════════════════════════════════════════════════

-- One row per moment
create table if not exists public.moments (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  text        text not null,
  mood        text,
  tag         text,
  date        date not null,
  created_at  timestamptz not null default now()
);
create index if not exists moments_user_id_idx   on public.moments (user_id);
create index if not exists moments_user_date_idx on public.moments (user_id, date);

-- Per-user preferences (is_pro / is_legacy / created_at from day one)
create table if not exists public.preferences (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  email             text,
  reminder_enabled  boolean default false,
  reminder_time     text default '20:00',   -- "HH:MM" in the user's local time
  timezone          text,                   -- IANA tz, e.g. "America/New_York"
  is_pro            boolean default false,
  is_legacy         boolean default false,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
alter table public.preferences add column if not exists timezone text;

-- Row Level Security (each user only sees their own rows)
alter table public.moments     enable row level security;
alter table public.preferences enable row level security;

do $$ begin
  create policy "own moments" on public.moments
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own preferences" on public.preferences
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Future-proofing grants (Supabase changes the public-schema default Oct 30 2026)
grant select, insert, update, delete on public.moments     to anon, authenticated;
grant select, insert, update, delete on public.preferences to anon, authenticated;

-- One-row state table for the daily-reminder copy rotation (service role only)
create table if not exists public.reminder_email_state (
  id           int  primary key default 1,
  last_subject int  not null default -1,
  last_opener  int  not null default -1,
  constraint reminder_email_state_single check (id = 1)
);
insert into public.reminder_email_state (id) values (1) on conflict (id) do nothing;
alter table public.reminder_email_state enable row level security;
