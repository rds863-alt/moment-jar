-- ════════════════════════════════════════════════════════════════════════════
--  Moment Jar — 0003 weekly recap opt-out
--  Adds a per-user switch for the Sunday "Your week in the jar" email.
--  Defaults to ON so nobody's existing recap stops; the Settings card exposes
--  it as "Weekly recap on Sundays". weekly-recap/index.ts filters on it.
--  Idempotent.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.preferences
  add column if not exists weekly_recap_enabled boolean not null default true;
