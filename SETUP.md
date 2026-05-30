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

## 6. Android app (later — not part of v1 web build)

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
