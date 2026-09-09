import { C } from "../lib/constants";
import AuthHeader from "../components/AuthHeader";

// Step 2 of sign-in: enter the 6-digit code from the email.
export default function Verify({ email, otp, setOtp, error, loading, onSubmit, onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Instrument Sans',sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <AuthHeader />

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24 }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, marginBottom: 6, color: C.dark }}>Check your email</div>
          <div style={{ color: C.muted, fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
            We sent a 6-digit code to <strong>{email}</strong>. Enter it below to sign in.
          </div>
          <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: "10px 14px", marginBottom: 16, fontSize: 12, color: C.accentD, lineHeight: 1.5 }}>
            💡 <strong>First time signing in?</strong> You may get a "confirm your email" message first.
            If so, go back and request the code again — the second email will contain your 6-digit code.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input className="mj-inp" type="number" placeholder="123456" value={otp}
              onChange={e => setOtp(e.target.value)} onKeyDown={e => e.key === "Enter" && onSubmit()}
              style={{ letterSpacing: "0.3em", fontSize: 24, textAlign: "center", fontWeight: "bold" }} />
            {error && <div style={{ color: "#DC2626", fontSize: 13, textAlign: "center" }}>{error}</div>}
            <button className="mj-btn" onClick={onSubmit} disabled={loading || !otp}>
              {loading ? "Verifying…" : "Open my jar"}
            </button>
            <button onClick={onBack}
              style={{ background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer",
                fontFamily: "inherit", padding: 4 }}>
              ← Use a different email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
