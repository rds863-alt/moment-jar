# Moment Jar — Project Handoff

**Last updated:** September 8, 2026 (first version of this file; supersedes nothing — README.md and SETUP.md stay as the how-to docs)
**Purpose:** Bring this to a new chat or Claude Code session so the assistant knows the full project history and current state. Start any new session by having the assistant read this file first, then SETUP.md.
**Name:** **Moment Jar** — momentjar.app. GitHub repo `rds863-alt/moment-jar`. Local folder: `C:\Users\rds86\moment-jar`. Sibling of LifeOnTrack (same stack and auth pattern) and RentReceipts.

---

## 🟢 STATUS (September 8, 2026): LIVE WEB APP, FOUNDATION PASS DONE LOCALLY, NOT YET DEPLOYED

The product is deployed on Vercel and reachable at momentjar.app (last deployed commit f582c6d, June 13, 2026). A **foundation pass** was completed locally on September 8 and is **uncommitted**: the 2,100-line `src/App.js` is split into modules with byte-identical rendering (verified by DOM comparison of the landing, login, and empty-jar screens), three bugs are fixed, a weekly-recap switch is added, the schema is recorded as migrations, and the email sender identity moves to momentjar.app. Before that work is live, three things must happen in order: run migration 0003 in Supabase, verify momentjar.app in Resend, then redeploy both edge functions and push to Vercel. See NEXT STEPS.

---

## WHAT THIS PROJECT IS

A gratitude jar. Add one small good thing that happened today (short text + a mood emoji + optional tag). The jar on the home screen fills as the year's moments accumulate. At ten moments the "Open your jar" year-in-review playback unlocks; any completed year can be downloaded as a PDF book. Optional daily reminder and Sunday weekly recap emails. No payments, no social features, no photos — the emotional hook first.

Voice everywhere: warm, gentle, never streak-shaming ("miss a day and nothing happens; your jar's in no rush").

---

## INFRASTRUCTURE (ground truth)

| Piece | Value |
|---|---|
| Hosting | Vercel, project connected to GitHub `rds863-alt/moment-jar`, domain **momentjar.app**. `vercel.json` has **rewrites only** (`/privacy` → `/privacy.html`). Never use `routes` — it white-screened LifeOnTrack. |
| Supabase project | **`afhcuanapgsxrorvygfi`** (name `moment-jar`, org `sdhowyqbndktxbbtyagp`), Postgres 17.6, region aws-1-us-west-1. Separate from LifeOnTrack's project — data must not mix. |
| Client keys | URL + publishable key are literals in `src/lib/supabase.js`. No `.env`, no `REACT_APP_*`. Only the publishable (anon) key is ever in the client. |
| Auth | Supabase email OTP, **6-digit** codes, via raw `fetch` (no `@supabase/supabase-js` in the client — it crashed mobile browsers). Session lives in localStorage: `sb_token`, `sb_refresh`, `sb_user`. Tokens auto-refresh on 401/403. |
| Auth email (SMTP) | Configured in the Supabase dashboard, not the repo: Resend SMTP, `smtp.resend.com:465`, user `resend`, sender `hello@momentjar.app`. Known quirk: a first-time user may get a "confirm your email" link first; requesting the code again sends the digits. |
| Function email (API) | Edge functions call the Resend HTTP API with secret `RESEND_API_KEY`. Sender identity lives in `supabase/functions/_shared/email.ts`: **From `Moment Jar <reminders@momentjar.app>`, reply-to `hello@momentjar.app`** (changed Sept 8 from `reminders@lifeontrack.app` / `rds86@duck.com`). **momentjar.app must be verified in Resend before the functions are redeployed.** |
| Cron | `pg_cron` + `pg_net` in Supabase: `moment-jar-daily-reminders` every 30 min, `moment-jar-weekly-recap` hourly (function guards for Sunday 7pm Pacific). SQL in SETUP.md §6. |
| Analytics | None. GA4 snippet is commented out in `public/index.html`. |
| Android | Not built. Plan (SETUP.md §7): mirror LifeOnTrackApp2 (Expo SDK 54 WebView). |

Tooling on Rick's PC: Node 24, npm, Supabase CLI 2.101 (project already linked), Python 3.12, no Deno, no gh CLI.

---

