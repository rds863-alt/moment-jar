// ── Date helpers ───────────────────────────────────────────────────────────────
// The user's LOCAL calendar date as YYYY-MM-DD — the day it is for *them*,
// never UTC. (Intl en-CA yields YYYY-MM-DD in the browser's own time zone, so
// a moment added at 11pm is dated today, not tomorrow-in-UTC.)
export function todayStr() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}
// The browser's IANA time zone (e.g. "America/New_York") — saved with reminder
// prefs so the daily-reminders function can fire at the user's real local time.
export function getTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; }
}
export function parseDate(s) {
  // Parse the YYYY-MM-DD prefix as a LOCAL date. Slicing to 10 chars tolerates
  // any stray time component and avoids the classic `new Date("YYYY-MM-DD")`
  // UTC-midnight shift that pushes dates a day off in negative-offset zones.
  const [y, m, d] = String(s || "").slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export function formatDate(s) {
  const d = parseDate(s);
  const t = parseDate(todayStr());
  const diff = Math.round((t - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}
// Warm, human date like "March 4th" — used in the year-in-review playback.
export function formatWarmDate(s) {
  const d = parseDate(s);
  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const n = d.getDate();
  const suffix = (n % 100 >= 11 && n % 100 <= 13) ? "th"
    : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${months[d.getMonth()]} ${n}${suffix}`;
}
