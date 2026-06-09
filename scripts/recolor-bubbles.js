// Dependency-free PNG bubble recolor for the Moment Jar app icon.
// The icon (logo512.png) has bright white bubbles in the amber fill. The app's
// in-app jar uses translucent warm bubbles: rgba(255,230,200,0.20) over amber.
// This recolors the icon's bubbles to match, leaving the rest of the art alone.
//
// Detection: the only near-white pixels in the icon are the bubbles, so the blue
// channel cleanly separates them (amber/orange/gold/dark backgrounds all have low
// blue; white bubbles have high blue). We blend each pixel from the amber base
// toward the target bubble color in proportion to its "whiteness" (t), which
// preserves the anti-aliased bubble edges.

const fs = require("fs");
const zlib = require("zlib");

function decode(buf) {
  let o = 8;
  let ihdr, idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o);
    const type = buf.slice(o + 4, o + 8).toString("ascii");
    const data = buf.slice(o + 8, o + 8 + len);
    if (type === "IHDR") ihdr = data;
    if (type === "IDAT") idat.push(data);
    o += 12 + len;
  }
  const w = ihdr.readUInt32BE(0), h = ihdr.readUInt32BE(4);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4; // RGBA, 8-bit
  const stride = w * bpp;
  const px = Buffer.alloc(h * stride);
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[pos++];
    for (let x = 0; x < stride; x++) {
      const v = raw[pos++];
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
      let r;
      switch (ft) {
        case 0: r = v; break;
        case 1: r = v + a; break;
        case 2: r = v + b; break;
        case 3: r = v + ((a + b) >> 1); break;
        case 4: r = v + paeth(a, b, c); break;
        default: throw new Error("bad filter " + ft);
      }
      px[y * stride + x] = r & 0xff;
    }
  }
  return { w, h, px, stride, bpp };
}

function encode(w, h, px, stride, bpp) {
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    px.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const comp = zlib.deflateSync(raw, { level: 9 });
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0, 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", ihdr), chunk("IDAT", comp), chunk("IEND", Buffer.alloc(0)),
  ]);
}

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf) { let c = ~0; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return ~c; }

module.exports = { decode, encode };

if (require.main === module) {
  const mode = process.argv[2];
  const file = process.argv[3];
  const img = decode(fs.readFileSync(file));
  const { w, h, px, stride } = img;

  if (mode === "analyze") {
    // Histogram of blue channel + sample the amber region and white bubbles.
    const hist = new Array(256).fill(0);
    const counts = {};
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 8) continue; // skip transparent
      hist[px[i + 2]]++;
      const key = `${px[i]},${px[i + 1]},${px[i + 2]}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 14);
    console.log("Top colors (R,G,B : count):");
    top.forEach(([k, v]) => console.log("  " + k + " : " + v));
    console.log("Blue-channel buckets >120:");
    for (let b = 120; b < 256; b += 16) {
      let s = 0; for (let j = b; j < b + 16 && j < 256; j++) s += hist[j];
      if (s) console.log(`  B[${b}-${b + 15}]: ${s}`);
    }
    process.exit(0);
  }

  if (mode === "recolor") {
    // Amber fill and the target translucent-warm bubble color (rgba(255,230,200,0.20)
    // composited over the amber #C84B11). Bubbles are isolated by their blue channel.
    const amber = [200, 75, 17];
    const target = [211, 106, 54];
    const amberB = 17, bubbleB = 180;
    let changed = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 8) continue; // transparent
      const B = px[i + 2];
      let t = (B - amberB) / (bubbleB - amberB);
      if (t <= 0) continue;        // pure amber / dark / gold — leave alone
      if (t > 1) t = 1;
      px[i]     = Math.round(amber[0] + t * (target[0] - amber[0]));
      px[i + 1] = Math.round(amber[1] + t * (target[1] - amber[1]));
      px[i + 2] = Math.round(amber[2] + t * (target[2] - amber[2]));
      changed++;
    }
    const out = encode(w, h, px, stride, img.bpp);
    fs.writeFileSync(file, out);
    console.log(`recolored ${changed} px in ${file} (${out.length} bytes)`);
    process.exit(0);
  }
}
