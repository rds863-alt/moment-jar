# Moment Jar — Setup & Deployment

Moment Jar reuses the **exact same stack as LifeOnTrack** (Create React App → Vercel,
Supabase Postgres + Auth, OTP 6-digit email codes via **raw fetch**, Resend SMTP).
Read `LifeOnTrack-Project-Handoff.md` for the *why* behind each decision — especially
the auth history (raw fetch instead of `@supabase/supabase-js`, OTP instead of magic links).

This is a **separate Supabase project** from LifeOnTrack — its data must not mix.

---

## 1. Create the Supabase project

1. New project at https://supabase.com → name it `moment-jar`.
2. Copy the **Project URL** and **anon public key** (Settings → API).
3. Paste them into `src/App.js`:

   ```js
   const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
   const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY";
   ```

   (Only the **anon** key goes in the client — never the service role key.)

---

## 2. Database schema

Run this in the Supabase **SQL Editor**:

```sql
-- One row per moment
create table public.moments (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  text        text not null,
  mood        text,
  tag         text,
  date        date not null,
  created_at  timestamptz not null default now()
);
create index moments_user_id_idx on public.moments (user_id);
create index moments_user_date_idx on public.moments (user_id, date);

-- Per-user preferences (is_pro / is_legacy / created_at from day one — lesson from LifeOnTrack)
create table public.preferences (
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
```

**Already have a `preferences` table?** Add the timezone column:

```sql
alter table public.preferences add column if not exists timezone text;
```

The app captures the browser's time zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
automatically whenever reminder preferences are saved, and the `daily-reminders`
edge function uses it to fire each reminder at the user's real local time (falling
back to UTC if a row has no timezone yet).

### Row Level Security (each user only sees their own moments)

