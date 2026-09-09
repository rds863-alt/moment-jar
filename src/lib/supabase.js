// ════════════════════════════════════════════════════════════════════════════
//  Auth + Supabase helpers (raw fetch — mirrors LifeOnTrack)
//
//  Auth is OTP 6-digit email codes via RAW FETCH. Do NOT add @supabase/supabase-js
//  — its module load crashed mobile browsers (white screen everywhere) and the
//  raw-fetch approach fixed it + cut the bundle in half.
// ════════════════════════════════════════════════════════════════════════════
import {
  getToken, setToken, getRefreshToken, setRefreshToken, clearToken, getStoredUser, storeUser,
} from "./storage";

// ── Supabase config ───────────────────────────────────────────────────────────
// Moment Jar gets its OWN Supabase project (separate data from LifeOnTrack).
// Only the publishable (anon) key belongs here — never the service role key.
export const SUPABASE_URL = "https://afhcuanapgsxrorvygfi.supabase.co";
export const SUPABASE_KEY = "sb_publishable_82U-uQThAEPZJaHY9_f1KA_eOFYc24V";

// Exchange the refresh token for a fresh access token. Access tokens (JWTs)
// expire after ~1h; without this, every authenticated read/write silently
// 401s once the token expires while the cached user keeps the UI "signed in".
export async function refreshSession() {
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

export async function getSession() {
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

export async function signInWithEmail(email) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, create_user: true })
    });
    return res.ok;
  } catch { return false; }
}

export async function verifyOtp(email, token) {
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

export async function signOut() {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${getToken()}` }
    });
  } catch {}
  clearToken();
}

export async function sbFetch(path, options = {}) {
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
export async function loadMomentsRemote(userId) {
  try {
    const res = await sbFetch(
      `moments?user_id=eq.${userId}&select=id,text,mood,tag,date,created_at&order=created_at.desc`,
      { headers: { "Prefer": "" } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function saveMomentRemote(userId, m) {
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

export async function deleteMomentRemote(userId, id) {
  try {
    const res = await sbFetch(`moments?id=eq.${id}&user_id=eq.${userId}`, { method: "DELETE" });
    return res.ok;
  } catch { return false; }
}

export async function updateMomentRemote(userId, id, fields) {
  try {
    const res = await sbFetch(`moments?id=eq.${id}&user_id=eq.${userId}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    });
    return res.ok;
  } catch { return false; }
}

export async function savePreferences(userId, fields) {
  try {
    const res = await sbFetch("preferences", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ user_id: userId, ...fields, updated_at: new Date().toISOString() })
    });
    return res.ok;
  } catch { return false; }
}

export async function loadPreferences(userId) {
  try {
    const select = (cols) => sbFetch(
      `preferences?user_id=eq.${userId}&select=${cols}`,
      { headers: { "Prefer": "" } }
    );
    let res = await select("reminder_enabled,reminder_time,hidden_tags,weekly_recap_enabled");
    // If migration 0003 hasn't been run yet the unknown column makes PostgREST
    // reject the whole request; fall back to the pre-0003 column list so the
    // reminder and tag preferences still load.
    if (!res.ok) res = await select("reminder_enabled,reminder_time,hidden_tags");
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.length > 0 ? data[0] : null;
  } catch { return null; }
}

// ── Custom tags (one row per user-defined tag) ──────────────────────────────────
// Tags are just labels. A moment stores the tag *string* (never a foreign key),
// so deleting a custom tag here NEVER orphans past moments — they keep their text.
export async function loadCustomTagsRemote(userId) {
  try {
    const res = await sbFetch(
      `custom_tags?user_id=eq.${userId}&select=id,name,created_at&order=created_at.asc`,
      { headers: { "Prefer": "" } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function saveCustomTagRemote(userId, t) {
  try {
    const res = await sbFetch("custom_tags", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ id: t.id, user_id: userId, name: t.name, created_at: t.created_at })
    });
    return res.ok;
  } catch { return false; }
}

export async function deleteCustomTagRemote(userId, id) {
  try {
    const res = await sbFetch(`custom_tags?id=eq.${id}&user_id=eq.${userId}`, { method: "DELETE" });
    return res.ok;
  } catch { return false; }
}
