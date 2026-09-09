import { useMemo } from "react";
import { C } from "../lib/constants";

// ════════════════════════════════════════════════════════════════════════════
//  Jar illustration — fills as moments accumulate
// ════════════════════════════════════════════════════════════════════════════
export default function Jar({ count, fraction, celebrate }) {
  const interiorTop = 56, interiorBottom = 222, interiorLeft = 46, interiorRight = 154;
  const interiorH = interiorBottom - interiorTop;
  const fillH = fraction <= 0 ? 0 : Math.max(8, fraction * interiorH);
  const fillTop = interiorBottom - fillH;

  // Deterministic scattered "moment" dots within the filled liquid
  const dots = useMemo(() => {
    const n = Math.min(count, 42);
    const arr = [];
    let seed = 13;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < n; i++) {
      const x = interiorLeft + 10 + rand() * (interiorRight - interiorLeft - 20);
      const usableH = Math.max(6, fillH - 12);
      const y = interiorBottom - 8 - rand() * usableH;
      arr.push({ x, y, r: 2.4 + rand() * 2.4, o: 0.5 + rand() * 0.45 });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, fraction]);

  return (
    <svg viewBox="0 0 200 240" width="100%" height="100%" style={{ display: "block", maxHeight: 280 }}>
      <defs>
        <linearGradient id="liquid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8742E" />
          <stop offset="100%" stopColor={C.accent} />
        </linearGradient>
        <clipPath id="jarInterior">
          <path d="M46 56 Q46 50 52 50 L148 50 Q154 50 154 56 L154 212 Q154 224 142 224 L58 224 Q46 224 46 212 Z" />
        </clipPath>
      </defs>

      {/* Lid */}
      <rect x="62" y="14" width="76" height="20" rx="7" fill={C.dark} />
      <rect x="70" y="30" width="60" height="12" rx="4" fill="#2e1505" />

      {/* Liquid fill (clipped to jar interior) */}
      <g clipPath="url(#jarInterior)">
        {/* rect + surface ride together so the ripple reads as one settling wave */}
        <g className={celebrate ? "mj-rippling" : ""}
          style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}>
          <rect
            x="40" width="120" y={fillTop} height={fillH + 6}
            fill="url(#liquid)"
            style={{ transition: "y .9s cubic-bezier(.22,1,.36,1), height .9s cubic-bezier(.22,1,.36,1)" }}
          />
          {/* surface highlight */}
          {fraction > 0 && (
            <ellipse cx="100" cy={fillTop} rx="58" ry="5" fill="#F4A86A" opacity="0.85"
              style={{ transition: "cy .9s cubic-bezier(.22,1,.36,1)" }} />
          )}
        </g>
        {dots.map((d, i) => (
          // Soft, warm, translucent bubbles — consistent across every jar.
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="rgba(255, 230, 200, 0.20)" />
        ))}
      </g>

      {/* Glass body outline */}
      <path
        d="M46 56 Q46 50 52 50 L148 50 Q154 50 154 56 L154 212 Q154 224 142 224 L58 224 Q46 224 46 212 Z"
        fill="none" stroke={C.dark} strokeWidth="4" strokeLinejoin="round"
      />
      {/* glass shine */}
      <path d="M60 64 L60 200" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}
