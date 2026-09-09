# Moment Jar

> More than you remember. One moment at a time.

Add one small good thing that happened today. At the end of the year, open the jar
and read them all back.

A React (CRA) PWA, deployed on Vercel, backed by Supabase. Same tech stack and patterns
as its sibling app **LifeOnTrack** — including OTP 6-digit email auth via raw fetch
(no `@supabase/supabase-js`) and instant localStorage load with background sync.

## Features (as shipped)

- **Add a memory** — short text (up to 280 characters), one of ten moods
  (😊 😂 😌 🥰 ✨ 🙏 😍 🥹 🫶 🥲), an optional tag (six supplied, plus your own), "Drop it in the jar"
- **The jar** — fills as this year's moments accumulate, with a "N moments this year" counter
- **Browse** — all moments newest-first, filter by mood, tag, or month
- **On this day** — surfaces moments from the same date in past years ("One year ago today…")
- **Open your jar** — full-screen year-in-review playback once the year has 10+ moments
- **Printable book** — any completed year as a PDF (cover + every moment), made in the browser
- **Emails** — optional daily reminder at your chosen time, and a Sunday weekly recap; each has
  its own switch in Settings
- **Auth** — OTP email codes; data syncs to Supabase. A copy lives in the browser's localStorage
  so the app opens instantly, but there is no service worker: the page itself needs a connection
  to load. Signing out clears the device copy.

## Getting started

```
npm install
npm start
```

Then see **[SETUP.md](./SETUP.md)** to create the Supabase project, run the migrations,
configure OTP auth, deploy the email functions, and deploy to Vercel. For the full project
history and current state, read **[MomentJar-Handoff.md](./MomentJar-Handoff.md)** first.

## Project structure

```
public/
  index.html          warm amber theme (#1a0a00), PWA meta, polyfills
  manifest.json       PWA manifest (installable; no service worker by design)
  privacy.html        privacy policy, served at /privacy
src/
  App.js              state + screen switching only
  App.css             all shared CSS (class rules, keyframes, font import)
  index.js            entry (also unregisters any old service worker)
  lib/
    supabase.js       URL, publishable key, raw-fetch auth + every remote read/write
    storage.js        localStorage keys and helpers
    constants.js      palette, moods, supplied tags, FILL_GOAL
    prompts.js        the ~100 inspiration prompts
    dates.js          local-calendar-day helpers
    pdfBook.js        the printable year book (jsPDF, lazy-loaded)
  components/         Jar, TagPicker, MomentCard, JarReview, NavBtn, Toast, AuthHeader
  screens/            Loading, Landing, Login, Verify, Home, Browse,
                      AddMoment, EditMoment, Settings, BookPicker (overlays)
supabase/
  migrations/         0001_initial, 0002_custom_tags, 0003_weekly_recap (idempotent)
  functions/          daily-reminders, weekly-recap, _shared/email.ts
  custom-tags.sql     original of migration 0002 (kept for reference)
SETUP.md              Supabase + Vercel setup, migrations, email functions
MomentJar-Handoff.md  project history and current state — read this first
vercel.json           rewrites only — never "routes"
```
