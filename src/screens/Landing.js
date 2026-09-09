import { C } from "../lib/constants";
import Jar from "../components/Jar";

// First screen for a visitor with no session and no local moments.
export default function Landing({ animIn, onStart }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Instrument Sans',sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px 28px", textAlign: "center" }}>
      <div style={{ width: 180, height: 220, opacity: animIn ? 1 : 0, transform: animIn ? "none" : "translateY(12px)",
        transition: "all .7s cubic-bezier(.22,1,.36,1)" }}>
        <Jar count={36} fraction={0.62} />
      </div>
      <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 34,
        color: C.dark, margin: "18px 0 0", lineHeight: 1.15, letterSpacing: "-.5px" }}>
        More than you remember.<br />One moment at a time.
      </h1>
      <p style={{ color: C.muted, fontSize: 16, lineHeight: 1.55, maxWidth: 360, margin: "16px 0 30px" }}>
        Add one small good thing that happened today. At the end of the year,
        open the jar and read them all back.
      </p>
      <button className="mj-btn" style={{ maxWidth: 280 }} onClick={onStart}>
        Start your jar
      </button>
      <button onClick={onStart} style={{ background: "none", border: "none",
        color: C.accent, fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 16, fontFamily: "inherit" }}>
        I already have a jar →
      </button>
    </div>
  );
}
