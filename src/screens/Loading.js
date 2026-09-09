import { C } from "../lib/constants";
import Jar from "../components/Jar";

// Shown while the stored session is being checked (skipped when local moments exist).
export default function Loading() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", fontFamily: "'Instrument Sans',sans-serif" }}>
      <div style={{ width: 120, height: 140 }}><Jar count={8} fraction={0.4} /></div>
      <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, color: C.dark, marginTop: 12 }}>Moment Jar</div>
      <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: C.accent,
            animation: `mjbounce 1.2s ${i * 0.16}s infinite ease-in-out` }} />
        ))}
      </div>
    </div>
  );
}
