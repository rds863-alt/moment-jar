import { C, SPARKLES } from "../lib/constants";
import { parseDate } from "../lib/dates";
import Jar from "../components/Jar";
import MomentCard from "../components/MomentCard";

// The "Jar" tab: on-this-day, the jar itself, nudge, random past moment, recents.
export default function Home({
  onThisDay, currentYear, thisYearMoments, fraction, celebrate, celebrateKey,
  canOpenJar, onOpenReview, completedYears, onOpenBook,
  addedToday, onAdd, moments, randomPastMoment, recents, onEdit, onDelete, onBrowse,
}) {
  return (
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
          <button onClick={onOpenReview} style={{
            marginTop: 20, background: C.dark, color: "#FFF8F0", border: "none", borderRadius: 14,
            padding: "14px 26px", fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
            boxShadow: "0 6px 18px rgba(26,10,0,.22)" }}>
            ✨ Open your jar
          </button>
        )}

        {/* Printable book — subtle link, only once a completed year exists */}
        {completedYears.length > 0 && (
          <div>
            <button onClick={onOpenBook} style={{ marginTop: canOpenJar ? 14 : 20,
              background: "none", border: "none", color: C.accent, fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
              📖 Make a printable book
            </button>
          </div>
        )}
      </div>

      {/* Daily nudge — only while nothing has been added today */}
      {!addedToday && (
        <button onClick={onAdd} className="mj-nudge" style={{
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
              {recents.map(m => <MomentCard key={m.id} m={m} onEdit={onEdit} onDelete={onDelete} />)}
            </div>
            {moments.length > recents.length && (
              <button onClick={onBrowse} style={{ background: "none", border: "none",
                color: C.accent, fontWeight: 600, fontSize: 14, cursor: "pointer", marginTop: 14,
                fontFamily: "inherit", width: "100%", textAlign: "center" }}>
                See all {moments.length} moments →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
