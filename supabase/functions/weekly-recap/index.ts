import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Same env-var pattern as the daily-reminders function.
// RESEND_API_KEY must be set as a Supabase secret. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are injected automatically into edge functions.
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// How many days back the recap covers (today + the 6 days before it).
const RECAP_DAYS = 7;

// When the recap should go out, in a fixed wall-clock zone. The cron fires
// hourly; this guard makes it act only at Sunday 7pm Pacific — DST-proof,
// since Intl resolves PST/PDT automatically (no UTC offset to maintain).
const RECAP_TZ = "America/Los_Angeles";
const RECAP_WEEKDAY = "Sun";
const RECAP_HOUR = 19; // 7pm, 24h

// Warm, rotating closing lines — never streak-shaming.
const CLOSERS = [
  "Little by little, your jar is filling. 💛",
  "Here's to another week of small good things.",
  "However many you add, it all counts. Keep going. 💛",
  "Future-you is going to love reading these back.",
  "One moment at a time — you're doing beautifully.",
];

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

// Today's date (YYYY-MM-DD) in a given time zone — matches how the app stores
// each moment's `date` (the browser's local calendar day).
function tzDateStr(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// Current weekday ("Sun"…"Sat") and hour (0–23) in a given time zone.
function tzWeekdayHour(tz: string): { weekday: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", hour: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  let hour = parseInt(get("hour"), 10);
  if (hour === 24) hour = 0; // some ICU builds emit "24" at midnight
  return { weekday: get("weekday"), hour };
}

// Shift a YYYY-MM-DD date string by n days (calendar math, tz-agnostic).
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// Escape user-supplied text before dropping it into the email HTML.
function escapeHtml(s: string): string {
  return (s || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

// Fisher–Yates shuffle, then take the first n.
function pickSome<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

interface Moment { text: string; mood: string | null; tag: string | null; date: string; created_at: string; }

function buildHtml(count: number, topMood: string, picks: Moment[], closer: string): string {
  const momentCard = (m: Moment) => `
    <table role="presentation" width="100%" style="border-collapse:separate;margin-top:10px;background:#FBEEE2;border:1px solid #EADBCB;border-radius:14px">
      <tr>
        <td style="padding:14px 8px 14px 16px;font-size:22px;vertical-align:top;width:30px">${m.mood || "✨"}</td>
        <td style="padding:14px 16px 14px 6px;font-size:14.5px;color:#3D2A1C;line-height:1.5;text-align:left">${escapeHtml(m.text)}</td>
      </tr>
    </table>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FFF8F0;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:480px;margin:32px auto;background:#ffffff;border-radius:18px;border:1px solid #EADBCB;overflow:hidden">

    <!-- Header -->
    <div style="background:#1a0a00;padding:26px 28px;text-align:center">
      <div style="font-size:22px;font-weight:700;color:#FFF8F0;letter-spacing:-0.3px">Moment Jar</div>
      <div style="color:#FFD200;font-size:13px;margin-top:4px">Your week in the jar</div>
    </div>

    <!-- Summary -->
    <div style="padding:30px 28px 8px;text-align:center">
      <div style="font-size:34px;line-height:1">🫙</div>
      <div style="font-size:21px;font-weight:600;color:#3D2A1C;margin-top:14px;line-height:1.35">
        You added ${count} moment${count !== 1 ? "s" : ""} this week.
      </div>
      <div style="font-size:15px;color:#8A7866;margin-top:10px;line-height:1.6">
        Your week felt mostly <span style="font-size:19px">${topMood}</span>
      </div>
    </div>

    <!-- A few moments -->
    <div style="padding:8px 28px 4px">
      <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#C84B11;text-align:center;margin-bottom:4px">
        A few from this week
      </div>
      ${picks.map(momentCard).join("")}
    </div>

    <!-- Closing line -->
    <div style="padding:22px 28px 8px;text-align:center">
      <div style="font-size:15px;color:#3D2A1C;line-height:1.6">${closer}</div>
    </div>

    <!-- CTA -->
    <div style="padding:8px 28px 30px;text-align:center">
      <a href="https://momentjar.app" style="display:inline-block;background:#C84B11;color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:12px;font-weight:600;font-size:15px">
        Open your jar →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:18px 28px;background:#FBEEE2;border-top:1px solid #EADBCB;text-align:center">
      <div style="color:#8A7866;font-size:12px;line-height:1.5">
        Just one gentle recap a week — no pressure, ever. 💛
      </div>
      <div style="color:#B9A892;font-size:11px;margin-top:6px">
        Moment Jar · <a href="https://momentjar.app" style="color:#B9A892">momentjar.app</a> · you can turn these off in Settings.
      </div>
    </div>

  </div>
</body>
</html>`;
}

serve(async (req) => {
  try {
    // The cron fires hourly; only actually run during the Sunday-7pm-Pacific
    // window. `?force=true` bypasses the guard for manual test sends.
    const force = new URL(req.url).searchParams.get("force") === "true";
    const { weekday, hour } = tzWeekdayHour(RECAP_TZ);
    if (!force && (weekday !== RECAP_WEEKDAY || hour !== RECAP_HOUR)) {
      return new Response(
        `Not the recap window (it's ${weekday} ${hour}:00 in ${RECAP_TZ}). Add ?force=true to send now.`,
        { status: 200 },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Same audience as the daily reminder.
    const { data: prefs } = await supabase
      .from("preferences")
      .select("user_id, email, reminder_enabled, timezone")
      .eq("reminder_enabled", true);

    if (!prefs || prefs.length === 0) {
      return new Response("No users with reminders enabled", { status: 200 });
    }

    const closer = CLOSERS[Math.floor(Math.random() * CLOSERS.length)];

    let emailsSent = 0;
    let skippedEmptyWeek = 0;

    for (const pref of prefs) {
      if (!pref.email) continue;

      // The past 7 days in the user's own time zone (today + previous 6).
      const tz = safeTz(pref.timezone);
      const today = tzDateStr(tz);
      const weekAgo = addDays(today, -(RECAP_DAYS - 1));

      const { data: weekMoments } = await supabase
        .from("moments")
        .select("text, mood, tag, date, created_at")
        .eq("user_id", pref.user_id)
        .gte("date", weekAgo)
        .order("created_at", { ascending: false });

      const moments = (weekMoments || []) as Moment[];

      // Don't send an empty "0 moments" recap — that would feel like nagging.
      if (moments.length === 0) { skippedEmptyWeek++; continue; }

      // Most-used mood emoji this week (default to ✨).
      const tally: Record<string, number> = {};
      for (const m of moments) {
        const mood = m.mood || "✨";
        tally[mood] = (tally[mood] || 0) + 1;
      }
      let topMood = "✨", topCount = 0;
      for (const [mood, c] of Object.entries(tally)) {
        if (c > topCount) { topCount = c; topMood = mood; }
      }

      // 2–3 of their actual moments, randomly selected.
      const picks = pickSome(moments, Math.min(3, moments.length));

      const html = buildHtml(moments.length, topMood, picks, closer);

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
          subject: "Your week in the jar 🫙",
          html,
        }),
      });

      if (emailRes.ok) emailsSent++;
    }

    return new Response(
      `Sent ${emailsSent} weekly recap${emailsSent !== 1 ? "s" : ""}; ` +
      `skipped ${skippedEmptyWeek} with no moments this week`,
      { status: 200 },
    );

  } catch (err) {
    return new Response(`Error: ${err}`, { status: 500 });
  }
});
