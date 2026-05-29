# Moment Jar

> More than you remember. One moment at a time.

Add one small good thing that happened today. At the end of the year, open the jar
and read them all back.

A React (CRA) PWA, deployed on Vercel, backed by Supabase. Same tech stack and patterns
as its sibling app **LifeOnTrack** — including OTP 6-digit email auth via raw fetch
(no `@supabase/supabase-js`) and instant localStorage load with background sync.

## v1 features

- **Add a memory** — short text, a mood (😊 😂 😌 🥰 ✨), an optional tag, "Drop it in the jar"
- **The jar** — a jar that visually fills as moments accumulate, with a "N moments this year" counter
- **Browse** — all moments newest-first, filter by mood or tag
- **On this day** — surfaces moments from the same date in past years ("One year ago today…")
- **Auth** — OTP email codes; data syncs to Supabase, works offline via localStorage

## Getting started

```
npm install
npm start
```

Then see **[SETUP.md](./SETUP.md)** to create the Supabase project, run the schema SQL,
configure OTP auth, and deploy to Vercel.

## Project structure

```
public/
  index.html          warm amber theme (#1a0a00), PWA meta, polyfills
  manifest.json       PWA manifest
  service-worker.js    network-first cache
src/
  App.js              the whole app (auth + jar + add + browse + on-this-day)
  index.js            entry + service worker registration
  serviceWorkerRegistration.js
SETUP.md              Supabase + Vercel setup and the SQL schema
vercel.json           rewrites only — never "routes"
```
