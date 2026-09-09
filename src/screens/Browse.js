import { C, MOODS } from "../lib/constants";
import MomentCard from "../components/MomentCard";

// The "Browse" tab: every moment, filterable by month, mood, and tag.
export default function Browse({
  filterMonth, setFilterMonth, availableMonths,
  filterMood, setFilterMood, usedTags, filterTag, setFilterTag,
  filtered, onEdit, onDelete,
}) {
  return (
    <div style={{ animation: "mjfade .4s ease", marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, marginBottom: 14 }}>
        <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, color: C.dark }}>
          {filterMonth
            ? (availableMonths.find(m => m.key === filterMonth)?.label || "Moments")
            : "All moments"}
        </div>
        {/* Jump to a specific month — only when there's more than one to choose */}
        {availableMonths.length > 1 && (
          <select className={`mj-select ${filterMonth ? "on" : ""}`} value={filterMonth || ""}
            aria-label="Jump to month" onChange={e => setFilterMonth(e.target.value || null)}>
            <option value="">All moments</option>
            {availableMonths.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 6 }}>
        <button className={`mj-chip ${!filterMood ? "on" : ""}`} onClick={() => setFilterMood(null)}>All moods</button>
        {MOODS.map(m => (
          <button key={m.emoji} className={`mj-chip ${filterMood === m.emoji ? "on" : ""}`}
            onClick={() => setFilterMood(filterMood === m.emoji ? null : m.emoji)}
            style={{ fontSize: 18, padding: "6px 12px" }}>{m.emoji}</button>
        ))}
      </div>
      {usedTags.length > 0 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 8 }}>
          <button className={`mj-chip ${!filterTag ? "on" : ""}`} onClick={() => setFilterTag(null)}>All tags</button>
          {usedTags.map(t => (
            <button key={t} className={`mj-chip ${filterTag === t ? "on" : ""}`}
              onClick={() => setFilterTag(filterTag === t ? null : t)}>{t}</button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: C.muted, fontSize: 15, padding: "40px 20px" }}>
          No moments match these filters.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          {filtered.map(m => <MomentCard key={m.id} m={m} onEdit={onEdit} onDelete={onDelete} />)}
        </div>
      )}
    </div>
  );
}
