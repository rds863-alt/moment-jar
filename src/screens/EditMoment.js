import { C, MOODS } from "../lib/constants";
import TagPicker from "../components/TagPicker";

// Bottom-sheet overlay for editing an existing moment (text / mood / tag).
export default function EditMoment({
  saving, onClose,
  editText, setEditText, editMood, setEditMood, editTag, setEditTag,
  visibleSupplied, customTags, addCustomTag, deleteCustomTag, hideSuppliedTag,
  onSave,
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,10,0,.45)", zIndex: 50,
      display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={() => !saving && onClose()}>
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
        <TagPicker
          selected={editTag} onSelect={setEditTag}
          supplied={visibleSupplied} custom={customTags}
          onAddCustom={addCustomTag} onDeleteCustom={deleteCustomTag} onHideSupplied={hideSuppliedTag}
        />

        <button className="mj-btn" style={{ marginTop: 22 }} disabled={!editText.trim() || saving}
          onClick={onSave}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button onClick={onClose} disabled={saving} style={{ background: "none", border: "none",
          color: C.muted, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 12, fontFamily: "inherit" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
