import { C, moodEmoji } from "../lib/constants";
import { formatDate } from "../lib/dates";

export default function MomentCard({ m, onDelete, onEdit }) {
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
