// ── Shared by every Moment Jar edge function ──────────────────────────────────
// One place for the sender identity and the time-zone helpers both email
// functions need. Import with:  import { ... } from "../_shared/email.ts";

// Sender identity. The momentjar.app domain must be verified in Resend before
// these addresses will deliver (see SETUP.md § 6).
export const EMAIL_FROM = "Moment Jar <reminders@momentjar.app>";
export const EMAIL_REPLY_TO = "support@harelin.com";

// Validate an IANA time zone string; fall back to UTC if missing/invalid.
export function safeTz(tz: string | null): string {
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
export function tzDateStr(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
