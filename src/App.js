import React, { useState, useEffect, useMemo, useRef } from "react";

// ════════════════════════════════════════════════════════════════════════════
//  Moment Jar
//  "Add one small good thing that happened today. At the end of the year,
//   open the jar and read them all back."
//
//  Tech notes (inherited from the LifeOnTrack project — read its handoff first):
//   • Auth is OTP 6-digit email codes via RAW FETCH. Do NOT add @supabase/supabase-js
//     — its module load crashed mobile browsers (white screen everywhere) and the
//     raw-fetch approach fixed it + cut the bundle in half.
//   • localStorage gives instant load; Supabase syncs in the background.
// ════════════════════════════════════════════════════════════════════════════

// ── Palette (warm amber/brown — deliberately NOT LifeOnTrack's navy) ──────────
const C = {
  dark:    "#1a0a00", // primary/dark
  accent:  "#C84B11", // accent
  accentD: "#A33A0D", // accent pressed
  gold:    "#FFD200", // warm sparkle highlight
  bg:      "#FFF8F0", // background
  card:    "#FFFFFF",
  cream:   "#FBEEE2", // warm panel
  border:  "#EADBCB",
  text:    "#3D2A1C", // warm near-black body text
  muted:   "#8A7866", // muted brown
};

// ── Supabase config ───────────────────────────────────────────────────────────
// Moment Jar gets its OWN Supabase project (separate data from LifeOnTrack).
// Create the project, run the SQL in SETUP.md, then paste the values below.
const SUPABASE_URL = "https://afhcuanapgsxrorvygfi.supabase.co";
const SUPABASE_KEY = "sb_publishable_82U-uQThAEPZJaHY9_f1KA_eOFYc24V";

// ── Moods & tags ──────────────────────────────────────────────────────────────
// Curated, warm emotional range. Existing emoji are kept exactly — saved
// moments store the emoji string itself, so changing one would orphan moments
// already using it. New moods are only appended.
const MOODS = [
  { emoji: "😊", label: "Happy" },
  { emoji: "😂", label: "Funny" },
  { emoji: "😌", label: "Peaceful" },
  { emoji: "🥰", label: "Loved" },
  { emoji: "✨", label: "Special" },
  { emoji: "🙏", label: "Grateful" },
  { emoji: "😍", label: "Excited" },
  { emoji: "🥹", label: "Proud" },
  { emoji: "🫶", label: "Content" },
  { emoji: "🥲", label: "Nostalgic" },
  { emoji: "😇", label: "Hopeful" },
];
const TAGS = ["family", "nature", "work", "food", "friends", "simple joy"];

// Optional thinking aids for the add-moment sheet. Never saved — just sparks.
// ~100 prompts spread widely across angles so a daily user rarely repeats:
// gratitude, humor, small joys, people, the senses, accomplishments, nature,
// comfort/rest, anticipation, self-reflection, ordinary moments, surprises,
// kindness, food, places, learning, and quiet peace.
const INSPIRATION_PROMPTS = [
  // Gratitude
  "Who are you grateful for today?",
  "What's something you almost take for granted but are glad to have?",
  "What's a small thing someone did that you appreciated?",
  "What are you thankful made it into your day?",
  "What about your life right now are you grateful for?",
  // Humor
  "What made you laugh recently?",
  "What's the silliest thing you saw or heard today?",
  "Did anything make you smile when you weren't expecting to?",
  "What was a little ridiculous today, in a good way?",
  "What made you grin to yourself?",
  // Small joys
  "What's something small that went right?",
  "What tiny thing made today a little better?",
  "What small win can you give yourself credit for?",
  "What little thing felt nicer than it should have?",
  "What's a small pleasure you enjoyed today?",
  // People you love
  "What's a moment with someone you love?",
  "Who made you feel cared for recently?",
  "What did someone say that stayed with you?",
  "Who did you think of fondly today?",
  "What's a moment of connection you had with someone?",
  "Who made you feel less alone today?",
  // Senses — taste
  "What's something that tasted really good lately?",
  "What flavor surprised or delighted you recently?",
  "What did you eat or drink that you truly savored?",
  // Senses — sound
  "What's a sound that made you pause today?",
  "What did you hear that you loved — music, a voice, the quiet?",
  "What sound felt comforting recently?",
  // Senses — smell
  "What's a smell that made you feel something today?",
  "What scent brought back a good memory?",
  // Senses — sight
  "What did you notice today that you'd normally miss?",
  "What's something beautiful that caught your eye?",
  "What colors or light stood out to you today?",
  // Senses — touch
  "What felt good to touch today — warmth, softness, a hug?",
  "What's a physical comfort you noticed today?",
  // Accomplishments, big and small
  "What did you do today that you're a little proud of?",
  "What's something you finished or made progress on?",
  "What did you handle better than you expected?",
  "What's a hard thing you showed up for?",
  "What small task felt good to get done?",
  "What would your past self be proud of you for today?",
  // Nature and weather
  "Where did you see something beautiful outside?",
  "What did you notice about the sky today?",
  "What was the weather like, and how did it feel?",
  "What in nature caught your attention?",
  "Did you feel the sun, wind, or rain today?",
  "What plant, tree, or animal did you notice?",
  // Comfort and rest
  "What's a comfort you leaned on today?",
  "When did you feel cozy or at ease today?",
  "What helped you rest or slow down?",
  "What felt like a deep breath today?",
  "Where did you feel most comfortable today?",
  // Anticipation / looking forward
  "What's something you're looking forward to?",
  "What are you excited about, even a little?",
  "What plan or hope makes you smile?",
  "What's coming up that you're glad about?",
  // Self-reflection
  "When did you feel most like yourself today?",
  "What did you learn about yourself recently?",
  "What's something you're proud of about who you are?",
  "How were you kind to yourself today?",
  "What feeling from today do you want to remember?",
  // Everyday ordinary moments
  "What's an ordinary moment from today worth keeping?",
  "What did your morning hold that was good?",
  "What part of your routine do you actually enjoy?",
  "What ordinary thing felt a little special today?",
  "What's a quiet moment from your day?",
  // Things that surprised you
  "What surprised you in a good way?",
  "What unexpected thing brightened your day?",
  "What caught you off guard, in a nice way?",
  "What's a pleasant surprise from this week?",
  // Acts of kindness, given or received
  "What's a small kindness you gave or received?",
  "Who was kind to you today?",
  "How did you help someone, even in a small way?",
  "What's a gentle thing someone did near you?",
  "When did you feel looked after today?",
  // Food and meals
  "What's a meal you enjoyed recently?",
  "Who did you share food with lately?",
  "What did you cook, bake, or make?",
  "What's a treat you let yourself have?",
  "What meal felt like comfort?",
  // Places
  "Where did you feel happy to be today?",
  "What's a place you passed through that you liked?",
  "What corner of your home do you love?",
  "Where did you feel a sense of belonging?",
  "What place made you feel calm?",
  // Learning something new
  "What's something new you learned today?",
  "What did you figure out or understand better?",
  "What sparked your curiosity recently?",
  "What's something interesting you read, heard, or saw?",
  // Quiet, peaceful moments
  "When did you feel most at peace today?",
  "What's a quiet moment you'd like to hold onto?",
  "When did everything feel still, even for a second?",
  "What gave you a sense of calm today?",
  // A few more, mixed
  "Who made your day a little easier?",
  "What made you feel hopeful today?",
  "What's something you're glad you said yes to?",
  "What made you feel proud of someone else?",
  "What moment from today would you happily relive?",
  "What felt like a gift today, even a small one?",
  "What made you feel alive today?",
  "What good thing happened that you almost forgot?",
];

