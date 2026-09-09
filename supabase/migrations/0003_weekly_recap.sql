-- ════════════════════════════════════════════════════════════════════════════
--  Moment Jar — 0003 weekly recap opt-out
--  Adds a per-user switch for the Sunday "Your week in the jar" email. The
--  Settings card exposes it as "Weekly recap on Sundays"; weekly-recap/index.ts
--  filters on it. The alter is idempotent; the update below is a one-time
--  backfill (see its comment).
-- ════════════════════════════════════════════════════════════════════════════
alter table public.preferences
  add column if not exists weekly_recap_enabled boolean not null default true;

-- Existing users inherit their daily-reminder choice: someone who never opted
-- into any email keeps getting none, and someone with the daily reminder on
-- gets the recap too. Only brand-new accounts (rows created after this runs)
-- start with the column's default of on. Run this ONCE, right after the alter
-- above: re-running it later would overwrite any choices people have since
-- made with the new toggle.
update public.preferences set weekly_recap_enabled = reminder_enabled;
