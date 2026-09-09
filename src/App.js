import React, { useState, useEffect, useMemo, useRef } from "react";
import "./App.css";

// ════════════════════════════════════════════════════════════════════════════
//  Moment Jar
//  "Add one small good thing that happened today. At the end of the year,
//   open the jar and read them all back."
//
//  This file owns all app state and decides which screen shows. The pieces:
//   • lib/supabase.js   — auth (OTP via raw fetch) + every remote read/write
//   • lib/storage.js    — localStorage keys and helpers (instant load, offline)
//   • lib/constants.js  — palette, moods, tags, jar fill goal
//   • lib/dates.js      — local-calendar-day helpers
//   • lib/pdfBook.js    — the printable year book (jsPDF, lazy-loaded)
//   • components/       — Jar, TagPicker, MomentCard, JarReview, NavBtn, Toast
//   • screens/          — Landing, Login, Verify, Home, Browse + the overlays
// ════════════════════════════════════════════════════════════════════════════

import { C, TAGS, FILL_GOAL } from "./lib/constants";
import { INSPIRATION_PROMPTS } from "./lib/prompts";
import { todayStr, getTimeZone, parseDate } from "./lib/dates";
import {
  getStoredUser, storeUser,
  loadMomentsLocal, saveMomentsLocal,
  loadCustomTagsLocal, saveCustomTagsLocal,
  loadHiddenTagsLocal, saveHiddenTagsLocal,
  clearAppData,
} from "./lib/storage";
import {
  getSession, signInWithEmail, verifyOtp, signOut,
  loadMomentsRemote, saveMomentRemote, deleteMomentRemote, updateMomentRemote,
  savePreferences, loadPreferences,
  loadCustomTagsRemote, saveCustomTagRemote, deleteCustomTagRemote,
} from "./lib/supabase";
import { generateYearBook } from "./lib/pdfBook";

import JarReview from "./components/JarReview";
import NavBtn from "./components/NavBtn";
import Toast from "./components/Toast";

import Loading from "./screens/Loading";
import Landing from "./screens/Landing";
import Login from "./screens/Login";
import Verify from "./screens/Verify";
import Home from "./screens/Home";
import Browse from "./screens/Browse";
import AddMoment from "./screens/AddMoment";
import EditMoment from "./screens/EditMoment";
import Settings from "./screens/Settings";
import BookPicker from "./screens/BookPicker";

