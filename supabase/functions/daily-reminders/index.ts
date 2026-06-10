import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Same env-var pattern as LifeOnTrack's daily-reminders function.
// RESEND_API_KEY must be set as a Supabase secret. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are injected automatically into edge functions.
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// How wide a slice of the day counts as "now". Set this to be >= your cron
// cadence so every enabled user is matched exactly once per day.
// e.g. cron every 30 min  -> WINDOW_MINUTES = 30.
const WINDOW_MINUTES = 30;

// Warm, varied copy so the daily email never feels robotic or naggy. Subjects
// and body openers are chosen INDEPENDENTLY on each send, so the combinations
// multiply and an email rarely reads the same twice. Gentle voice throughout —
// inviting, never streak-shaming. (Tone drawn from the in-app inspiration
// prompts, but written to read naturally as email copy.)
const SUBJECTS = [
  "What was one good thing today?",
  "A moment worth keeping?",
  "Anything small and good happen today?",
  "What made you smile today?",
  "One little moment for your jar?",
  "Got a good thing to tuck away?",
  "What are you glad happened today?",
  "A small good thing, before the day's done?",
  "Something worth remembering today?",
  "What's one bright spot from today?",
  "Care to drop a moment in the jar?",
  "What made today a little better?",
];

const OPENERS = [
  "What was one good thing about today?",
  "Got a moment worth keeping from today?",
  "What's one small thing that went right?",
  "Did anything today make you smile?",
  "What's a little bright spot from your day?",
  "What's one thing you're glad happened today?",
  "Something small and good you'd like to remember?",
  "What made today a little better than it might've been?",
  "What's a tiny moment worth saving?",
  "What's one thing from today you don't want to forget?",
  "What felt good today, even in a small way?",
  "What's worth dropping into your jar today?",
];

// Sensible defaults if anything goes wrong picking a variant — the email still
// sends with warm, on-brand copy.
const FALLBACK_SUBJECT = "What was one good thing today?";
const FALLBACK_OPENER = "What was one good thing about today?";

// Random index that differs from `last`, mirroring the in-app inspiration-prompt
// shuffle (which never lands on the current prompt). `last = -1` means no prior.
function pickDifferent(len: number, last: number): number {
  if (len <= 1) return 0;
  let n = Math.floor(Math.random() * len);
  while (n === last) n = Math.floor(Math.random() * len);
  return n;
}