// ── localStorage keys ───────────────────────────────────────────────────────
const LS_MOMENTS = "mj_moments_v1";

const FILL_GOAL = 100; // moments that visually "fill" the jar to the brim

// Sparkle burst directions (radiate up/outward from the jar on a successful save)
const SPARKLES = [
  { tx: "-64px", ty: "-58px", size: "20px", delay: 0 },
  { tx: "60px",  ty: "-50px", size: "16px", delay: 40 },
  { tx: "-80px", ty: "4px",   size: "14px", delay: 70 },
  { tx: "82px",  ty: "-2px",  size: "18px", delay: 20 },
  { tx: "-42px", ty: "60px",  size: "15px", delay: 95 },
  { tx: "50px",  ty: "64px",  size: "17px", delay: 60 },
  { tx: "2px",   ty: "-86px", size: "16px", delay: 30 },
  { tx: "26px",  ty: "-72px", size: "13px", delay: 110 },
  { tx: "-28px", ty: "-76px", size: "14px", delay: 100 },
];

// ════════════════════════════════════════════════════════════════════════════
//  Auth + Supabase helpers (raw fetch — mirrors LifeOnTrack)
// ════════════════════════════════════════════════════════════════════════════
function getToken() { try { return localStorage.getItem("sb_token") || ""; } catch { return ""; } }
function setToken(t) { try { localStorage.setItem("sb_token", t); } catch {} }
function getRefreshToken() { try { return localStorage.getItem("sb_refresh") || ""; } catch { return ""; } }
function setRefreshToken(t) { try { localStorage.setItem("sb_refresh", t); } catch {} }
function clearToken() { try { localStorage.removeItem("sb_token"); localStorage.removeItem("sb_refresh"); localStorage.removeItem("sb_user"); } catch {} }
function getStoredUser() { try { const u = localStorage.getItem("sb_user"); return u ? JSON.parse(u) : null; } catch { return null; } }
function storeUser(user) { try { localStorage.setItem("sb_user", JSON.stringify(user)); } catch {} }

// Exchange the refresh token for a fresh access token. Access tokens (JWTs)
// expire after ~1h; without this, every authenticated read/write silently
// 401s once the token expires while the cached user keeps the UI "signed in".
async function refreshSession() {
  try {
    const refresh_token = getRefreshToken();
    if (!refresh_token) return false;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token })
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.access_token) {
      setToken(data.access_token);
      if (data.refresh_token) setRefreshToken(data.refresh_token);
      if (data.user) storeUser(data.user);
      return true;
    }
    return false;
  } catch { return false; }
}

async function getSession() {
  try {
    const token = getToken();
    if (!token) return getStoredUser();
    const fetchUser = () => fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${getToken()}` }
    });
    let res = await fetchUser();
    // Token expired? Refresh once and retry before giving up.
    if ((res.status === 401 || res.status === 403) && await refreshSession()) {
      res = await fetchUser();
    }
    if (!res.ok) return getStoredUser();
    const data = await res.json();
    if (data?.id) { storeUser(data); return data; }
    return getStoredUser();
  } catch { return getStoredUser(); }
}

async function signInWithEmail(email) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, create_user: true })
    });
    return res.ok;
  } catch { return false; }
}

async function verifyOtp(email, token) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, type: "email" })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      setToken(data.access_token);
      if (data.refresh_token) setRefreshToken(data.refresh_token);
      if (data.user) storeUser(data.user);
    }
    return data;
  } catch { return null; }
}

async function signOut() {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${getToken()}` }
    });
  } catch {}
  clearToken();
}

async function sbFetch(path, options = {}) {
  // Build headers fresh each attempt so a mid-call token refresh is picked up.
  const buildHeaders = () => ({
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${getToken() || SUPABASE_KEY}`,
    "Prefer": "return=minimal",
    ...(options.headers || {})
  });
  let res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: buildHeaders() });
  // Access token expired mid-session? Refresh once and retry the request.
  if ((res.status === 401 || res.status === 403) && getRefreshToken() && await refreshSession()) {
    res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: buildHeaders() });
  }
  return res;
}

// ── Moment data (one row per moment) ──────────────────────────────────────────
async function loadMomentsRemote(userId) {
  try {
    const res = await sbFetch(
      `moments?user_id=eq.${userId}&select=id,text,mood,tag,date,created_at&order=created_at.desc`,
      { headers: { "Prefer": "" } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function saveMomentRemote(userId, m) {
  try {
    const res = await sbFetch("moments", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({
        id: m.id, user_id: userId, text: m.text, mood: m.mood,
        tag: m.tag, date: m.date, created_at: m.created_at
      })
    });
    return res.ok;
  } catch { return false; }
}

async function deleteMomentRemote(userId, id) {
  try {
    const res = await sbFetch(`moments?id=eq.${id}&user_id=eq.${userId}`, { method: "DELETE" });
    return res.ok;
  } catch { return false; }
}

async function updateMomentRemote(userId, id, fields) {
  try {
    const res = await sbFetch(`moments?id=eq.${id}&user_id=eq.${userId}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    });
    return res.ok;
  } catch { return false; }
}

async function savePreferences(userId, fields) {
  try {
    const res = await sbFetch("preferences", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ user_id: userId, ...fields, updated_at: new Date().toISOString() })
    });
    return res.ok;
  } catch { return false; }
}

