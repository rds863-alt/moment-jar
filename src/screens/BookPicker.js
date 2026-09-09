import { C } from "../lib/constants";

// Bottom-sheet overlay: pick a completed year to download as a PDF book.
export default function BookPicker({ onClose, bookBusy, completedYears, onMake }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,10,0,.45)", zIndex: 55,
      display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={() => !bookBusy && onClose()}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, width: "100%", maxWidth: 560,
        borderRadius: "22px 22px 0 0", padding: "20px 22px calc(24px + env(safe-area-inset-bottom))",
        animation: "mjfade .25s ease", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 99, margin: "0 auto 18px" }} />
        <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, color: C.dark, marginBottom: 4 }}>
          Your printable book
        </div>
        <div style={{ color: C.muted, fontSize: 13.5, marginBottom: 16, lineHeight: 1.5 }}>
          Each completed year becomes a little keepsake — a cover and every moment,
          ready to print or save as a PDF.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {completedYears.map(({ year, count }) => (
            <button key={year} onClick={() => onMake(year)} disabled={!!bookBusy}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px",
                cursor: bookBusy ? "default" : "pointer", fontFamily: "inherit", textAlign: "left",
                opacity: bookBusy && bookBusy !== year ? 0.5 : 1 }}>
              <div>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, color: C.dark }}>{year}</div>
                <div style={{ color: C.muted, fontSize: 12.5, marginTop: 2 }}>
                  {count} {count === 1 ? "moment" : "moments"}
                </div>
              </div>
              <span style={{ color: C.accent, fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                {bookBusy === year ? "Preparing…" : "Download PDF →"}
              </span>
            </button>
          ))}
        </div>

        <button onClick={onClose} disabled={!!bookBusy} style={{ background: "none", border: "none",
          color: C.muted, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 16, fontFamily: "inherit" }}>
          Close
        </button>
      </div>
    </div>
  );
}
