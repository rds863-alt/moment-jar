import { C } from "../lib/constants";

// Brief bottom-of-screen message ("Dropped in the jar ✨"). Renders nothing
// when there is no message.
export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{ position: "fixed", bottom: "calc(100px + env(safe-area-inset-bottom))", left: "50%",
      transform: "translateX(-50%)", background: C.dark, color: "#fff", padding: "12px 20px",
      borderRadius: 999, fontSize: 14, fontWeight: 600, zIndex: 60, animation: "mjfade .25s ease",
      boxShadow: "0 6px 20px rgba(0,0,0,.2)" }}>
      {message}
    </div>
  );
}