async function loadPreferences(userId) {
  try {
    const res = await sbFetch(
      `preferences?user_id=eq.${userId}&select=reminder_enabled,reminder_time`,
      { headers: { "Prefer": "" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.length > 0 ? data[0] : null;
  } catch { return null; }
}

// ── Local persistence ─────────────────────────────────────────────────────────
function loadMomentsLocal() {
  try { const s = localStorage.getItem(LS_MOMENTS); return s ? JSON.parse(s) : []; } catch { return []; }
}
function saveMomentsLocal(moments) {
  try { localStorage.setItem(LS_MOMENTS, JSON.stringify(moments)); } catch {}
}

// ── Date helpers ───────────────────────────────────────────────────────────────
// The user's LOCAL calendar date as YYYY-MM-DD — the day it is for *them*,
// never UTC. (Intl en-CA yields YYYY-MM-DD in the browser's own time zone, so
// a moment added at 11pm is dated today, not tomorrow-in-UTC.)
function todayStr() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}
// The browser's IANA time zone (e.g. "America/New_York") — saved with reminder
// prefs so the daily-reminders function can fire at the user's real local time.
function getTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; }
}
function parseDate(s) {
  // Parse the YYYY-MM-DD prefix as a LOCAL date. Slicing to 10 chars tolerates
  // any stray time component and avoids the classic `new Date("YYYY-MM-DD")`
  // UTC-midnight shift that pushes dates a day off in negative-offset zones.
  const [y, m, d] = String(s || "").slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function formatDate(s) {
  const d = parseDate(s);
  const t = parseDate(todayStr());
  const diff = Math.round((t - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}
// Warm, human date like "March 4th" — used in the year-in-review playback.
function formatWarmDate(s) {
  const d = parseDate(s);
  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const n = d.getDate();
  const suffix = (n % 100 >= 11 && n % 100 <= 13) ? "th"
    : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${months[d.getMonth()]} ${n}${suffix}`;
}
function truncate(s, n) { return (s || "").length > n ? (s || "").slice(0, n - 1).trimEnd() + "…" : (s || ""); }
function moodEmoji(m) { return m || "✨"; }

// ════════════════════════════════════════════════════════════════════════════
//  Jar illustration — fills as moments accumulate
// ════════════════════════════════════════════════════════════════════════════
function Jar({ count, fraction, celebrate }) {
  const interiorTop = 56, interiorBottom = 222, interiorLeft = 46, interiorRight = 154;
  const interiorH = interiorBottom - interiorTop;
  const fillH = fraction <= 0 ? 0 : Math.max(8, fraction * interiorH);
  const fillTop = interiorBottom - fillH;

  // Deterministic scattered "moment" dots within the filled liquid
  const dots = useMemo(() => {
    const n = Math.min(count, 42);
    const arr = [];
    let seed = 13;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < n; i++) {
      const x = interiorLeft + 10 + rand() * (interiorRight - interiorLeft - 20);
      const usableH = Math.max(6, fillH - 12);
      const y = interiorBottom - 8 - rand() * usableH;
      arr.push({ x, y, r: 2.4 + rand() * 2.4, o: 0.5 + rand() * 0.45 });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, fraction]);

  return (
    <svg viewBox="0 0 200 240" width="100%" height="100%" style={{ display: "block", maxHeight: 280 }}>
      <defs>
        <linearGradient id="liquid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8742E" />
          <stop offset="100%" stopColor={C.accent} />
        </linearGradient>
        <clipPath id="jarInterior">
          <path d="M46 56 Q46 50 52 50 L148 50 Q154 50 154 56 L154 212 Q154 224 142 224 L58 224 Q46 224 46 212 Z" />
        </clipPath>
      </defs>

      {/* Lid */}
      <rect x="62" y="14" width="76" height="20" rx="7" fill={C.dark} />
      <rect x="70" y="30" width="60" height="12" rx="4" fill="#2e1505" />

      {/* Liquid fill (clipped to jar interior) */}
      <g clipPath="url(#jarInterior)">
        {/* rect + surface ride together so the ripple reads as one settling wave */}
        <g className={celebrate ? "mj-rippling" : ""}
          style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}>
          <rect
            x="40" width="120" y={fillTop} height={fillH + 6}
            fill="url(#liquid)"
            style={{ transition: "y .9s cubic-bezier(.22,1,.36,1), height .9s cubic-bezier(.22,1,.36,1)" }}
          />
          {/* surface highlight */}
          {fraction > 0 && (
            <ellipse cx="100" cy={fillTop} rx="58" ry="5" fill="#F4A86A" opacity="0.85"
              style={{ transition: "cy .9s cubic-bezier(.22,1,.36,1)" }} />
          )}
        </g>
        {dots.map((d, i) => (
          // Soft, warm, translucent bubbles — consistent across every jar.
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="rgba(255, 230, 200, 0.20)" />
        ))}
      </g>

      {/* Glass body outline */}
      <path
        d="M46 56 Q46 50 52 50 L148 50 Q154 50 154 56 L154 212 Q154 224 142 224 L58 224 Q46 224 46 212 Z"
        fill="none" stroke={C.dark} strokeWidth="4" strokeLinejoin="round"
      />
      {/* glass shine */}
      <path d="M60 64 L60 200" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

// ── Small UI bits ──────────────────────────────────────────────────────────────
function MomentCard({ m, onDelete, onEdit }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
      padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start"
    }}>
      <div style={{ fontSize: 26, lineHeight: 1 }}>{moodEmoji(m.mood)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.text, fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.text}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ color: C.muted, fontSize: 12.5 }}>{formatDate(m.date)}</span>
          {m.tag && (
            <span style={{
              background: C.cream, color: C.accentD, fontSize: 11.5, fontWeight: 600,
              padding: "2px 9px", borderRadius: 999
            }}>{m.tag}</span>
          )}
        </div>
      </div>
      {(onEdit || onDelete) && (
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {onEdit && (
            <button onClick={() => onEdit(m)} title="Edit" aria-label="Edit moment" style={{
              background: "none", border: "none", color: C.muted, cursor: "pointer",
              fontSize: 15, padding: 2, lineHeight: 1
            }}>✎</button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(m)} title="Remove" aria-label="Remove moment" style={{
              background: "none", border: "none", color: C.muted, cursor: "pointer",
              fontSize: 16, padding: 2, lineHeight: 1
            }}>✕</button>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Open your jar — full-screen year-in-review playback
// ════════════════════════════════════════════════════════════════════════════
function ReviewStat({ label, value, big }) {
  return (
    <div>
      <div style={{ color: "#C89B6A", fontSize: 11.5, fontWeight: 600, letterSpacing: ".6px", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: "#FFF8F0", fontSize: big ? 30 : 16, marginTop: 5, lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}

function JarReview({ moments, year, onClose }) {
  const total = moments.length;
  const [i, setI] = useState(0);          // 0..total-1 = cards, total = summary
  const startX = useRef(null);
  const atSummary = i >= total;

  const next = () => setI(v => Math.min(v + 1, total));
  const prev = () => setI(v => Math.max(v - 1, 0));

  // Keyboard navigation (desktop): →/space advance, ← back, esc closes.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const stats = useMemo(() => {
    const tally = {};
    moments.forEach(m => { const k = m.mood || "✨"; tally[k] = (tally[k] || 0) + 1; });
    let mood = "✨", c = 0;
    for (const [k, v] of Object.entries(tally)) if (v > c) { c = v; mood = k; }
    return { mood, first: moments[0] };
  }, [moments]);

  const onTouchStart = (e) => { startX.current = e.changedTouches[0].clientX; };
  const onTouchEnd = (e) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    startX.current = null;
    if (dx < -45) next();
    else if (dx > 45) prev();
  };

  const m = !atSummary ? moments[i] : null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, fontFamily: "'Instrument Sans',sans-serif",
      background: "linear-gradient(165deg, #1a0a00 0%, #2e1505 100%)", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
        @keyframes mjcardin{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion: reduce){.mj-review-card{animation:none!important}}
      `}</style>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "calc(env(safe-area-inset-top) + 16px) 22px 10px" }}>
        <div style={{ color: "#C89B6A", fontSize: 13, fontWeight: 600, letterSpacing: ".3px" }}>
          {atSummary ? `${year} in your jar` : `${i + 1} of ${total}`}
        </div>
        <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none",
          color: "#C89B6A", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: 4 }}>✕</button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "rgba(255,210,170,.15)", margin: "0 22px", borderRadius: 99 }}>
        <div style={{ height: "100%", width: `${(Math.min(i, total) / total) * 100}%`,
          background: C.accent, borderRadius: 99, transition: "width .4s cubic-bezier(.22,1,.36,1)" }} />
      </div>

      {/* Stage */}
      <div onClick={() => !atSummary && next()} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px", cursor: atSummary ? "default" : "pointer", overflowY: "auto" }}>

        {!atSummary ? (
          <div key={i} className="mj-review-card" style={{ width: "100%", maxWidth: 420, background: C.bg,
            borderRadius: 24, padding: "44px 32px", textAlign: "center", boxShadow: "0 20px 55px rgba(0,0,0,.4)",
            animation: "mjcardin .5s cubic-bezier(.22,1,.36,1)" }}>
            <div style={{ color: C.accentD, fontSize: 13, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>
              {formatWarmDate(m.date)}
            </div>
            <div style={{ fontSize: 54, margin: "20px 0 14px", lineHeight: 1 }}>{m.mood || "✨"}</div>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, color: C.text, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
              {m.text}
            </div>
            {m.tag && (
              <div style={{ marginTop: 20, display: "inline-block", background: C.cream, color: C.accentD,
                fontSize: 12.5, fontWeight: 600, padding: "4px 13px", borderRadius: 999 }}>{m.tag}</div>
            )}
          </div>
        ) : (
          <div key="summary" className="mj-review-card" style={{ width: "100%", maxWidth: 440, textAlign: "center",
            animation: "mjcardin .6s cubic-bezier(.22,1,.36,1)" }}>
            <div style={{ fontSize: 42 }}>🫙</div>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 32, color: "#FFF8F0", marginTop: 12, lineHeight: 1.2 }}>
              This was your year.
            </div>
            <div style={{ color: "#E8C9A8", fontSize: 16, marginTop: 8 }}>More than you remembered.</div>

            <div style={{ background: "rgba(255,248,240,.06)", border: "1px solid rgba(255,210,170,.18)",
              borderRadius: 18, padding: "22px 22px", marginTop: 28, textAlign: "left",
              display: "flex", flexDirection: "column", gap: 18 }}>
              <ReviewStat label="Moments this year" value={`${total}`} />
              <ReviewStat label="Your most-felt mood" value={stats.mood} big />
              {stats.first && (
                <ReviewStat label="Where it started"
                  value={`${formatWarmDate(stats.first.date)} — "${truncate(stats.first.text, 64)}"`} />
              )}
            </div>

            <button onClick={onClose} style={{ marginTop: 28, background: C.accent, color: "#fff", border: "none",
              borderRadius: 14, padding: "14px 28px", fontSize: 15, fontWeight: 600, fontFamily: "inherit",
              cursor: "pointer", width: "100%", maxWidth: 280 }}>
              Close the jar
            </button>
            <div>
              <button onClick={() => setI(0)} style={{ marginTop: 14, background: "none", border: "none",
                color: "#C89B6A", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Read them again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hint */}
      {!atSummary && (
        <div style={{ textAlign: "center", color: "rgba(232,201,168,.7)", fontSize: 13,
          padding: "0 20px calc(env(safe-area-inset-bottom) + 22px)" }}>
          Tap or swipe to continue
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  App
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [authScreen, setAuthScreen] = useState("loading"); // loading|landing|login|verify|app
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());

  const [authEmail, setAuthEmail] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [moments, setMoments] = useState(() => loadMomentsLocal());
  const [tab, setTab] = useState("jar"); // jar|browse
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false); // "Open your jar" year-in-review
  const [toast, setToast] = useState(null);
  const [animIn, setAnimIn] = useState(false);

  // Add-memory draft
  const [draftText, setDraftText] = useState("");
  const [draftMood, setDraftMood] = useState(null);
  const [draftTag, setDraftTag] = useState(null);
  const [dropping, setDropping] = useState(false);
  // Optional inspiration prompt (stays hidden until the user asks for it)
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);

  // Editing an existing moment (text / mood / tag)
  const [editMoment, setEditMoment] = useState(null);
  const [editText, setEditText] = useState("");
  const [editMood, setEditMood] = useState(null);
  const [editTag, setEditTag] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Browse filters
  const [filterMood, setFilterMood] = useState(null);
  const [filterTag, setFilterTag] = useState(null);

  // Daily reminder preferences (synced to the preferences table)
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");

  // Random "from your jar" pick — chosen once per app open, then held steady
  const [randomPast, setRandomPast] = useState(null);
  const pickedRandomRef = useRef(false);

  // Drop-in-the-jar celebration (sparkle burst + liquid ripple + count bounce)
  const [celebrate, setCelebrate] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const celebrateTimer = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2400); };

  useEffect(() => { setTimeout(() => setAnimIn(true), 60); }, []);

  // Clear any pending celebration timer on unmount
  useEffect(() => () => { if (celebrateTimer.current) clearTimeout(celebrateTimer.current); }, []);

  // Each time the add sheet opens, tuck the inspiration prompt away again.
  useEffect(() => { if (addOpen) setShowPrompt(false); }, [addOpen]);

  // Reveal a prompt (start on a random one), or shuffle to a different one.
  const revealPrompt = () => {
    setPromptIndex(Math.floor(Math.random() * INSPIRATION_PROMPTS.length));
    setShowPrompt(true);
  };
  const shufflePrompt = () => {
    setPromptIndex(prev => {
      if (INSPIRATION_PROMPTS.length < 2) return prev;
      let n = prev;
      while (n === prev) n = Math.floor(Math.random() * INSPIRATION_PROMPTS.length);
      return n;
    });
  };

  // ── Persist locally whenever moments change ──
  useEffect(() => { saveMomentsLocal(moments); }, [moments]);

  // ── Pick one random past moment per app open ("✨ From your jar") ──
  // Locks to the first time we have >1 moment this session, then holds steady
  // (so it won't reshuffle when a new moment is added or data syncs in).
  useEffect(() => {
    if (pickedRandomRef.current) return;
    if (moments.length > 1) {
      pickedRandomRef.current = true;
      const today = todayStr();
      // prefer an older moment for a "rediscovery" feel; fall back to any
      const pool = moments.filter(m => m.date !== today);
      const candidates = pool.length > 0 ? pool : moments;
      setRandomPast(candidates[Math.floor(Math.random() * candidates.length)]);
    }
  }, [moments]);

  // ── Auth + sync on mount ──
  useEffect(() => {
    const local = loadMomentsLocal();
    if (local.length > 0) { setAuthScreen("app"); setAuthChecked(true); }

    const timeout = setTimeout(() => setAuthChecked(true), 5000);

    getSession().then(async (user) => {
      clearTimeout(timeout);
      if (user && user.id) {
        storeUser(user);
        setCurrentUser(user);
        setAuthScreen("app");
        setAuthChecked(true);
        await savePreferences(user.id, { email: user.email });
        const prefs = await loadPreferences(user.id);
        if (prefs) {
          setReminderEnabled(prefs.reminder_enabled === true);
          setReminderTime(prefs.reminder_time || "20:00");
        }
        await syncMoments(user.id);
      } else {
        if (local.length === 0) setAuthScreen("landing");
        else setAuthScreen("app");
        setAuthChecked(true);
      }
    }).catch(() => { clearTimeout(timeout); setAuthChecked(true); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Merge remote + local by id; upload any local-only moments
  const syncMoments = async (userId) => {
    try {
      const remote = await loadMomentsRemote(userId);
      const local = loadMomentsLocal();
      if (remote == null) { return; } // offline / error — keep local
      const byId = {};
      remote.forEach(m => { byId[m.id] = m; });
      const localOnly = local.filter(m => !byId[m.id]);
      // Push local-only moments up to the server. Keep each one locally either
      // way (so it's never lost and gets retried on the next sync), but count
      // failures so we can surface them instead of hiding a sync problem.
      let failed = 0;
      for (const m of localOnly) {
        const ok = await saveMomentRemote(userId, m);
        if (!ok) failed++;
        byId[m.id] = m;
      }
      const merged = Object.values(byId).sort((a, b) =>
        (b.created_at || "").localeCompare(a.created_at || ""));
      setMoments(merged);
      saveMomentsLocal(merged);
      if (failed > 0) {
        showToast(`${failed} moment${failed !== 1 ? "s" : ""} haven't synced yet — we'll keep trying`);
      }
    } catch {}
  };

  // ── Auth handlers ──
  const handleSignIn = async () => {
    if (!authEmail) return;
    setAuthLoading(true); setAuthError("");
    const ok = await signInWithEmail(authEmail);
    if (ok) setAuthScreen("verify");
    else setAuthError("Couldn't send code. Check your email and try again.");
    setAuthLoading(false);
  };

  const handleVerify = async () => {
    if (!authOtp) return;
    setAuthLoading(true); setAuthError("");
    const data = await verifyOtp(authEmail, authOtp);
    if (data && data.user) {
      setCurrentUser(data.user);
      setAuthScreen("app");
      setAuthChecked(true);
      await savePreferences(data.user.id, { email: data.user.email });
      const prefs = await loadPreferences(data.user.id);
      if (prefs) {
        setReminderEnabled(prefs.reminder_enabled === true);
        setReminderTime(prefs.reminder_time || "20:00");
      }
      await syncMoments(data.user.id);
    } else {
      setAuthError("Invalid code. Please try again.");
    }
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
    setSettingsOpen(false);
    setAuthEmail(""); setAuthOtp("");
    setAuthScreen("landing");
  };

  // ── Daily reminder preferences ──
  // Optimistically update the UI, then persist to the preferences table
  // the same way every other preference is saved (sbFetch upsert).
  const saveReminderPrefs = async (enabled, time) => {
    setReminderEnabled(enabled);
    setReminderTime(time);
    if (!currentUser?.id) { showToast("Sign in to save reminders"); return; }
    // Capture the browser's time zone so reminders fire at the user's local time.
    const ok = await savePreferences(currentUser.id, { reminder_enabled: enabled, reminder_time: time, timezone: getTimeZone() });
    if (ok) showToast(enabled ? "Reminder saved 🕯️" : "Reminders off");
    else showToast("Couldn't save — please try again");
  };

  // ── Add a memory ──
  const dropInJar = async () => {
    const text = draftText.trim();
    if (!text) return;
    setDropping(true);
    const m = {
      id: crypto.randomUUID(),
      text,
      mood: draftMood || "✨",
      tag: draftTag || null,
      date: todayStr(),
      created_at: new Date().toISOString(),
    };
    const next = [m, ...moments].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    setMoments(next);
    saveMomentsLocal(next);
    // reset draft + close
    setDraftText(""); setDraftMood(null); setDraftTag(null);
    setAddOpen(false); setDropping(false);
    setTab("jar");
    // Celebrate the successful save — sparkles + ripple + count bounce.
    // Each trigger gets a fresh key so the CSS animations restart on rapid adds.
    setCelebrateKey(k => k + 1);
    setCelebrate(true);
    if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    celebrateTimer.current = setTimeout(() => setCelebrate(false), 850);
    showToast("Dropped in the jar ✨");
    // The moment is already safe on this device; sync to the account in the
    // background. If it fails, say so gently — it'll retry on the next sync.
    if (currentUser?.id) {
      const ok = await saveMomentRemote(currentUser.id, m);
      if (!ok) showToast("Saved on this device — it'll sync to your account later");
    }
  };

  const deleteMoment = async (m) => {
    if (!window.confirm("Remove this moment from your jar?")) return;
    const next = moments.filter(x => x.id !== m.id);
    setMoments(next);
    saveMomentsLocal(next);
    // A failed remote delete would otherwise reappear silently on next sync,
    // so surface it rather than hiding the failure.
    if (currentUser?.id) {
      const ok = await deleteMomentRemote(currentUser.id, m.id);
      if (!ok) showToast("Couldn't remove from your account — please try again");
    }
  };

  // ── Edit an existing moment (text / mood / tag) ──
  const openEdit = (m) => {
    setEditMoment(m);
    setEditText(m.text || "");
    setEditMood(m.mood || null);
    setEditTag(m.tag || null);
  };

  const saveEdit = async () => {
    const text = editText.trim();
    if (!editMoment || !text) return;
    setSavingEdit(true);
    const id = editMoment.id;
    const fields = { text, mood: editMood || "✨", tag: editTag || null };
    const next = moments.map(x => x.id === id ? { ...x, ...fields } : x);
    setMoments(next);
    saveMomentsLocal(next);
    setEditMoment(null); setSavingEdit(false);
    showToast("Moment updated ✨");
    // Persist the edit to the account; surface failure gently (retries on sync).
    if (currentUser?.id) {
      const ok = await updateMomentRemote(currentUser.id, id, fields);
      if (!ok) showToast("Saved on this device — it'll sync to your account later");
    }
  };

  // ── Derived data ──
  const currentYear = new Date().getFullYear();
  const thisYearMoments = useMemo(
    () => moments.filter(m => parseDate(m.date).getFullYear() === currentYear),
    [moments, currentYear]
  );
  const fraction = thisYearMoments.length === 0 ? 0
    : Math.max(0.05, Math.min(thisYearMoments.length / FILL_GOAL, 1));

  // This year's moments oldest-first, for the "Open your jar" playback.
  const reviewChrono = useMemo(
    () => [...thisYearMoments].sort((a, b) => (a.created_at || "").localeCompare(b.created_at || "")),
    [thisYearMoments]
  );
  const canOpenJar = reviewChrono.length >= 10;

  const onThisDay = useMemo(() => {
    const td = parseDate(todayStr());
    const mmdd = `${String(td.getMonth() + 1).padStart(2, "0")}-${String(td.getDate()).padStart(2, "0")}`;
    return moments.filter(m => {
      const d = parseDate(m.date);
      const mm = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return mm === mmdd && d.getFullYear() < currentYear;
    });
  }, [moments, currentYear]);

  const recents = moments.slice(0, 4);

  const addedToday = useMemo(() => {
    const today = todayStr();
    return moments.some(m => m.date === today);
  }, [moments]);

  // Keep the random pick valid if it gets deleted during the session
  // Resolve from current state by id so edits/deletes reflect in the card too.
  const randomPastMoment = randomPast ? (moments.find(m => m.id === randomPast.id) || null) : null;

  const filtered = useMemo(() => moments.filter(m =>
    (!filterMood || m.mood === filterMood) && (!filterTag || m.tag === filterTag)
  ), [moments, filterMood, filterTag]);

  const usedTags = useMemo(() => TAGS.filter(t => moments.some(m => m.tag === t)), [moments]);

  // ════════════════════════════════════════════════════════════════════════
  //  Shared style block
  // ════════════════════════════════════════════════════════════════════════
  const styleTag = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
      *{box-sizing:border-box}
      .mj-inp{background:#fff;border:1px solid ${C.border};border-radius:12px;padding:12px 16px;color:${C.text};font-family:inherit;font-size:15px;width:100%;outline:none;transition:border .15s,box-shadow .15s}
      .mj-inp:focus{border-color:${C.accent};box-shadow:0 0 0 3px rgba(200,75,17,.12)}
      .mj-inp::placeholder{color:#B9A892}
      .mj-btn{background:${C.accent};color:#fff;border:none;border-radius:12px;padding:14px;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;width:100%;transition:background .15s,transform .08s}
      .mj-btn:hover{background:${C.accentD}}
      .mj-btn:active{transform:scale(.985)}
      .mj-btn:disabled{background:#D8BCA6;cursor:not-allowed}
      .mj-chip{border:1px solid ${C.border};background:#fff;color:${C.muted};border-radius:999px;padding:7px 14px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all .12s}
      .mj-chip.on{background:${C.accent};border-color:${C.accent};color:#fff}
      .mj-mood{border:1px solid ${C.border};background:#fff;border-radius:14px;width:54px;height:54px;font-size:26px;cursor:pointer;transition:all .12s;display:flex;align-items:center;justify-content:center}
      .mj-mood.on{border-color:${C.accent};background:${C.cream};transform:scale(1.06)}
      @keyframes mjbounce{0%,80%,100%{transform:scale(0.6);opacity:.4}40%{transform:scale(1);opacity:1}}
      @keyframes mjfade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      @keyframes mjnudge{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(200,75,17,.20)}50%{transform:scale(1.015);box-shadow:0 0 0 7px rgba(200,75,17,0)}}
      /* ── Drop-in-the-jar celebration ── */
      .mj-spark{position:absolute;left:50%;top:54%;font-size:18px;line-height:1;pointer-events:none;
        filter:drop-shadow(0 0 4px ${C.gold});will-change:transform,opacity;
        animation:mjspark .8s cubic-bezier(.22,1,.36,1) forwards}
      @keyframes mjspark{
        0%{opacity:0;transform:translate(-50%,-50%) translate(0,0) scale(.3) rotate(0deg)}
        18%{opacity:1}
        100%{opacity:0;transform:translate(-50%,-50%) translate(var(--tx),var(--ty)) scale(1.15) rotate(45deg)}}
      .mj-rippling{animation:mjripple .8s cubic-bezier(.22,1,.36,1)}
      @keyframes mjripple{
        0%{transform:translateY(0) scaleY(1)}
        22%{transform:translateY(-3px) scaleY(1.05)}
        50%{transform:translateY(1.5px) scaleY(.975)}
        76%{transform:translateY(-.6px) scaleY(1.01)}
        100%{transform:translateY(0) scaleY(1)}}
      .mj-countpop{display:inline-block;animation:mjcount .6s cubic-bezier(.34,1.56,.64,1)}
      @keyframes mjcount{0%{transform:scale(1)}35%{transform:scale(1.32);color:${C.accent}}100%{transform:scale(1)}}
      @media (prefers-reduced-motion: reduce){
        .mj-nudge,.mj-rippling,.mj-countpop,.mj-spark{animation:none!important}
        .mj-spark{display:none!important}}
    `}</style>
  );

  // ════════════════════════════════════════════════════════════════════════
  //  LOADING
  // ════════════════════════════════════════════════════════════════════════
  if (!authChecked && authScreen === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", fontFamily: "'Instrument Sans',sans-serif" }}>
        {styleTag}
        <div style={{ width: 120, height: 140 }}><Jar count={8} fraction={0.4} /></div>
        <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, color: C.dark, marginTop: 12 }}>Moment Jar</div>
        <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: C.accent,
              animation: `mjbounce 1.2s ${i * 0.16}s infinite ease-in-out` }} />
          ))}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  //  LANDING
  // ════════════════════════════════════════════════════════════════════════
  if (authScreen === "landing") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Instrument Sans',sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "40px 28px", textAlign: "center" }}>
        {styleTag}
        <div style={{ width: 180, height: 220, opacity: animIn ? 1 : 0, transform: animIn ? "none" : "translateY(12px)",
          transition: "all .7s cubic-bezier(.22,1,.36,1)" }}>
          <Jar count={36} fraction={0.62} />
        </div>
        <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 34,
          color: C.dark, margin: "18px 0 0", lineHeight: 1.15, letterSpacing: "-.5px" }}>
          More than you remember.<br />One moment at a time.
        </h1>
        <p style={{ color: C.muted, fontSize: 16, lineHeight: 1.55, maxWidth: 360, margin: "16px 0 30px" }}>
          Add one small good thing that happened today. At the end of the year,
          open the jar and read them all back.
        </p>
        <button className="mj-btn" style={{ maxWidth: 280 }} onClick={() => setAuthScreen("login")}>
          Start your jar
        </button>
        <button onClick={() => setAuthScreen("login")} style={{ background: "none", border: "none",
          color: C.accent, fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 16, fontFamily: "inherit" }}>
          I already have a jar →
        </button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  //  LOGIN / VERIFY
  // ════════════════════════════════════════════════════════════════════════
  if (authScreen === "login" || authScreen === "verify") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Instrument Sans',sans-serif",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
        {styleTag}
        <div style={{ width: "100%", maxWidth: 360 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 64, height: 80, margin: "0 auto 8px" }}><Jar count={24} fraction={0.5} /></div>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, color: C.dark }}>Moment Jar</div>
            <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>One moment at a time</div>
          </div>

          {authScreen === "login" ? (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24 }}>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, marginBottom: 6, color: C.dark }}>Sign in</div>
              <div style={{ color: C.muted, fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
                Enter your email and we'll send you a 6-digit code — no password needed.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input className="mj-inp" type="email" placeholder="your@email.com" value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSignIn()} />
                {authError && <div style={{ color: "#DC2626", fontSize: 13 }}>{authError}</div>}
                <button className="mj-btn" onClick={handleSignIn} disabled={authLoading || !authEmail}>
                  {authLoading ? "Sending code…" : "Send sign-in code"}
                </button>
              </div>
              <div style={{ color: C.muted, fontSize: 12, textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
                New here? Your jar is created automatically. It syncs across all your devices.
              </div>
            </div>
          ) : (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24 }}>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, marginBottom: 6, color: C.dark }}>Check your email</div>
              <div style={{ color: C.muted, fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
                We sent a 6-digit code to <strong>{authEmail}</strong>. Enter it below to sign in.
              </div>
              <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: "10px 14px", marginBottom: 16, fontSize: 12, color: C.accentD, lineHeight: 1.5 }}>
                💡 <strong>First time signing in?</strong> You may get a "confirm your email" message first.
                If so, go back and request the code again — the second email will contain your 6-digit code.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input className="mj-inp" type="number" placeholder="123456" value={authOtp}
                  onChange={e => setAuthOtp(e.target.value)} onKeyDown={e => e.key === "Enter" && handleVerify()}
                  style={{ letterSpacing: "0.3em", fontSize: 24, textAlign: "center", fontWeight: "bold" }} />
                {authError && <div style={{ color: "#DC2626", fontSize: 13, textAlign: "center" }}>{authError}</div>}
                <button className="mj-btn" onClick={handleVerify} disabled={authLoading || !authOtp}>
                  {authLoading ? "Verifying…" : "Open my jar"}
                </button>
                <button onClick={() => { setAuthScreen("login"); setAuthOtp(""); setAuthError(""); }}
                  style={{ background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer",
                    fontFamily: "inherit", padding: 4 }}>
                  ← Use a different email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  //  APP
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Instrument Sans',sans-serif",
      color: C.text, paddingBottom: "calc(86px + env(safe-area-inset-bottom))" }}>
      {styleTag}

      {/* Status-bar spacer (so light icons are visible on the dark theme color) */}
      <div style={{ height: "env(safe-area-inset-top)", background: C.bg }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 20px 8px", maxWidth: 560, margin: "0 auto" }}>
        <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, color: C.dark }}>Moment Jar</div>
        <button onClick={() => setSettingsOpen(true)} aria-label="Settings" style={{ background: "none",
          border: "none", cursor: "pointer", fontSize: 20, color: C.muted, padding: 4 }}>⚙︎</button>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 20px" }}>
        {/* ── JAR (home) ───────────────────────────────────────────── */}
        {tab === "jar" && (
          <div style={{ animation: "mjfade .4s ease" }}>
            {/* On this day */}
            {onThisDay.length > 0 && (
              <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 18,
                padding: 18, marginTop: 8, marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>🕯️</span>
                  <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 18, color: C.accentD }}>
                    {(() => {
                      const yrs = currentYear - parseDate(onThisDay[0].date).getFullYear();
                      return yrs === 1 ? "One year ago today…" : `${yrs} years ago today…`;
                    })()}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {onThisDay.map(m => <MomentCard key={m.id} m={m} />)}
                </div>
              </div>
            )}

            {/* The jar */}
            <div style={{ textAlign: "center", marginTop: onThisDay.length ? 0 : 14 }}>
              <div style={{ position: "relative", width: 220, height: 264, margin: "0 auto" }}>
                <Jar count={thisYearMoments.length} fraction={fraction} celebrate={celebrate} />
                {/* Sparkle burst radiating from the jar */}
                {celebrate && (
                  <div key={celebrateKey} aria-hidden="true"
                    style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
                    {SPARKLES.map((s, i) => (
                      <span key={i} className="mj-spark"
                        style={{ "--tx": s.tx, "--ty": s.ty, animationDelay: `${s.delay}ms`, fontSize: s.size }}>✨</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 30, color: C.dark, marginTop: 4 }}>
                <span key={celebrateKey} className={celebrate ? "mj-countpop" : undefined}>{thisYearMoments.length}</span>
                {" "}{thisYearMoments.length === 1 ? "moment" : "moments"}
              </div>
              <div style={{ color: C.muted, fontSize: 14 }}>this year</div>

              {/* Open your jar — year-in-review, once there are enough moments */}
              {canOpenJar && (
                <button onClick={() => setReviewOpen(true)} style={{
                  marginTop: 20, background: C.dark, color: "#FFF8F0", border: "none", borderRadius: 14,
                  padding: "14px 26px", fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                  boxShadow: "0 6px 18px rgba(26,10,0,.22)" }}>
                  ✨ Open your jar
                </button>
              )}
            </div>

            {/* Daily nudge — only while nothing has been added today */}
            {!addedToday && (
              <button onClick={() => setAddOpen(true)} className="mj-nudge" style={{
                display: "block", width: "100%", textAlign: "center", cursor: "pointer",
                background: C.cream, border: `1px solid ${C.border}`, borderRadius: 16,
                padding: "16px 18px", marginTop: 22, color: C.accentD, fontFamily: "inherit",
                fontSize: 15.5, lineHeight: 1.5, animation: "mjnudge 2.6s ease-in-out infinite" }}>
                Nothing yet today — what was one good thing?
              </button>
            )}

            {/* Random past moment — "✨ From your jar" (only when >1 moment) */}
            {moments.length > 1 && randomPastMoment && (
              <div style={{ marginTop: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 16, color: C.accentD }}>✨ From your jar</span>
                </div>
                <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 16, padding: 4 }}>
                  <MomentCard m={randomPastMoment} />
                </div>
              </div>
            )}

            {/* Recents */}
            <div style={{ marginTop: 28 }}>
              {recents.length === 0 ? (
                <div style={{ textAlign: "center", color: C.muted, fontSize: 15, lineHeight: 1.6,
                  background: C.card, border: `1px dashed ${C.border}`, borderRadius: 18, padding: "28px 20px" }}>
                  Your jar is empty.<br />Tap <strong style={{ color: C.accent }}>+</strong> to drop in your first moment.
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, textTransform: "uppercase",
                    letterSpacing: ".5px", marginBottom: 12 }}>Recently added</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {recents.map(m => <MomentCard key={m.id} m={m} onEdit={openEdit} onDelete={deleteMoment} />)}
                  </div>
                  {moments.length > recents.length && (
                    <button onClick={() => setTab("browse")} style={{ background: "none", border: "none",
                      color: C.accent, fontWeight: 600, fontSize: 14, cursor: "pointer", marginTop: 14,
                      fontFamily: "inherit", width: "100%", textAlign: "center" }}>
                      See all {moments.length} moments →
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── BROWSE ───────────────────────────────────────────────── */}
        {tab === "browse" && (
          <div style={{ animation: "mjfade .4s ease", marginTop: 8 }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, color: C.dark, marginBottom: 14 }}>
              All moments
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 6 }}>
              <button className={`mj-chip ${!filterMood ? "on" : ""}`} onClick={() => setFilterMood(null)}>All moods</button>
              {MOODS.map(m => (
                <button key={m.emoji} className={`mj-chip ${filterMood === m.emoji ? "on" : ""}`}
                  onClick={() => setFilterMood(filterMood === m.emoji ? null : m.emoji)}
                  style={{ fontSize: 18, padding: "6px 12px" }}>{m.emoji}</button>
              ))}
            </div>
            {usedTags.length > 0 && (
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 8 }}>
                <button className={`mj-chip ${!filterTag ? "on" : ""}`} onClick={() => setFilterTag(null)}>All tags</button>
                {usedTags.map(t => (
                  <button key={t} className={`mj-chip ${filterTag === t ? "on" : ""}`}
                    onClick={() => setFilterTag(filterTag === t ? null : t)}>{t}</button>
                ))}
              </div>
            )}

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", color: C.muted, fontSize: 15, padding: "40px 20px" }}>
                No moments match these filters.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                {filtered.map(m => <MomentCard key={m.id} m={m} onEdit={openEdit} onDelete={deleteMoment} />)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom nav ───────────────────────────────────────────── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.card,
        borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-around",
        padding: "8px 0 calc(8px + env(safe-area-inset-bottom))", zIndex: 30 }}>
        <NavBtn label="Jar" active={tab === "jar"} onClick={() => setTab("jar")} icon="🫙" />
        <button onClick={() => setAddOpen(true)} aria-label="Add a moment" style={{ background: C.accent,
          color: "#fff", border: "none", width: 58, height: 58, borderRadius: "50%", fontSize: 30, cursor: "pointer",
          boxShadow: "0 6px 18px rgba(200,75,17,.4)", marginTop: -22, lineHeight: 1, fontWeight: 300 }}>+</button>
        <NavBtn label="Browse" active={tab === "browse"} onClick={() => setTab("browse")} icon="📖" />
      </div>

      {/* ── Add memory overlay ───────────────────────────────────── */}
      {addOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(26,10,0,.45)", zIndex: 50,
          display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => !dropping && setAddOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.bg, width: "100%", maxWidth: 560,
            borderRadius: "22px 22px 0 0", padding: "20px 22px calc(24px + env(safe-area-inset-bottom))",
            animation: "mjfade .25s ease", maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ width: 40, height: 4, background: C.border, borderRadius: 99, margin: "0 auto 18px" }} />
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, color: C.dark, marginBottom: 4 }}>
              A good moment today
            </div>
            <div style={{ color: C.muted, fontSize: 13.5, marginBottom: 12 }}>
              Keep it short — a sentence or two is perfect.
            </div>

            {/* Optional inspiration — subtle until asked for, never saved */}
            {!showPrompt ? (
              <button onClick={revealPrompt} style={{ background: "none", border: "none", padding: 0,
                marginBottom: 12, color: C.accent, fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                💭 Need inspiration?
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.cream,
                border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 10px 10px 14px",
                marginBottom: 12, animation: "mjfade .2s ease" }}>
                <div style={{ flex: 1, fontFamily: "'Instrument Serif',serif", fontStyle: "italic",
                  fontSize: 16, color: C.accentD, lineHeight: 1.4 }}>
                  {INSPIRATION_PROMPTS[promptIndex]}
                </div>
                <button onClick={shufflePrompt} aria-label="Show another prompt" title="Another prompt"
                  style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, width: 34, height: 34,
                    cursor: "pointer", color: C.accent, fontSize: 17, flexShrink: 0, display: "flex",
                    alignItems: "center", justifyContent: "center", lineHeight: 1 }}>↻</button>
                <button onClick={() => setShowPrompt(false)} aria-label="Hide prompt" title="Hide"
                  style={{ background: "none", border: "none", color: C.muted, fontSize: 15, cursor: "pointer",
                    flexShrink: 0, padding: 4, lineHeight: 1 }}>✕</button>
              </div>
            )}

            <textarea className="mj-inp" rows={3} maxLength={280} autoFocus
              placeholder="Something small and good that happened…"
              value={draftText} onChange={e => setDraftText(e.target.value)}
              style={{ resize: "none", lineHeight: 1.5 }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
              <span style={{ color: "#B9A892", fontSize: 11.5, lineHeight: 1.4 }}>
                Tip: tap the 🎤 on your keyboard to speak your moment.
              </span>
              <span style={{ color: C.muted, fontSize: 11, flexShrink: 0 }}>{draftText.length}/280</span>
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, margin: "14px 0 10px" }}>How did it feel?</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {MOODS.map(m => (
                <button key={m.emoji} className={`mj-mood ${draftMood === m.emoji ? "on" : ""}`}
                  title={m.label} onClick={() => setDraftMood(draftMood === m.emoji ? null : m.emoji)}>
                  {m.emoji}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, margin: "18px 0 10px" }}>
              Tag it <span style={{ fontWeight: 400 }}>(optional)</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TAGS.map(t => (
                <button key={t} className={`mj-chip ${draftTag === t ? "on" : ""}`}
                  onClick={() => setDraftTag(draftTag === t ? null : t)}>{t}</button>
              ))}
            </div>

            <button className="mj-btn" style={{ marginTop: 22 }} disabled={!draftText.trim() || dropping}
              onClick={dropInJar}>
              {dropping ? "Dropping…" : "Drop it in the jar"}
            </button>
            <button onClick={() => setAddOpen(false)} disabled={dropping} style={{ background: "none", border: "none",
              color: C.muted, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 12, fontFamily: "inherit" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Edit moment overlay ──────────────────────────────────── */}
      {editMoment && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(26,10,0,.45)", zIndex: 50,
          display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => !savingEdit && setEditMoment(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.bg, width: "100%", maxWidth: 560,
            borderRadius: "22px 22px 0 0", padding: "20px 22px calc(24px + env(safe-area-inset-bottom))",
            animation: "mjfade .25s ease", maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ width: 40, height: 4, background: C.border, borderRadius: 99, margin: "0 auto 18px" }} />
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, color: C.dark, marginBottom: 4 }}>
              Edit this moment
            </div>
            <div style={{ color: C.muted, fontSize: 13.5, marginBottom: 16 }}>
              Fix a typo or change how it felt — the date stays as it was.
            </div>

            <textarea className="mj-inp" rows={3} maxLength={280} autoFocus
              placeholder="Something small and good that happened…"
              value={editText} onChange={e => setEditText(e.target.value)}
              style={{ resize: "none", lineHeight: 1.5 }} />
            <div style={{ textAlign: "right", color: C.muted, fontSize: 11, marginTop: 4 }}>
              {editText.length}/280
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, margin: "14px 0 10px" }}>How did it feel?</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {MOODS.map(mo => (
                <button key={mo.emoji} className={`mj-mood ${editMood === mo.emoji ? "on" : ""}`}
                  title={mo.label} onClick={() => setEditMood(editMood === mo.emoji ? null : mo.emoji)}>
                  {mo.emoji}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, margin: "18px 0 10px" }}>
              Tag it <span style={{ fontWeight: 400 }}>(optional)</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TAGS.map(t => (
                <button key={t} className={`mj-chip ${editTag === t ? "on" : ""}`}
                  onClick={() => setEditTag(editTag === t ? null : t)}>{t}</button>
              ))}
            </div>

            <button className="mj-btn" style={{ marginTop: 22 }} disabled={!editText.trim() || savingEdit}
              onClick={saveEdit}>
              {savingEdit ? "Saving…" : "Save changes"}
            </button>
            <button onClick={() => setEditMoment(null)} disabled={savingEdit} style={{ background: "none", border: "none",
              color: C.muted, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 12, fontFamily: "inherit" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Settings overlay ─────────────────────────────────────── */}
      {settingsOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(26,10,0,.45)", zIndex: 50,
          display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setSettingsOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.bg, width: "100%", maxWidth: 560,
            borderRadius: "22px 22px 0 0", padding: "20px 22px calc(24px + env(safe-area-inset-bottom))",
            animation: "mjfade .25s ease" }}>
            <div style={{ width: 40, height: 4, background: C.border, borderRadius: 99, margin: "0 auto 18px" }} />
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, color: C.dark, marginBottom: 16 }}>Settings</div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ color: C.muted, fontSize: 12 }}>Signed in as</div>
              <div style={{ color: C.text, fontSize: 15, fontWeight: 600, marginTop: 2 }}>
                {currentUser?.email || "Local only (not signed in)"}
              </div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 10 }}>
                {moments.length} {moments.length === 1 ? "moment" : "moments"} saved
              </div>
            </div>

            {/* Daily reminder — synced to the preferences table */}
            {currentUser && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.text, fontSize: 15, fontWeight: 600 }}>Daily reminder</div>
                    <div style={{ color: C.muted, fontSize: 12.5, marginTop: 2, lineHeight: 1.45 }}>
                      A soft nudge to add one good thing
                    </div>
                  </div>
                  <button role="switch" aria-checked={reminderEnabled} aria-label="Toggle daily reminder"
                    onClick={() => saveReminderPrefs(!reminderEnabled, reminderTime)}
                    style={{ width: 48, height: 28, borderRadius: 999, border: "none", cursor: "pointer", flexShrink: 0,
                      background: reminderEnabled ? C.accent : C.border, position: "relative", transition: "background .2s" }}>
                    <span style={{ position: "absolute", top: 3, left: reminderEnabled ? 23 : 3, width: 22, height: 22,
                      borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} />
                  </button>
                </div>

                {reminderEnabled && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                      <label htmlFor="mj-reminder-time" style={{ color: C.text, fontSize: 14 }}>Remind me at</label>
                      <input id="mj-reminder-time" type="time" value={reminderTime}
                        onChange={e => saveReminderPrefs(reminderEnabled, e.target.value)}
                        style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
                          padding: "8px 12px", color: C.text, fontFamily: "inherit", fontSize: 15, outline: "none" }} />
                    </div>
                    <div style={{ color: "#B9A892", fontSize: 11.5, fontStyle: "italic", marginTop: 8, lineHeight: 1.45 }}>
                      Evenings work well — you'll have the whole day to look back on.
                    </div>
                  </>
                )}

                <div style={{ color: C.muted, fontSize: 12, marginTop: 14, lineHeight: 1.5 }}>
                  Just one soft email a day — never more. Miss a day and nothing happens; your jar's in no
                  rush. Turn it off whenever you like.
                </div>
              </div>
            )}

            {currentUser ? (
              <button onClick={handleSignOut} style={{ width: "100%", background: "#fff",
                border: `1px solid ${C.border}`, color: C.accentD, borderRadius: 12, padding: 14,
                fontFamily: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                Sign out
              </button>
            ) : (
              <button className="mj-btn" onClick={() => { setSettingsOpen(false); setAuthScreen("login"); }}>
                Sign in to sync
              </button>
            )}
            <div style={{ textAlign: "center", color: C.muted, fontSize: 12, marginTop: 18 }}>
              Moment Jar v1 · momentjar.app
            </div>
            <button onClick={() => setSettingsOpen(false)} style={{ background: "none", border: "none",
              color: C.muted, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 12, fontFamily: "inherit" }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position: "fixed", bottom: "calc(100px + env(safe-area-inset-bottom))", left: "50%",
          transform: "translateX(-50%)", background: C.dark, color: "#fff", padding: "12px 20px",
          borderRadius: 999, fontSize: 14, fontWeight: 600, zIndex: 60, animation: "mjfade .25s ease",
          boxShadow: "0 6px 20px rgba(0,0,0,.2)" }}>
          {toast}
        </div>
      )}

      {/* Open your jar — full-screen year-in-review */}
      {reviewOpen && (
        <JarReview moments={reviewChrono} year={currentYear} onClose={() => setReviewOpen(false)} />
      )}
    </div>
  );
}

function NavBtn({ label, icon, active, onClick }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2, width: 80,
      color: active ? C.accent : C.muted, fontFamily: "inherit", padding: "4px 0" }}>
      <span style={{ fontSize: 20, filter: active ? "none" : "grayscale(0.4)", opacity: active ? 1 : 0.7 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
    </button>
  );
}
