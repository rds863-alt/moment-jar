import { FILL_GOAL, moodLabelOf } from "./constants";
import { parseDate, formatWarmDate } from "./dates";

// ════════════════════════════════════════════════════════════════════════════
//  Year-in-review printable book (client-side PDF via jsPDF, lazy-loaded)
//  Pure function of already-loaded moments — no backend involved.
// ════════════════════════════════════════════════════════════════════════════
export async function generateYearBook(year, moments) {
  // jsPDF is dynamically imported so it ships as its own chunk and only
  // downloads when someone actually makes a book (keeps the main bundle lean).
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const W = 210, H = 297, M = 20;          // page + margin (mm)
  const CW = W - M * 2;                      // content width
  const BOTTOM = H - 20;                      // last usable baseline (above footer)
  const COL = {
    accent: "#C84B11", bg: "#FFF8F0", dark: "#6B3410",
    muted: "#8A7866", border: "#EADBCB",
  };

  const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  // This year's moments, oldest first (date, then created_at as a tiebreak).
  const items = moments
    .filter(m => parseDate(m.date).getFullYear() === year)
    .sort((a, b) =>
      (a.date || "").localeCompare(b.date || "") ||
      (a.created_at || "").localeCompare(b.created_at || ""));

  // ── Cover page ──────────────────────────────────────────────────────────
  doc.setFillColor(COL.bg);
  doc.rect(0, 0, W, H, "F");

  // Jar — same fill formula as the home jar so the cover matches year-end.
  const fraction = items.length === 0 ? 0
    : Math.max(0.05, Math.min(items.length / FILL_GOAL, 1));
  const bodyX = 83, bodyTop = 70, bodyW = 44, bodyH = 60, corner = 6;
  const innerTop = bodyTop + 4, innerBottom = bodyTop + bodyH - 3;
  const innerH = innerBottom - innerTop, innerX = bodyX + 3, innerW = bodyW - 6;
  const fillH = fraction <= 0 ? 0 : Math.max(2, fraction * innerH);
  const fillY = innerBottom - fillH;
  // liquid (drawn first, glass outline goes on top)
  if (fillH > 0) {
    doc.setFillColor(COL.accent);
    doc.roundedRect(innerX, fillY, innerW, fillH, Math.min(3, fillH / 2), Math.min(3, fillH / 2), "F");
  }
  // glass body outline
  doc.setDrawColor(COL.dark);
  doc.setLineWidth(0.9);
  doc.roundedRect(bodyX, bodyTop, bodyW, bodyH, corner, corner, "S");
  // lid
  doc.setFillColor(COL.dark);
  doc.roundedRect(105 - 13, bodyTop - 8, 26, 8, 2, 2, "F");

  doc.setTextColor(COL.accent);
  doc.setFont("times", "bold");
  doc.setFontSize(46);
  doc.text(String(year), 105, 160, { align: "center" });

  doc.setTextColor(COL.dark);
  doc.setFont("times", "italic");
  doc.setFontSize(17);
  doc.text("A Year of Moments", 105, 172, { align: "center" });

  doc.setTextColor(COL.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const noun = items.length === 1 ? "moment" : "moments";
  doc.text(`${items.length} ${noun} captured with Moment Jar`, 105, 184, { align: "center" });
  doc.setFontSize(10.5);
  doc.text(`January – December ${year}`, 105, 191, { align: "center" });

  // ── Interior pages ──────────────────────────────────────────────────────
  const DATE_LH = 5, BODY_LH = 5, META_LH = 6, PRE_GAP = 3, HEAD_LH = 9;
  let y = M;
  const newPage = () => { doc.addPage(); y = M; };

  const momentHeight = (lines) => PRE_GAP + DATE_LH + lines.length * BODY_LH + META_LH;

  const drawMoment = (m, lines) => {
    y += PRE_GAP;
    // date
    y += DATE_LH;
    doc.setTextColor(COL.accent);
    doc.setFont("times", "italic");
    doc.setFontSize(10.5);
    doc.text(formatWarmDate(m.date), M, y);
    // text
    doc.setTextColor(COL.dark);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    lines.forEach(ln => { y += BODY_LH; doc.text(ln, M, y); });
    // mood label + tag
    const parts = [];
    const ml = moodLabelOf(m.mood);
    if (ml) parts.push(ml);
    if (m.tag) parts.push(m.tag);
    if (parts.length) {
      y += META_LH;
      doc.setTextColor(COL.muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(parts.join("   ·   "), M, y);
    } else {
      y += META_LH;
    }
  };

  const drawHeading = (label) => {
    y += HEAD_LH;
    doc.setTextColor(COL.dark);
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    doc.text(label, M, y);
    y += 2.5;
    doc.setDrawColor(COL.border);
    doc.setLineWidth(0.3);
    doc.line(M, y, M + CW, y);
    y += 2;
  };

  if (items.length > 0) {
    doc.addPage();
    y = M;
    let curMonth = null;
    items.forEach(m => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(m.text || "", CW);
      const mh = momentHeight(lines);
      const mk = String(m.date || "").slice(0, 7);
      if (mk !== curMonth) {
        curMonth = mk;
        const [yy, mm] = mk.split("-").map(Number);
        const label = `${MONTHS[(mm || 1) - 1]} ${yy}`;
        // Keep the heading with its first moment — never orphan it at a page foot.
        if (y + HEAD_LH + 4.5 + mh > BOTTOM) newPage();
        drawHeading(label);
      } else if (y + mh > BOTTOM) {
        // A single moment never splits across a page break.
        newPage();
      }
      drawMoment(m, lines);
    });
  }

  // ── Footers (page numbers on interior pages only) ───────────────────────
  const pages = doc.getNumberOfPages();
  for (let p = 2; p <= pages; p++) {
    doc.setPage(p);
    doc.setTextColor(COL.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`Moment Jar · ${year}`, M, H - 12);
    doc.text(`${p - 1}`, W - M, H - 12, { align: "right" });
  }

  doc.save(`Moment Jar — ${year}.pdf`);
}