## LOCAL LAYOUT (`C:\Users\rds86\moment-jar`)

```
src/App.js              state + screen switching (≈720 lines; was 2,102 before Sept 8)
src/App.css             all shared CSS (was an inline <style> in App.js)
src/lib/                supabase.js · storage.js · constants.js · prompts.js · dates.js · pdfBook.js
src/components/         Jar · TagPicker · MomentCard · JarReview(+ReviewStat) · NavBtn · Toast · AuthHeader
src/screens/            Loading · Landing · Login · Verify · Home · Browse · AddMoment · EditMoment · Settings · BookPicker
public/                 index.html · manifest.json · logo512.png · privacy.html · robots.txt
supabase/migrations/    0001_initial.sql · 0002_custom_tags.sql · 0003_weekly_recap.sql
supabase/functions/     daily-reminders/ · weekly-recap/ · _shared/email.ts
supabase/custom-tags.sql   original of 0002, kept for reference
scripts/recolor-bubbles.js one-off PNG recolour used on the icon (June 8)
README.md · SETUP.md · MomentJar-Handoff.md (this file) · vercel.json
```

Build: `npm run build` (CRA, react-scripts 5.0.1, React 19.2.6, jspdf 4.2.1). Run locally: `npm start` → http://localhost:3000. `.claude/launch.json` has a `moment-jar` preview config.

---

## DATABASE (all tables `public.*`, RLS "own rows" = `auth.uid() = user_id`)

- **moments** — `id uuid pk, user_id → auth.users, text, mood (emoji string), tag (string, never a FK), date (user's local calendar day), created_at`. Client upserts with `resolution=merge-duplicates`, PATCHes text/mood/tag, DELETEs by id.
- **preferences** — `user_id pk, email, reminder_enabled (default false), reminder_time text '20:00', timezone (IANA), hidden_tags text[], weekly_recap_enabled (default true, migration 0003), is_pro, is_legacy (both unused — gate nothing), created_at, updated_at`. Client upserts `email` on every session start.
- **custom_tags** — `id, user_id, name, created_at`, unique on `(user_id, lower(name))`.
- **reminder_email_state** — single row `id=1, last_subject, last_opener`; RLS on with no policies, so only the service role (the daily function) touches it.

