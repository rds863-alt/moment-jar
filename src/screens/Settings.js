import { C } from "../lib/constants";

// On/off pill used for both email toggles.
function Switch({ on, onToggle, label }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label}
      onClick={onToggle}
      style={{ width: 48, height: 28, borderRadius: 999, border: "none", cursor: "pointer", flexShrink: 0,
        background: on ? C.accent : C.border, position: "relative", transition: "background .2s" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 22, height: 22,
        borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} />
    </button>
  );
}

// Bottom-sheet overlay: account, email preferences, sign in / out.
export default function Settings({
  onClose, currentUser, momentsCount,
  reminderEnabled, reminderTime, onSaveReminder,
  weeklyRecapEnabled, onSaveWeeklyRecap,
  onSignOut, onSignIn,
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,10,0,.45)", zIndex: 50,
      display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
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
            {momentsCount} {momentsCount === 1 ? "moment" : "moments"} saved
          </div>
        </div>

        {/* Email preferences — synced to the preferences table */}
        {currentUser && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.text, fontSize: 15, fontWeight: 600 }}>Daily reminder</div>
                <div style={{ color: C.muted, fontSize: 12.5, marginTop: 2, lineHeight: 1.45 }}>
                  A soft nudge to add one good thing
                </div>
              </div>
              <Switch on={reminderEnabled} label="Toggle daily reminder"
                onToggle={() => onSaveReminder(!reminderEnabled, reminderTime)} />
            </div>

            {reminderEnabled && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                  <label htmlFor="mj-reminder-time" style={{ color: C.text, fontSize: 14 }}>Remind me at</label>
                  <input id="mj-reminder-time" type="time" value={reminderTime}
                    onChange={e => onSaveReminder(reminderEnabled, e.target.value)}
                    style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
                      padding: "8px 12px", color: C.text, fontFamily: "inherit", fontSize: 15, outline: "none" }} />
                </div>
                <div style={{ color: "#B9A892", fontSize: 11.5, fontStyle: "italic", marginTop: 8, lineHeight: 1.45 }}>
                  Evenings work well — you'll have the whole day to look back on.
                </div>
              </>
            )}

            <div style={{ color: C.muted, fontSize: 12, marginTop: 14, lineHeight: 1.5 }}>
              The daily nudge is one short email at most, and it stays quiet on days you've
              already added something. Miss a day and nothing happens; your jar's in no rush.
            </div>

            {/* Weekly recap — independent of the daily reminder */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.text, fontSize: 15, fontWeight: 600 }}>Weekly recap on Sundays</div>
                <div style={{ color: C.muted, fontSize: 12.5, marginTop: 2, lineHeight: 1.45 }}>
                  A Sunday-evening look back at the week's moments
                </div>
              </div>
              <Switch on={weeklyRecapEnabled} label="Toggle weekly recap"
                onToggle={() => onSaveWeeklyRecap(!weeklyRecapEnabled)} />
            </div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>
              Only sent in weeks you added at least one moment. Turn either email off whenever you like.
            </div>
          </div>
        )}

        {currentUser ? (
          <button onClick={onSignOut} style={{ width: "100%", background: "#fff",
            border: `1px solid ${C.border}`, color: C.accentD, borderRadius: 12, padding: 14,
            fontFamily: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            Sign out
          </button>
        ) : (
          <button className="mj-btn" onClick={onSignIn}>
            Sign in to sync
          </button>
        )}
        <div style={{ textAlign: "center", color: C.muted, fontSize: 12, marginTop: 18 }}>
          Moment Jar v1 · momentjar.app
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none",
          color: C.muted, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 12, fontFamily: "inherit" }}>
          Close
        </button>
      </div>
    </div>
  );
}
