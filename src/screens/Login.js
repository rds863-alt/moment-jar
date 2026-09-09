import { C } from "../lib/constants";
import AuthHeader from "../components/AuthHeader";

// Step 1 of sign-in: ask for the email and send a 6-digit code.
export default function Login({ email, setEmail, error, loading, onSubmit }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Instrument Sans',sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <AuthHeader />

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24 }}>
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, marginBottom: 6, color: C.dark }}>Sign in</div>
          <div style={{ color: C.muted, fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
            Enter your email and we'll send you a 6-digit code — no password needed.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input className="mj-inp" type="email" placeholder="your@email.com" value={email}
              onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && onSubmit()} />
            {error && <div style={{ color: "#DC2626", fontSize: 13 }}>{error}</div>}
            <button className="mj-btn" onClick={onSubmit} disabled={loading || !email}>
              {loading ? "Sending code…" : "Send sign-in code"}
            </button>
          </div>
          <div style={{ color: C.muted, fontSize: 12, textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
            New here? Your jar is created automatically. It syncs across all your devices.
          </div>
        </div>
      </div>
    </div>
  );
}
