// ── Palette (warm amber/brown — deliberately NOT LifeOnTrack's navy) ──────────
// The same values are written out literally in src/App.css; keep both in step.
export const C = {
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

// ── Moods & tags ──────────────────────────────────────────────────────────────
// Curated, warm emotional range. Existing emoji are kept exactly — saved
// moments store the emoji string itself, so changing one would orphan moments
// already using it. New moods are only appended.
export const MOODS = [
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
];
export const TAGS = ["family", "nature", "work", "food", "friends", "simple joy"];

export const FILL_GOAL = 100; // moments that visually "fill" the jar to the brim

// Sparkle burst directions (radiate up/outward from the jar on a successful save)
export const SPARKLES = [
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

// ── Small helpers tied to the constants above ─────────────────────────────────
export function truncate(s, n) { return (s || "").length > n ? (s || "").slice(0, n - 1).trimEnd() + "…" : (s || ""); }
export function moodEmoji(m) { return m || "✨"; }
// The mood's human label (e.g. "😊" → "Happy"). Used in the PDF book, where
// color emoji can't be embedded reliably — we print the name instead.
export function moodLabelOf(emoji) { return (MOODS.find(m => m.emoji === emoji)?.label) || ""; }