```sql
alter table public.moments     enable row level security;
alter table public.preferences enable row level security;

create policy "own moments"     on public.moments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own preferences" on public.preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Future-proofing grants

Supabase is changing the `public` schema default on **Oct 30 2026** — run these now
(same step LifeOnTrack did):

```sql
grant select, insert, update, delete on public.moments     to anon, authenticated;
grant select, insert, update, delete on public.preferences to anon, authenticated;
```

### Custom tags + hidden supplied tags

Users can add their own tags and hide/delete any tag (custom **or** supplied).
Run **`supabase/custom-tags.sql`** in the SQL Editor (idempotent — safe to re-run).
It creates the `custom_tags` table (same RLS pattern as `moments`) and adds a
`hidden_tags text[]` column to `preferences`:

```sql
-- Per-user custom tags
create table if not exists public.custom_tags (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists custom_tags_user_id_idx on public.custom_tags (user_id);
create unique index if not exists custom_tags_user_name_uniq
  on public.custom_tags (user_id, lower(name));

alter table public.custom_tags enable row level security;
create policy "own custom tags" on public.custom_tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.custom_tags to anon, authenticated;

-- Per-user hidden supplied-tag names (cosmetic, per-user; never touches moments)
alter table public.preferences
  add column if not exists hidden_tags text[] not null default '{}';
```

A moment stores the tag **string** (never a foreign key), so hiding or deleting a
tag only removes it as a *new* selectable option — past moments keep their label.

---

## 3. Auth configuration (must match LifeOnTrack's working setup)

In the Supabase dashboard:

- **Auth → Sign In / Providers → Email**: set **OTP length to 6 digits** (default is 8).
- **Email template → "Magic Link / OTP"**: show the code, not a link. Body must include
  `{{ .Token }}`; subject e.g. `Your Moment Jar sign-in code: {{ .Token }}`.
- **SMTP**: custom SMTP via Resend (host `smtp.resend.com`, port `465`, user `resend`,
  sender e.g. `hello@momentjar.app`). Verify the `momentjar.app` domain in Resend first.

> Known quirk (documented in the verify screen UI): first-time users sometimes get a
> "confirm your email" link on the *first* request; requesting the code a second time
> sends the actual 6-digit code. This is Supabase behavior, not a bug.

---

## 4. Run locally

```
cd C:\Users\rds86\moment-jar
npm install
npm start          # http://localhost:3000
```

---

## 5. Deploy (same workflow as LifeOnTrack)

```
cd C:\Users\rds86\moment-jar
npm run build      # verify "Compiled successfully" before pushing
git add .
git commit -m "message"
git push
```

- Create a GitHub repo, connect it to a **new Vercel project**, point `momentjar.app` at it.
- **`vercel.json` must use `rewrites`, never `routes`** — `routes` white-screened the entire
  LifeOnTrack app and cost hours of debugging. Keep the file minimal.
- Web changes deploy instantly and do **not** trigger Google Play review.

---

## 6. Email functions (daily reminder + weekly recap)

Two Supabase Edge Functions send the warm emails. Both live in
`supabase/functions/`, share the same env-var pattern, and send via Resend from
`Moment Jar <reminders@lifeontrack.app>` (reply-to `rds86@duck.com`) using the
already-verified `lifeontrack.app` domain.

### One-time setup (per project)

```bash
cd C:\Users\rds86\moment-jar
supabase login                                   # first time only
supabase link --project-ref afhcuanapgsxrorvygfi # first time only

# Resend key as a secret (SUPABASE_URL + SERVICE_ROLE_KEY are auto-injected).
# Use a key from the Resend account where lifeontrack.app is verified.
supabase secrets set RESEND_API_KEY=your_resend_api_key --project-ref afhcuanapgsxrorvygfi
```

Make sure `pg_cron` and `pg_net` are enabled (Database → Extensions).

### Rotating reminder copy (optional state table)

The daily reminder picks a random subject line and a random body opener on each
send, never repeating the one used on the immediately previous send. To make that
"don't repeat" hold *across* runs (not just within a single run), create this tiny
one-row state table. The function reads/writes it best-effort — if the table is
missing it still rotates and just de-dupes within each run.

```sql
create table if not exists public.reminder_email_state (
  id           int  primary key default 1,
  last_subject int  not null default -1,
  last_opener  int  not null default -1,
  constraint reminder_email_state_single check (id = 1)
);
insert into public.reminder_email_state (id) values (1) on conflict (id) do nothing;

-- Only the edge function (service role) touches this; lock everyone else out.
alter table public.reminder_email_state enable row level security;
```

### Deploy

```bash
# Daily reminder ("What was one good thing today?")
supabase functions deploy daily-reminders --project-ref afhcuanapgsxrorvygfi --no-verify-jwt

# Weekly recap ("Your week in the jar")
supabase functions deploy weekly-recap   --project-ref afhcuanapgsxrorvygfi --no-verify-jwt
```

Both are deployed with `--no-verify-jwt` because they're triggered by cron, not
by a signed-in user.

### Cron schedules (run these in the SQL Editor)

```sql
-- Daily reminder: fires every 30 min; each user is matched once per day at
-- their own reminder_time (the function does the per-timezone window check).
-- Keep this cadence == WINDOW_MINUTES (30) in daily-reminders/index.ts.
select cron.schedule(
  'moment-jar-daily-reminders',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://afhcuanapgsxrorvygfi.supabase.co/functions/v1/daily-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  $$
);

-- Weekly recap: fires hourly; an internal guard only sends at Sunday 7pm
-- America/Los_Angeles (DST-proof — the function resolves PST/PDT itself).
select cron.schedule(
  'moment-jar-weekly-recap',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://afhcuanapgsxrorvygfi.supabase.co/functions/v1/weekly-recap',
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  $$
);
```

### Test a send immediately

```bash
# Weekly recap supports ?force=true to bypass the Sunday-7pm guard.
# Needs a reminder_enabled account with at least one moment in the last 7 days.
curl -X POST "https://afhcuanapgsxrorvygfi.supabase.co/functions/v1/weekly-recap?force=true"
```

To manage jobs later: `select * from cron.job;` and
`select cron.unschedule('moment-jar-weekly-recap');`.

---

## 7. Android app (later — not part of v1 web build)

Mirror `LifeOnTrackApp2/` (Expo SDK 54 React Native WebView, `newArchEnabled: false`).
Don't use SDK 56 + expo-router — that combination was abandoned in LifeOnTrack as
incompatible with the WebView setup.

---

## What's in v1 (and what's deliberately not)

**In:** add a memory (text + mood + optional tag), the jar that fills as moments
accumulate, "N moments this year" counter, recent moments, browse with mood/tag filters,
"one year ago today", OTP auth, Supabase sync + offline localStorage.

**Not in v1** (see handoff): shared jars, photo attachments, year-in-review, PDF export,
push notifications, printed book, AI features. Ship the emotional hook first.
