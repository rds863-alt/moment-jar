// ── localStorage: every key the app uses, with safe read/write helpers ────────
// localStorage gives instant load; Supabase syncs in the background.

// Auth session (Supabase access token, refresh token, cached user JSON)
export const LS_TOKEN = "sb_token";
export const LS_REFRESH = "sb_refresh";
export const LS_USER = "sb_user";

// App data
export const LS_MOMENTS = "mj_moments_v1";
export const LS_CUSTOM_TAGS = "mj_custom_tags_v1"; // user-defined tags [{id,name,created_at}]
export const LS_HIDDEN_TAGS = "mj_hidden_tags_v1"; // supplied tag names the user has hidden

// ── Session helpers ───────────────────────────────────────────────────────────
export function getToken() { try { return localStorage.getItem(LS_TOKEN) || ""; } catch { return ""; } }
export function setToken(t) { try { localStorage.setItem(LS_TOKEN, t); } catch {} }
export function getRefreshToken() { try { return localStorage.getItem(LS_REFRESH) || ""; } catch { return ""; } }
export function setRefreshToken(t) { try { localStorage.setItem(LS_REFRESH, t); } catch {} }
export function clearToken() { try { localStorage.removeItem(LS_TOKEN); localStorage.removeItem(LS_REFRESH); localStorage.removeItem(LS_USER); } catch {} }
export function getStoredUser() { try { const u = localStorage.getItem(LS_USER); return u ? JSON.parse(u) : null; } catch { return null; } }
export function storeUser(user) { try { localStorage.setItem(LS_USER, JSON.stringify(user)); } catch {} }

// ── App data helpers ──────────────────────────────────────────────────────────
// An empty list is stored as "no key" rather than "[]": loading treats both the
// same, and it means sign-out's clearAppData() isn't undone a moment later when
// App.js's persist effects run with the freshly emptied state.
function saveList(key, list) {
  try {
    if (!list || list.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}
export function loadMomentsLocal() {
  try { const s = localStorage.getItem(LS_MOMENTS); return s ? JSON.parse(s) : []; } catch { return []; }
}
export function saveMomentsLocal(moments) { saveList(LS_MOMENTS, moments); }
export function loadCustomTagsLocal() {
  try { const s = localStorage.getItem(LS_CUSTOM_TAGS); return s ? JSON.parse(s) : []; } catch { return []; }
}
export function saveCustomTagsLocal(tags) { saveList(LS_CUSTOM_TAGS, tags); }
export function loadHiddenTagsLocal() {
  try { const s = localStorage.getItem(LS_HIDDEN_TAGS); return s ? JSON.parse(s) : []; } catch { return []; }
}
export function saveHiddenTagsLocal(names) { saveList(LS_HIDDEN_TAGS, names); }

// Remove every mj_ key so the next person on this device starts with an empty
// jar. Called on sign-out (after the unsynced-moments check in App.js).
export function clearAppData() {
  try {
    localStorage.removeItem(LS_MOMENTS);
    localStorage.removeItem(LS_CUSTOM_TAGS);
    localStorage.removeItem(LS_HIDDEN_TAGS);
  } catch {}
}