function toMinutes(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// Validate an IANA time zone string; fall back to UTC if missing/invalid.
function safeTz(tz: string | null): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

// Current minutes-into-the-day in a given time zone (0–1439).
function tzMinutesNow(tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  let h = 0, m = 0;
  for (const p of parts) {
    if (p.type === "hour") h = parseInt(p.value, 10);
    if (p.type === "minute") m = parseInt(p.value, 10);
  }
  if (h === 24) h = 0; // some ICU builds emit "24" at midnight with hour12:false
  return h * 60 + m;
}

// Today's date (YYYY-MM-DD) in a given time zone — matches how the app stores
// each moment's `date` (the browser's local calendar day).
function tzDateStr(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// The email HTML. Only the opener line varies — the amber styling, jar icon,
// supporting copy, CTA link, and footer all stay exactly as before.
function renderHtml(opener: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FFF8F0;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:480px;margin:32px auto;background:#ffffff;border-radius:18px;border:1px solid #EADBCB;overflow:hidden">

    <!-- Header -->
    <div style="background:#1a0a00;padding:26px 28px;text-align:center">
      <div style="font-size:22px;font-weight:700;color:#FFF8F0;letter-spacing:-0.3px">Moment Jar</div>
      <div style="color:#FFD200;font-size:13px;margin-top:4px">One moment at a time</div>
    </div>

    <!-- Body -->
    <div style="padding:32px 28px;text-align:center">
      <div style="font-size:34px;line-height:1">🫙</div>
      <div style="font-size:21px;font-weight:600;color:#3D2A1C;margin-top:14px;line-height:1.35">
        ${opener}
      </div>
      <div style="font-size:15px;color:#8A7866;margin-top:12px;line-height:1.6">
        Take a few seconds to drop one small good thing into your jar.
        Future-you will love reading it back.
      </div>

      <!-- CTA -->
      <div style="margin-top:26px">
        <a href="https://momentjar.app" style="display:inline-block;background:#C84B11;color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:12px;font-weight:600;font-size:15px">
          Add today's moment →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:18px 28px;background:#FBEEE2;border-top:1px solid #EADBCB;text-align:center">
      <div style="color:#8A7866;font-size:12px;line-height:1.5">
        No pressure at all — miss a day and nothing happens, your jar's in no rush. 💛
      </div>
      <div style="color:#B9A892;font-size:11px;margin-top:6px">
        Moment Jar · <a href="https://momentjar.app" style="color:#B9A892">momentjar.app</a> · you can turn reminders off in Settings.
      </div>
    </div>

  </div>
</body>
</html>`;
}

serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Users who have opted in to reminders.
    const { data: prefs } = await supabase
      .from("preferences")
      .select("user_id, email, reminder_time, reminder_enabled, timezone")
      .eq("reminder_enabled", true);

    if (!prefs || prefs.length === 0) {
      return new Response("No users with reminders enabled", { status: 200 });
    }

    // Seed the "last used" indices from a tiny persisted state record so the
    // first send of this run differs from the previous run's last send too.
    // Degrades gracefully: if the table doesn't exist yet, we just start at -1
    // and still avoid repeats within this run (function-level dedup).
    let lastSubject = -1;
    let lastOpener = -1;
    try {
      const { data: state } = await supabase
        .from("reminder_email_state")
        .select("last_subject, last_opener")
        .eq("id", 1)
        .maybeSingle();
      if (state) {
        if (typeof state.last_subject === "number") lastSubject = state.last_subject;
        if (typeof state.last_opener === "number") lastOpener = state.last_opener;
      }
    } catch (_e) {
      // No state record/table — fall back to in-run dedup only.
    }

    let emailsSent = 0;
    let skippedAlreadyAdded = 0;

    for (const pref of prefs) {
      if (!pref.email) continue;

      const rm = toMinutes(pref.reminder_time);
      if (rm === null) continue;

      // Is it the user's chosen time *in their own time zone*, right now?
      const tz = safeTz(pref.timezone);
      let diff = tzMinutesNow(tz) - rm;
      if (diff < 0) diff += 1440; // wrap around midnight
      if (diff >= WINDOW_MINUTES) continue; // not in this user's window

      // Don't nudge someone who already dropped a moment in today's jar.
      // "Today" is their local calendar day, which matches how moments are dated.
      const today = tzDateStr(tz);
      const { data: todays } = await supabase
        .from("moments")
        .select("id")
        .eq("user_id", pref.user_id)
        .eq("date", today)
        .limit(1);
      if (todays && todays.length > 0) { skippedAlreadyAdded++; continue; }

      // Pick a subject and a body opener independently, each different from the
      // last one used. Safe fallback to sensible defaults if anything throws.
      let subject = FALLBACK_SUBJECT;
      let opener = FALLBACK_OPENER;
      try {
        const si = pickDifferent(SUBJECTS.length, lastSubject);
        const oi = pickDifferent(OPENERS.length, lastOpener);
        subject = SUBJECTS[si] ?? FALLBACK_SUBJECT;
        opener = OPENERS[oi] ?? FALLBACK_OPENER;
        lastSubject = si;
        lastOpener = oi;
      } catch (_e) {
        // Keep the fallback subject/opener.
      }

      // Send the gentle reminder via Resend.
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Moment Jar <reminders@lifeontrack.app>",
          reply_to: "rds86@duck.com",
          to: pref.email,
          subject,
          html: renderHtml(opener),
        }),
      });

      if (emailRes.ok) emailsSent++;
    }

    // Remember the last variants used so the next run won't immediately repeat
    // them. Best-effort: ignore failures (e.g. the state table not existing).
    if (lastSubject >= 0 || lastOpener >= 0) {
      try {
        await supabase
          .from("reminder_email_state")
          .upsert({ id: 1, last_subject: lastSubject, last_opener: lastOpener });
      } catch (_e) {
        // Persistence is a nicety, not required for correctness.
      }
    }

    return new Response(
      `Sent ${emailsSent} reminder email${emailsSent !== 1 ? "s" : ""}; ` +
      `skipped ${skippedAlreadyAdded} who already added today`,
      { status: 200 },
    );

  } catch (err) {
    return new Response(`Error: ${err}`, { status: 500 });
  }
});