export default function App() {
  const [authScreen, setAuthScreen] = useState("loading"); // loading|landing|login|verify|app
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());

  const [authEmail, setAuthEmail] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [moments, setMoments] = useState(() => loadMomentsLocal());
  // User-defined tags + the supplied tags this user has hidden. Both load
  // instantly from localStorage, then sync from the account in the background.
  const [customTags, setCustomTags] = useState(() => loadCustomTagsLocal());
  const [hiddenTags, setHiddenTags] = useState(() => loadHiddenTagsLocal());
  const [tab, setTab] = useState("jar"); // jar|browse
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false); // "Open your jar" year-in-review
  const [bookOpen, setBookOpen] = useState(false);     // printable-book year picker
  const [bookBusy, setBookBusy] = useState(null);      // year currently generating, or null
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
  const [filterMonth, setFilterMonth] = useState(null); // "YYYY-MM" or null (all)

  // Email preferences (synced to the preferences table)
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [weeklyRecapEnabled, setWeeklyRecapEnabled] = useState(true);

  // Random "from your jar" pick — chosen once per app open, then held steady
  const [randomPast, setRandomPast] = useState(null);
  const pickedRandomRef = useRef(false);

  // Ids of moments known to be on the server: everything the last successful
  // fetch returned, plus anything saved remotely since. null = no successful
  // fetch yet this session. Used by sign-out to spot unsynced moments.
  const syncedIdsRef = useRef(null);
  const markSynced = (id) => {
    if (!syncedIdsRef.current) syncedIdsRef.current = new Set();
    syncedIdsRef.current.add(id);
  };

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

  // ── Persist locally whenever moments / tags change ──
  useEffect(() => { saveMomentsLocal(moments); }, [moments]);
  useEffect(() => { saveCustomTagsLocal(customTags); }, [customTags]);
  useEffect(() => { saveHiddenTagsLocal(hiddenTags); }, [hiddenTags]);

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

    // Fallback: if the session check hasn't answered in 5s, stop waiting and
    // land somewhere sensible — never leave the screen stuck on "loading".
    // (A late answer from getSession still applies when it arrives.)
    const timeout = setTimeout(() => {
      setAuthChecked(true);
      setAuthScreen(s => s === "loading" ? (local.length === 0 ? "landing" : "app") : s);
    }, 5000);

    getSession().then(async (user) => {
      clearTimeout(timeout);
      if (user && user.id) {
        storeUser(user);
        setCurrentUser(user);
        setAuthScreen("app");
        setAuthChecked(true);
        await savePreferences(user.id, { email: user.email });
        await hydrateUserData(user.id);
        await syncMoments(user.id);
      } else {
        if (local.length === 0) setAuthScreen("landing");
        else setAuthScreen("app");
        setAuthChecked(true);
      }
    }).catch(() => {
      clearTimeout(timeout);
      setAuthChecked(true);
      setAuthScreen(s => s === "loading" ? (local.length === 0 ? "landing" : "app") : s);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Merge remote + local by id; upload any local-only moments
  const syncMoments = async (userId) => {
    try {
      const remote = await loadMomentsRemote(userId);
      const local = loadMomentsLocal();
      if (remote == null) { return; } // offline / error — keep local
      const byId = {};
      const synced = new Set();
      remote.forEach(m => { byId[m.id] = m; synced.add(m.id); });
      const localOnly = local.filter(m => !byId[m.id]);
      // Push local-only moments up to the server. Keep each one locally either
      // way (so it's never lost and gets retried on the next sync), but count
      // failures so we can surface them instead of hiding a sync problem.
      let failed = 0;
      for (const m of localOnly) {
        const ok = await saveMomentRemote(userId, m);
        if (ok) synced.add(m.id); else failed++;
        byId[m.id] = m;
      }
      syncedIdsRef.current = synced;
      const merged = Object.values(byId).sort((a, b) =>
        (b.created_at || "").localeCompare(a.created_at || ""));
      setMoments(merged);
      saveMomentsLocal(merged);
      if (failed > 0) {
        showToast(`${failed} moment${failed !== 1 ? "s" : ""} haven't synced yet — we'll keep trying`);
      }
    } catch {}
  };

  // Merge remote + local custom tags by id; upload any local-only ones.
  const syncCustomTags = async (userId) => {
    try {
      const remote = await loadCustomTagsRemote(userId);
      if (remote == null) return; // offline / error — keep local
      const local = loadCustomTagsLocal();
      const byId = {};
      remote.forEach(t => { byId[t.id] = { id: t.id, name: t.name, created_at: t.created_at }; });
      const localOnly = local.filter(t => !byId[t.id]);
      for (const t of localOnly) { await saveCustomTagRemote(userId, t); byId[t.id] = t; }
      const merged = Object.values(byId).sort((a, b) =>
        (a.created_at || "").localeCompare(b.created_at || ""));
      setCustomTags(merged);
      saveCustomTagsLocal(merged);
    } catch {}
  };

  // Load email prefs + hidden-tags list, then sync custom tags. Shared by the
  // mount path and the post-verify path so both stay in step.
  const hydrateUserData = async (userId) => {
    const prefs = await loadPreferences(userId);
    if (prefs) {
      setReminderEnabled(prefs.reminder_enabled === true);
      setReminderTime(prefs.reminder_time || "20:00");
      // Weekly recap defaults ON; only an explicit false turns it off.
      setWeeklyRecapEnabled(prefs.weekly_recap_enabled !== false);
      // Hidden tags: union local + remote, then push the union back up if it grew
      // (so a tag hidden offline isn't lost, and another device's hides arrive).
      const localHidden = loadHiddenTagsLocal();
      const remoteHidden = Array.isArray(prefs.hidden_tags) ? prefs.hidden_tags : [];
      const mergedHidden = [...new Set([...localHidden, ...remoteHidden])];
      setHiddenTags(mergedHidden);
      saveHiddenTagsLocal(mergedHidden);
      if (mergedHidden.length !== remoteHidden.length) {
        await savePreferences(userId, { hidden_tags: mergedHidden });
      }
    }
    await syncCustomTags(userId);
  };

  // ── Custom-tag + hidden-tag handlers ──
  const persistHiddenTags = (arr) => {
    if (!currentUser?.id) return;
    savePreferences(currentUser.id, { hidden_tags: arr }).then(ok => {
      if (!ok) showToast("Couldn't save — it'll sync to your account later");
    });
  };

  // Returns the canonical tag name to select. Dedupes against supplied + custom
  // (case-insensitive) and un-hides a supplied tag rather than making a duplicate.
  const addCustomTag = (rawName) => {
    const name = rawName.trim();
    if (!name) return null;
    const lower = name.toLowerCase();
    const suppliedMatch = TAGS.find(t => t.toLowerCase() === lower);
    if (suppliedMatch) {
      if (hiddenTags.includes(suppliedMatch)) {
        const next = hiddenTags.filter(t => t !== suppliedMatch);
        setHiddenTags(next); saveHiddenTagsLocal(next); persistHiddenTags(next);
      }
      return suppliedMatch;
    }
    const existing = customTags.find(c => c.name.toLowerCase() === lower);
    if (existing) return existing.name;
    const t = { id: crypto.randomUUID(), name, created_at: new Date().toISOString() };
    const next = [...customTags, t];
    setCustomTags(next); saveCustomTagsLocal(next);
    if (currentUser?.id) {
      saveCustomTagRemote(currentUser.id, t).then(ok => {
        if (!ok) showToast("Tag saved on this device — it'll sync later");
      });
    }
    return t.name;
  };

  const deleteCustomTag = (id, name) => {
    if (!window.confirm(`Delete the tag “${name}”? Moments already tagged keep their label.`)) return;
    const next = customTags.filter(c => c.id !== id);
    setCustomTags(next); saveCustomTagsLocal(next);
    if (currentUser?.id) {
      deleteCustomTagRemote(currentUser.id, id).then(ok => {
        if (!ok) showToast("Couldn't remove from your account — please try again");
      });
    }
  };

  const hideSuppliedTag = (name) => {
    if (hiddenTags.includes(name)) return;
    if (!window.confirm(`Hide “${name}” from your tag list? Moments already tagged keep it.`)) return;
    const next = [...hiddenTags, name];
    setHiddenTags(next); saveHiddenTagsLocal(next); persistHiddenTags(next);
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
      await hydrateUserData(data.user.id);
      await syncMoments(data.user.id);
    } else {
      setAuthError("Invalid code. Please try again.");
    }
    setAuthLoading(false);
  };

  // Moments on this device that the server isn't known to have. With no
  // successful fetch yet this session, every local moment counts as unsynced.
  const unsyncedMoments = () => {
    const synced = syncedIdsRef.current;
    const local = loadMomentsLocal();
    return synced ? local.filter(m => !synced.has(m.id)) : local;
  };

  const handleSignOut = async () => {
    // Signing out wipes this device's copy, so make sure nothing is lost first:
    // try one more sync, then ask before discarding anything still unsynced.
    if (currentUser?.id) {
      let pending = unsyncedMoments();
      if (pending.length > 0) {
        await syncMoments(currentUser.id);
        pending = unsyncedMoments();
      }
      if (pending.length > 0) {
        const n = pending.length;
        const ok = window.confirm(
          `${n} moment${n !== 1 ? "s" : ""} on this device ${n !== 1 ? "haven't" : "hasn't"} synced to your account yet. ` +
          `Signing out will remove ${n !== 1 ? "them" : "it"} from this device. Sign out anyway?`
        );
        if (!ok) return;
      }
    }
    await signOut();
    // Clear the mj_ keys so the next person on this device starts with an
    // empty jar, and reset the in-memory copies to match.
    clearAppData();
    setMoments([]);
    setCustomTags([]);
    setHiddenTags([]);
    setRandomPast(null);
    pickedRandomRef.current = false;
    syncedIdsRef.current = null;
    setReminderEnabled(false); setReminderTime("20:00"); setWeeklyRecapEnabled(true);
    setCurrentUser(null);
    setSettingsOpen(false);
    setAuthEmail(""); setAuthOtp("");
    setAuthScreen("landing");
  };

  // ── Email preferences ──
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

  const saveWeeklyRecapPref = async (enabled) => {
    setWeeklyRecapEnabled(enabled);
    if (!currentUser?.id) { showToast("Sign in to save reminders"); return; }
    const ok = await savePreferences(currentUser.id, { weekly_recap_enabled: enabled, timezone: getTimeZone() });
    if (ok) showToast(enabled ? "Weekly recap on 🫙" : "Weekly recap off");
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
      if (ok) markSynced(m.id);
      else showToast("Saved on this device — it'll sync to your account later");
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

  // Completed years (strictly before the current year) that have at least one
  // moment — each becomes a selectable printable book. Newest first. The
  // in-progress current year is never offered. [count kept for the picker UI]
  const completedYears = useMemo(() => {
    const counts = {};
    moments.forEach(m => {
      const y = parseDate(m.date).getFullYear();
      if (y < currentYear) counts[y] = (counts[y] || 0) + 1;
    });
    return Object.keys(counts).map(Number).sort((a, b) => b - a)
      .map(year => ({ year, count: counts[year] }));
  }, [moments, currentYear]);

  const makeBook = async (year) => {
    if (bookBusy) return;
    setBookBusy(year);
    try {
      await generateYearBook(year, moments);
      showToast(`Your ${year} book is ready ✨`);
      setBookOpen(false);
    } catch {
      showToast("Couldn't make the book — please try again");
    } finally {
      setBookBusy(null);
    }
  };

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
    (!filterMood || m.mood === filterMood) &&
    (!filterTag || m.tag === filterTag) &&
    (!filterMonth || String(m.date || "").slice(0, 7) === filterMonth)
  ), [moments, filterMood, filterTag, filterMonth]);

  // Months that actually contain moments, newest first — for the Browse "jump to
  // month" dropdown. Key is the YYYY-MM prefix of the moment's local date.
  const availableMonths = useMemo(() => {
    const seen = [];
    const keys = new Set();
    moments.forEach(m => {
      const key = String(m.date || "").slice(0, 7); // "YYYY-MM"
      if (key.length === 7 && !keys.has(key)) { keys.add(key); seen.push(key); }
    });
    seen.sort((a, b) => b.localeCompare(a)); // newest first
    const months = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    return seen.map(key => {
      const [y, mo] = key.split("-").map(Number);
      return { key, label: `${months[mo - 1]} ${y}` };
    });
  }, [moments]);

  // If the selected month no longer has any moments (e.g. they were deleted),
  // fall back to showing everything so the user isn't stuck on an empty filter.
  useEffect(() => {
    if (filterMonth && !availableMonths.some(m => m.key === filterMonth)) setFilterMonth(null);
  }, [filterMonth, availableMonths]);

  // Supplied tags this user hasn't hidden — the selectable supplied set.
  const visibleSupplied = useMemo(() => TAGS.filter(t => !hiddenTags.includes(t)), [hiddenTags]);

  // Browse filters from the tags actually PRESENT on moments — so custom tags and
  // any now-hidden/deleted tag still filter the history that used them (no orphans).
  const usedTags = useMemo(() => {
    const seen = [];
    moments.forEach(m => { if (m.tag && !seen.includes(m.tag)) seen.push(m.tag); });
    return seen;
  }, [moments]);

  // Shared by the add and edit sheets.
  const tagPickerProps = { visibleSupplied, customTags, addCustomTag, deleteCustomTag, hideSuppliedTag };

  // ════════════════════════════════════════════════════════════════════════
  //  Screen switching
  // ════════════════════════════════════════════════════════════════════════
  if (!authChecked && authScreen === "loading") {
    return <Loading />;
  }

  if (authScreen === "landing") {
    return <Landing animIn={animIn} onStart={() => setAuthScreen("login")} />;
  }

  if (authScreen === "login") {
    return (
      <Login email={authEmail} setEmail={setAuthEmail} error={authError}
        loading={authLoading} onSubmit={handleSignIn} />
    );
  }

  if (authScreen === "verify") {
    return (
      <Verify email={authEmail} otp={authOtp} setOtp={setAuthOtp} error={authError}
        loading={authLoading} onSubmit={handleVerify}
        onBack={() => { setAuthScreen("login"); setAuthOtp(""); setAuthError(""); }} />
    );
  }

  // ── APP ──
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Instrument Sans',sans-serif",
      color: C.text, paddingBottom: "calc(86px + env(safe-area-inset-bottom))" }}>
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
        {tab === "jar" && (
          <Home
            onThisDay={onThisDay} currentYear={currentYear} thisYearMoments={thisYearMoments}
            fraction={fraction} celebrate={celebrate} celebrateKey={celebrateKey}
            canOpenJar={canOpenJar} onOpenReview={() => setReviewOpen(true)}
            completedYears={completedYears} onOpenBook={() => setBookOpen(true)}
            addedToday={addedToday} onAdd={() => setAddOpen(true)}
            moments={moments} randomPastMoment={randomPastMoment} recents={recents}
            onEdit={openEdit} onDelete={deleteMoment} onBrowse={() => setTab("browse")}
          />
        )}

        {tab === "browse" && (
          <Browse
            filterMonth={filterMonth} setFilterMonth={setFilterMonth} availableMonths={availableMonths}
            filterMood={filterMood} setFilterMood={setFilterMood}
            usedTags={usedTags} filterTag={filterTag} setFilterTag={setFilterTag}
            filtered={filtered} onEdit={openEdit} onDelete={deleteMoment}
          />
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

      {/* ── Overlays ─────────────────────────────────────────────── */}
      {addOpen && (
        <AddMoment
          dropping={dropping} onClose={() => setAddOpen(false)}
          showPrompt={showPrompt} promptIndex={promptIndex}
          revealPrompt={revealPrompt} shufflePrompt={shufflePrompt} hidePrompt={() => setShowPrompt(false)}
          draftText={draftText} setDraftText={setDraftText}
          draftMood={draftMood} setDraftMood={setDraftMood}
          draftTag={draftTag} setDraftTag={setDraftTag}
          {...tagPickerProps}
          onDrop={dropInJar}
        />
      )}

      {editMoment && (
        <EditMoment
          saving={savingEdit} onClose={() => setEditMoment(null)}
          editText={editText} setEditText={setEditText}
          editMood={editMood} setEditMood={setEditMood}
          editTag={editTag} setEditTag={setEditTag}
          {...tagPickerProps}
          onSave={saveEdit}
        />
      )}

      {settingsOpen && (
        <Settings
          onClose={() => setSettingsOpen(false)}
          currentUser={currentUser} momentsCount={moments.length}
          reminderEnabled={reminderEnabled} reminderTime={reminderTime} onSaveReminder={saveReminderPrefs}
          weeklyRecapEnabled={weeklyRecapEnabled} onSaveWeeklyRecap={saveWeeklyRecapPref}
          onSignOut={handleSignOut}
          onSignIn={() => { setSettingsOpen(false); setAuthScreen("login"); }}
        />
      )}

      {bookOpen && (
        <BookPicker onClose={() => setBookOpen(false)} bookBusy={bookBusy}
          completedYears={completedYears} onMake={makeBook} />
      )}

      <Toast message={toast} />

      {/* Open your jar — full-screen year-in-review */}
      {reviewOpen && (
        <JarReview moments={reviewChrono} year={currentYear} onClose={() => setReviewOpen(false)} />
      )}
    </div>
  );
}
