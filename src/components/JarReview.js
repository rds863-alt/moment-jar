import { useState, useEffect, useMemo, useRef } from "react";
import { C, truncate } from "../lib/constants";
import { formatWarmDate } from "../lib/dates";

// ════════════════════════════════════════════════════════════════════════════
//  Open your jar — full-screen year-in-review playback
// ════════════════════════════════════════════════════════════════════════════
export function ReviewStat({ label, value, big }) {
  return (
    <div>
      <div style={{ color: "#C89B6A", fontSize: 11.5, fontWeight: 600, letterSpacing: ".6px", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: "#FFF8F0", fontSize: big ? 30 : 16, marginTop: 5, lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}

export default function JarReview({ moments, year, onClose }) {
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