Grants to `anon, authenticated` on the three user tables (Supabase's Oct 30 2026 public-schema change).

**Migrations 0001 and 0002 are already applied to the live project** (they were run by hand from SETUP.md / custom-tags.sql before Sept 8). **0003 is not yet applied.** All three are idempotent.

---

## EDGE FUNCTIONS (Deno, deployed with `--no-verify-jwt`, secrets: `RESEND_API_KEY`; `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected)

- **daily-reminders** — every 30 min. For each `reminder_enabled` user: is it within 30 min after their `reminder_time` in their own `timezone`? Already added a moment today (their local day)? If not, send. Subject and opener rotate, never repeating the previous pick (state in `reminder_email_state`).
- **weekly-recap** — hourly, acts only Sunday 19:00 America/Los_Angeles (`?force=true` bypasses). **Audience since Sept 8: `weekly_recap_enabled = true`** (was `reminder_enabled = true`). Skips anyone with zero moments in the last 7 days. Shows count, top mood, up to 3 random moments.
- **_shared/email.ts** — `EMAIL_FROM`, `EMAIL_REPLY_TO`, `safeTz`, `tzDateStr`. Both functions import it; redeploy both when it changes.

Deploy: `supabase functions deploy daily-reminders --project-ref afhcuanapgsxrorvygfi --no-verify-jwt` and the same for `weekly-recap`.

---

## CLIENT APP — HOW IT BEHAVES

- **Startup**: if localStorage has moments → straight to the app. Else the loading screen while `getSession()` runs; a **5-second fallback** now sends the user to landing (no local moments) or the app in local mode (has moments) instead of leaving "loading" on screen.
- **Local-first**: every add/edit/delete writes state + localStorage first, then the server in the background; failures show a toast and retry on the next sync. `syncMoments` merges by id and uploads local-only moments.
- **Sign-out (fixed Sept 8)**: compares local moment ids against the ids known to be on the server (the last successful fetch plus anything saved since). If some aren't, it syncs once more, then asks "N moments haven't synced… sign out anyway?". Then it clears the `mj_` keys, resets state, and shows landing. Before the fix, the next person on the device saw the previous account's moments in "Local only" mode.
- **Jar fill**: this year's count ÷ 100 (`FILL_GOAL`), clamped to 5%–100%. Bubbles are seeded pseudo-random so they never jump.
- **Moods**: ten, stored as the emoji itself. Reflective and Hopeful were removed June 12–13; a moment saved with either still displays but has no filter chip and prints with no mood label in the PDF.
- **Tags**: six supplied + user custom tags; hide (supplied) or delete (custom) per user; moments keep their tag string regardless.
- **Year-in-review**: "Open your jar" at 10+ moments this year. PDF book only for completed years (< current year) via jsPDF, lazy-loaded.
- **Settings**: Daily reminder toggle + time; **Weekly recap on Sundays** toggle (Sept 8); sign in/out. Both email cards only show when signed in.
- **PWA**: installable manifest, **no service worker** (deliberately removed May 30; `index.js` unregisters any old one). "Offline" means the localStorage copy only.

---

## SESSION LOG

- **May 29** — Initial commit (v1: add, jar, browse, on-this-day, OTP auth). Icon + manifest.
- **May 30** — Save animation, daily reminder settings + edge function with timezone handling, sender moved to lifeontrack.app, service worker disabled, token refresh fix, sync-failure toasts, weekly-recap function, "Open your jar" playback, inspiration prompts (100). SETUP.md documents cron.
- **May 31 – Jun 2** — Local-day date fix + moment editing, evening hint, dictation hint.
- **Jun 8 – 13** — Icon bubble recolour, rotating reminder copy, mood palette expanded then trimmed to 10, custom tags + hide/delete, Browse month dropdown, printable PDF book. **Last deployed commit f582c6d (Jun 13).**
- **Sep 8** — Report-only audit of the whole repo, then the **foundation pass** (this handoff's STATUS): module split with DOM-verified identical rendering; fixes for sign-out data leak, 5-second timeout dead end, missing `/privacy.html`; `weekly_recap_enabled` column + toggle + function filter; daily-card copy no longer claims "one email a day" is the only email; `_shared/email.ts` with momentjar.app identity; migrations 0001–0003; README/SETUP refreshed; this file created. Built clean. **Not committed, not deployed.**

---

## NEXT STEPS (in order)

1. **Verify momentjar.app in Resend** (Resend → Domains → Add → add the DNS records at the registrar). Until this is done the redeployed functions will fail to send. If it can't be done soon, revert the two constants in `_shared/email.ts` to the lifeontrack.app values before deploying.
2. **Run migration 0003** in the Supabase SQL Editor (one `alter table … add column if not exists`). Running 0001 and 0002 too is harmless.
3. **Deploy both edge functions** (commands above), then `curl -X POST ".../functions/v1/weekly-recap?force=true"` to confirm a send.
4. **Review, commit, push** — Vercel deploys on push. Suggested commit message: "Foundation pass: split App.js into modules, fix sign-out/timeout/privacy, weekly recap toggle, migrations, momentjar.app sender".
5. After deploy, open Settings on a signed-in account and flip the weekly toggle to confirm it saves (toast "Weekly recap off").

## OPEN DECISIONS / BACKLOG

- **Weekly recap default = ON for everyone** with a preferences row (every account that has ever signed in). Active users who never opted into any email will start getting Sunday recaps. Intended per the Sept 8 spec, but Rick should confirm before deploying; the alternative is `default false` in 0003 plus a one-line change.
- Edit conflicts: an edit whose PATCH fails is kept locally but is not retried (only new moments are re-uploaded by sync).
- Android wrapper (SETUP.md §7).
- GA4 measurement ID (commented placeholder in `public/index.html`).
- `is_pro` / `is_legacy` have no code behind them.
- The OTP input is `type="number"`; codes with a leading zero have not been tested on every browser.

## WORKING CONVENTIONS

The "HOW TO WORK WITH RICK" section in the LifeOnTrack handoff applies verbatim: plain-language explanations of anything technical, say what a command does before running it, Rick approves direction before big moves. Verify visible changes with a build (`npm run build` must say "Compiled successfully") before pushing; Vercel deploys straight from `main`.
