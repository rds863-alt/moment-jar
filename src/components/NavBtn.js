import { C } from "../lib/constants";

export default function NavBtn({ label, icon, active, onClick }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2, width: 80,
      color: active ? C.accent : C.muted, fontFamily: "inherit", padding: "4px 0" }}>
      <span style={{ fontSize: 20, filter: active ? "none" : "grayscale(0.4)", opacity: active ? 1 : 0.7 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
    </button>
  );
}
