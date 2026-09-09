import { C, MOODS } from "../lib/constants";
import { INSPIRATION_PROMPTS } from "../lib/prompts";
import TagPicker from "../components/TagPicker";

// Bottom-sheet overlay for adding a moment. Rendered only while open.
export default function AddMoment({
  dropping, onClose,
  showPrompt, promptIndex, revealPrompt, shufflePrompt, hidePrompt,
  draftText, setDraftText, draftMood, setDraftMood, draftTag, setDraftTag,
  visibleSupplied, customTags, addCustomTag, deleteCustomTag, hideSuppliedTag,
  onDrop,
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,10,0,.45)", zIndex: 50,
      display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={() => !dropping && onClose()}>
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
            <button onClick={hidePrompt} aria-label="Hide prompt" title="Hide"
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
        <TagPicker
          selected={draftTag} onSelect={setDraftTag}
          supplied={visibleSupplied} custom={customTags}
          onAddCustom={addCustomTag} onDeleteCustom={deleteCustomTag} onHideSupplied={hideSuppliedTag}
        />

        <button className="mj-btn" style={{ marginTop: 22 }} disabled={!draftText.trim() || dropping}
          onClick={onDrop}>
          {dropping ? "Dropping…" : "Drop it in the jar"}
        </button>
        <button onClick={onClose} disabled={dropping} style={{ background: "none", border: "none",
          color: C.muted, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 12, fontFamily: "inherit" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
