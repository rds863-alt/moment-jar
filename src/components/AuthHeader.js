import { C } from "../lib/constants";
import Jar from "./Jar";

// Small jar + wordmark shown above the sign-in and verify cards.
export default function AuthHeader() {
  return (
    <div style={{ textAlign: "center", marginBottom: 32 }}>
      <div style={{ width: 64, height: 80, margin: "0 auto 8px" }}><Jar count={24} fraction={0.5} /></div>
      <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, color: C.dark }}>Moment Jar</div>
      <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>One moment at a time</div>
    </div>
  );
}
