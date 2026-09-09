import { useState, useEffect, useRef } from "react";

// ── Tag picker ──────────────────────────────────────────────────────────────
// Supplied (code-defined, minus this user's hidden ones) and custom tags render
// as ONE flowing set of identical chips, plus a "＋ Add" chip. Each chip carries
// a subtle × that hides (supplied) or deletes (custom) the tag. Selecting works
// the same for either kind — it just sets the tag string onto the moment.
export default function TagPicker({ selected, onSelect, supplied, custom, onAddCustom, onDeleteCustom, onHideSupplied }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { if (adding && inputRef.current) inputRef.current.focus(); }, [adding]);

  const chips = [
    ...supplied.map(t => ({ key: "s:" + t, name: t, kind: "supplied" })),
    ...custom.map(c => ({ key: "c:" + c.id, name: c.name, kind: "custom", id: c.id })),
  ];

  const commitAdd = () => {
    const v = name.trim();
    setName(""); setAdding(false);
    if (!v) return;
    // addCustomTag returns the canonical tag name to select (handles dedupe /
    // re-showing a previously hidden supplied tag).
    const canonical = onAddCustom(v) || v;
    onSelect(canonical);
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {chips.map(c => {
        const on = selected === c.name;
        return (
          <span key={c.key} className={`mj-tagchip ${on ? "on" : ""}`}>
            <button type="button" className="mj-tagchip-label"
              onClick={() => onSelect(on ? null : c.name)}>{c.name}</button>
            <button type="button" className="mj-tagchip-x"
              title={c.kind === "custom" ? "Delete tag" : "Hide tag"}
              aria-label={c.kind === "custom" ? `Delete tag ${c.name}` : `Hide tag ${c.name}`}
              onClick={() => c.kind === "custom" ? onDeleteCustom(c.id, c.name) : onHideSupplied(c.name)}>
              ×
            </button>
          </span>
        );
      })}

      {adding ? (
        <span className="mj-tagchip on" style={{ paddingLeft: 2 }}>
          <input ref={inputRef} className="mj-tag-input" value={name} maxLength={24}
            placeholder="New tag…"
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); commitAdd(); }
              else if (e.key === "Escape") { setName(""); setAdding(false); }
            }}
            onBlur={commitAdd} />
        </span>
      ) : (
        <button type="button" className="mj-tagchip mj-tagchip-add" onClick={() => setAdding(true)}>
          ＋ Add
        </button>
      )}
    </div>
  );
}
