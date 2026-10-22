import { hashString, seededRandom } from '../domain/random';
import type { StickerArt } from '../domain/stickerArt';

/**
 * Sticker artwork, drawn on a canvas: used as the decal on the 3D carrier and as the picture on
 * the arrival screen, so both always match.
 *
 *  - The travel label (kind "bag_tag"): a vintage luggage label for the destination, designed per
 *    country: its own shape (oval, shield, diamond, Nepal's pennant…), always a whole shape (a flag is
 *    never shown cut or torn), colors and a motif taken from the
 *    flag (bands, a disc, a cross, a star, the sun…), with a cream ribbon carrying the city name.
 *  - Handling stickers the ground crew puts on: PRIORITY, FRAGILE, HEAVY, SCREENED, TRANSFER.
 *
 * Every sticker fits a 2:1 box (the carrier's sticker spot); `scale` is its width in that box.
 */

type Shape = 'rect' | 'oval' | 'circle' | 'shield' | 'pennant' | 'diamond';
type Layout = 'bands' | 'vbands' | 'field' | 'disc' | 'cross' | 'nordic' | 'diagonal' | 'hoist';
type Motif = 'star' | 'stars' | 'sun' | 'crescent' | 'wheel' | 'taegeuk' | 'pyramid' | 'wave' | 'palm' | 'maple' | 'none';

interface Look {
  /** Background colors, in the layout's order. */
  colors: string[];
  layout: Layout;
  shape: Shape;
  motif?: Motif;
  /** Motif color. */
  mark?: string;
}

/** One look per destination country (the ones the app flies to), from its flag and its feel. */
const LOOKS: Record<string, Look> = {
  KR: { colors: ['#f7f3ea'], layout: 'field', shape: 'circle', motif: 'taegeuk' },
  JP: { colors: ['#f7f3ea', '#c8102e'], layout: 'disc', shape: 'rect' },
  CN: { colors: ['#c8102e'], layout: 'field', shape: 'oval', motif: 'stars', mark: '#ffcd00' },
  US: { colors: ['#b22234', '#f7f3ea'], layout: 'bands', shape: 'shield', motif: 'stars', mark: '#f7f3ea' },
  VN: { colors: ['#da251d'], layout: 'field', shape: 'rect', motif: 'star', mark: '#ffcd00' },
  PH: { colors: ['#0038a8', '#ce1126'], layout: 'bands', shape: 'oval', motif: 'sun', mark: '#fcd116' },
  IN: { colors: ['#ff9933', '#f7f3ea', '#138808'], layout: 'bands', shape: 'circle', motif: 'wheel', mark: '#000080' },
  ID: { colors: ['#ce1126', '#f7f3ea'], layout: 'bands', shape: 'rect', motif: 'palm', mark: '#2f5d3a' },
  ES: { colors: ['#aa151b', '#f1bf00', '#aa151b'], layout: 'bands', shape: 'oval', motif: 'sun', mark: '#aa151b' },
  CA: { colors: ['#d52b1e', '#f7f3ea', '#d52b1e'], layout: 'vbands', shape: 'rect', motif: 'maple', mark: '#d52b1e' },
  AU: { colors: ['#012169'], layout: 'field', shape: 'oval', motif: 'stars', mark: '#f7f3ea' },
  ZA: { colors: ['#007a4d', '#ffb612'], layout: 'diagonal', shape: 'shield', motif: 'sun', mark: '#ffb612' },
  UZ: { colors: ['#1eb53a', '#f7f3ea', '#0099b5'], layout: 'bands', shape: 'oval', motif: 'crescent', mark: '#f7f3ea' },
  TW: { colors: ['#fe0000', '#000095'], layout: 'hoist', shape: 'rect', motif: 'sun', mark: '#f7f3ea' },
  TR: { colors: ['#e30a17'], layout: 'field', shape: 'oval', motif: 'crescent', mark: '#f7f3ea' },
  TH: { colors: ['#a51931', '#f4f5f8', '#2d2a4a', '#f4f5f8', '#a51931'], layout: 'bands', shape: 'rect', motif: 'none' },
  SG: { colors: ['#ef3340', '#f7f3ea'], layout: 'bands', shape: 'circle', motif: 'crescent', mark: '#f7f3ea' },
  RU: { colors: ['#f7f3ea', '#0039a6', '#d52b1e'], layout: 'bands', shape: 'shield', motif: 'none' },
  QA: { colors: ['#8a1538', '#f7f3ea'], layout: 'hoist', shape: 'oval', motif: 'none' },
  NZ: { colors: ['#012169'], layout: 'field', shape: 'rect', motif: 'wave', mark: '#cc142b' },
  NP: { colors: ['#dc143c'], layout: 'field', shape: 'oval', motif: 'sun', mark: '#f7f3ea' },
  NL: { colors: ['#ae1c28', '#f7f3ea', '#21468b'], layout: 'bands', shape: 'rect', motif: 'none' },
  MY: { colors: ['#cc0001', '#f7f3ea', '#cc0001', '#f7f3ea'], layout: 'bands', shape: 'oval', motif: 'crescent', mark: '#ffcc00' },
  MX: { colors: ['#006847', '#f7f3ea', '#ce1126'], layout: 'vbands', shape: 'circle', motif: 'sun', mark: '#a0742a' },
  MP: { colors: ['#0071bc'], layout: 'field', shape: 'oval', motif: 'palm', mark: '#f7f3ea' },
  GU: { colors: ['#00297b', '#c62139'], layout: 'field', shape: 'oval', motif: 'palm', mark: '#f7f3ea' },
  MO: { colors: ['#00785e'], layout: 'field', shape: 'circle', motif: 'stars', mark: '#fbd116' },
  HK: { colors: ['#de2910'], layout: 'field', shape: 'oval', motif: 'star', mark: '#f7f3ea' },
  MN: { colors: ['#c4272f', '#015197', '#c4272f'], layout: 'vbands', shape: 'shield', motif: 'sun', mark: '#f9cf02' },
  LK: { colors: ['#8d153a', '#eb7400'], layout: 'hoist', shape: 'rect', motif: 'sun', mark: '#ffbe29' },
  KZ: { colors: ['#00afca'], layout: 'field', shape: 'circle', motif: 'sun', mark: '#fec50c' },
  IT: { colors: ['#009246', '#f7f3ea', '#ce2b37'], layout: 'vbands', shape: 'oval', motif: 'none' },
  GB: { colors: ['#012169', '#f7f3ea', '#c8102e'], layout: 'cross', shape: 'shield', motif: 'none' },
  FR: { colors: ['#002395', '#f7f3ea', '#ed2939'], layout: 'vbands', shape: 'rect', motif: 'none' },
  FI: { colors: ['#f7f3ea', '#003580'], layout: 'nordic', shape: 'shield', motif: 'none' },
  EG: { colors: ['#ce1126', '#f7f3ea', '#000000'], layout: 'bands', shape: 'rect', motif: 'pyramid', mark: '#c09300' },
  DK: { colors: ['#c8102e', '#f7f3ea'], layout: 'nordic', shape: 'rect', motif: 'none' },
  DE: { colors: ['#000000', '#dd0000', '#ffce00'], layout: 'bands', shape: 'shield', motif: 'none' },
  CZ: { colors: ['#f7f3ea', '#d7141a', '#11457e'], layout: 'hoist', shape: 'rect', motif: 'none' },
  CH: { colors: ['#d52b1e', '#f7f3ea'], layout: 'cross', shape: 'circle', motif: 'none' },
  BR: { colors: ['#009c3b', '#ffdf00'], layout: 'field', shape: 'oval', motif: 'sun', mark: '#002776' },
  AT: { colors: ['#ed2939', '#f7f3ea', '#ed2939'], layout: 'bands', shape: 'oval', motif: 'pyramid', mark: '#f7f3ea' },
  AE: { colors: ['#00732f', '#f7f3ea', '#000000', '#ff0000'], layout: 'hoist', shape: 'rect', motif: 'sun', mark: '#c9a227' },
};

/** A country we don't have a look for still gets its own, made up from its code. */
function lookFor(countryCode: string): Look {
  const known = LOOKS[countryCode];
  if (known) return known;
  const rand = seededRandom(hashString(countryCode || 'xx'));
  const inks = ['#1f3a5f', '#8a1538', '#2f5d3a', '#b5651d', '#5b3a8a', '#0f6b6b'];
  const shapes: Shape[] = ['rect', 'oval', 'shield'];
  return {
    colors: [inks[Math.floor(rand() * inks.length)], '#f7f3ea'],
    layout: rand() < 0.5 ? 'bands' : 'field',
    shape: shapes[Math.floor(rand() * shapes.length)],
    motif: 'sun',
    mark: '#e6b54a',
  };
}

// --- Drawing helpers ---------------------------------------------------------------------------

const W = 512;
const H = 256;
const CREAM = '#f6efe0';
const INK = '#1d1a16';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

/** The label's outline, and the width the city name may take on the ribbon. */
function outline(shape: Shape): { path: Path2D; text: { cx: number; w: number; line: number } } {
  const p = new Path2D();
  switch (shape) {
    case 'oval':
      p.ellipse(W / 2, H / 2, 240, 116, 0, 0, Math.PI * 2);
      return { path: p, text: { cx: W / 2, w: 380, line: 228 } };
    case 'circle':
      p.arc(W / 2, H / 2, 120, 0, Math.PI * 2);
      return { path: p, text: { cx: W / 2, w: 180, line: 118 } };
    case 'shield':
      p.moveTo(110, 16);
      p.lineTo(402, 16);
      p.quadraticCurveTo(402, 150, W / 2, 242);
      p.quadraticCurveTo(110, 150, 110, 16);
      p.closePath();
      return { path: p, text: { cx: W / 2, w: 250, line: 230 } };
    case 'pennant':
      p.moveTo(14, 18);
      p.lineTo(500, H / 2);
      p.lineTo(14, H - 18);
      p.closePath();
      return { path: p, text: { cx: 190, w: 300, line: 200 } };
    case 'diamond':
      p.moveTo(W / 2, 8);
      p.lineTo(W - 8, H / 2);
      p.lineTo(W / 2, H - 8);
      p.lineTo(8, H / 2);
      p.closePath();
      return { path: p, text: { cx: W / 2, w: 300, line: 160 } };
    default:
      p.roundRect(14, 14, W - 28, H - 28, 18);
      return { path: p, text: { cx: W / 2, w: 440, line: 440 } };
  }
}

/** The flag, drawn whole into a W × h region (the ribbon never crosses it). */
function background(ctx: CanvasRenderingContext2D, look: Look, h: number) {
  const [a, b = a, c = b] = look.colors;
  const n = look.colors.length;
  switch (look.layout) {
    case 'bands':
      look.colors.forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.fillRect(0, (h / n) * i, W, h / n + 1);
      });
      break;
    case 'vbands':
      look.colors.forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.fillRect((W / n) * i, 0, W / n + 1, h);
      });
      break;
    case 'disc':
      ctx.fillStyle = a;
      ctx.fillRect(0, 0, W, h);
      ctx.fillStyle = b;
      ctx.beginPath();
      ctx.arc(W / 2, h / 2, h * 0.32, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'cross':
      ctx.fillStyle = a;
      ctx.fillRect(0, 0, W, h);
      ctx.fillStyle = b;
      ctx.fillRect(W / 2 - 26, 0, 52, h);
      ctx.fillRect(0, h / 2 - 26, W, 52);
      if (n > 2) {
        ctx.fillStyle = c;
        ctx.fillRect(W / 2 - 13, 0, 26, h);
        ctx.fillRect(0, h / 2 - 13, W, 26);
      }
      break;
    case 'nordic':
      ctx.fillStyle = a;
      ctx.fillRect(0, 0, W, h);
      ctx.fillStyle = b;
      ctx.fillRect(150, 0, 44, h);
      ctx.fillRect(0, h / 2 - 22, W, 44);
      break;
    case 'diagonal':
      ctx.fillStyle = a;
      ctx.fillRect(0, 0, W, h);
      ctx.fillStyle = b;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(200, h / 2);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      break;
    case 'hoist':
      // A block of color along the hoist (left), the rest in the other colors.
      look.colors.slice(1).forEach((col, i, rest) => {
        ctx.fillStyle = col;
        ctx.fillRect(0, (h / rest.length) * i, W, h / rest.length + 1);
      });
      ctx.fillStyle = a;
      ctx.fillRect(0, 0, 150, h);
      break;
    default:
      ctx.fillStyle = a;
      ctx.fillRect(0, 0, W, h);
  }
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** The motif sits in the middle of the flag. */
function motif(ctx: CanvasRenderingContext2D, look: Look, cx: number, cy: number) {
  const m = look.motif ?? 'none';
  const col = look.mark ?? INK;
  const y = cy - 4;
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  switch (m) {
    case 'star':
      star(ctx, cx, y, 26);
      break;
    case 'stars':
      for (const [dx, dy, r] of [
        [0, 0, 20],
        [-52, 8, 11],
        [52, 8, 11],
        [-28, -14, 8],
        [28, -14, 8],
      ])
        star(ctx, cx + dx, y + dy, r);
      break;
    case 'sun':
      ctx.beginPath();
      ctx.arc(cx, y + 4, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 23, y + 4 + Math.sin(a) * 23);
        ctx.lineTo(cx + Math.cos(a) * 33, y + 4 + Math.sin(a) * 33);
        ctx.stroke();
      }
      break;
    case 'crescent': {
      // The outer disc less an inner one, filled only inside the outer (nothing punched through).
      const outer = new Path2D();
      outer.arc(cx - 8, y + 2, 24, 0, Math.PI * 2);
      const moon = new Path2D(outer);
      moon.arc(cx, y + 2, 20, 0, Math.PI * 2);
      ctx.save();
      ctx.clip(outer);
      ctx.fill(moon, 'evenodd');
      ctx.restore();
      star(ctx, cx + 26, y + 2, 11);
      break;
    }
    case 'wheel':
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(cx, y + 2, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI) / 12;
        ctx.beginPath();
        ctx.moveTo(cx, y + 2);
        ctx.lineTo(cx + Math.cos(a) * 24, y + 2 + Math.sin(a) * 24);
        ctx.stroke();
      }
      break;
    case 'taegeuk': {
      const r = 26;
      ctx.fillStyle = '#cd2e3a';
      ctx.beginPath();
      ctx.arc(cx, y + 4, r, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#0047a0';
      ctx.beginPath();
      ctx.arc(cx, y + 4, r, 0, Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx - r / 2, y + 4, r / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#cd2e3a';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + r / 2, y + 4, r / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#0047a0';
      ctx.fill();
      // The four trigrams, in short black bars at the corners.
      ctx.fillStyle = INK;
      for (const [dx, dy, rot] of [
        [-62, -14, -0.6],
        [62, -14, 0.6],
        [-62, 22, 0.6],
        [62, 22, -0.6],
      ]) {
        ctx.save();
        ctx.translate(cx + dx, y + 4 + dy);
        ctx.rotate(rot);
        for (let k = -1; k <= 1; k++) ctx.fillRect(-12, k * 7 - 2, 24, 4);
        ctx.restore();
      }
      break;
    }
    case 'pyramid':
      ctx.beginPath();
      ctx.moveTo(cx - 36, y + 26);
      ctx.lineTo(cx, y - 18);
      ctx.lineTo(cx + 36, y + 26);
      ctx.closePath();
      ctx.fill();
      break;
    case 'wave':
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        for (let x = -60; x <= 60; x += 4) ctx.lineTo(cx + x, y + k * 14 + Math.sin(x / 10) * 6);
        ctx.stroke();
      }
      break;
    case 'palm': {
      // A leaning trunk, and fronds arching out and drooping at the tips.
      const top = { x: cx - 2, y: y - 12 };
      ctx.lineCap = 'round';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx + 10, y + 32);
      ctx.quadraticCurveTo(cx + 6, y + 8, top.x, top.y);
      ctx.stroke();
      ctx.lineWidth = 5;
      for (const [dx, dy, lift] of [
        [-38, 10, 20],
        [-26, -10, 14],
        [-4, -22, 8],
        [24, -10, 14],
        [38, 10, 20],
      ]) {
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.quadraticCurveTo(top.x + dx * 0.5, top.y + dy * 0.5 - lift, top.x + dx, top.y + dy);
        ctx.stroke();
      }
      break;
    }
    case 'maple': {
      // A simple eleven-point leaf.
      const pts = [
        [0, -30], [7, -16], [16, -20], [12, 0], [26, -6], [22, 6], [30, 10], [12, 14], [14, 22], [2, 18], [2, 32],
        [-2, 32], [-2, 18], [-14, 22], [-12, 14], [-30, 10], [-22, 6], [-26, -6], [-12, 0], [-16, -20], [-7, -16],
      ];
      ctx.beginPath();
      pts.forEach(([x, yy], i) => (i ? ctx.lineTo(cx + x, y + 2 + yy) : ctx.moveTo(cx + x, y + 2 + yy)));
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
}

/** Shrinks the font until the text fits `max` wide. */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, px: number, max: number, least = 14) {
  let size = px;
  ctx.font = font(size);
  while (size > least && ctx.measureText(text).width > max) {
    size -= 1;
    ctx.font = font(size);
  }
}

/** Paper yellows a little with each newer sticker on top of it (0 = newest). */
const aged = (age: number) => Math.min(1, age / 12);

function weather(ctx: CanvasRenderingContext2D, clip: Path2D | null, w: number, h: number, age: number, seed: number) {
  const rand = seededRandom(seed);
  ctx.save();
  if (clip) ctx.clip(clip);
  ctx.fillStyle = `rgba(214, 186, 120, ${0.2 * aged(age)})`;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 36; i++) {
    ctx.fillStyle = `rgba(90, 70, 40, ${0.035 + rand() * 0.05 * (0.4 + aged(age))})`;
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, 1 + rand() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function dayOf(t: number) {
  return new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase().replace(' ', '');
}

// --- The travel label ----------------------------------------------------------------------------

function travelLabel(s: StickerArt, age: number): HTMLCanvasElement {
  const look = lookFor(s.countryCode);
  const { c, ctx } = canvas(W, H);
  const { path, text } = outline(look.shape);

  // The flag on one part of the label, whole; the cream ribbon with the city on the other part
  // (below it, or above it on a shield, which narrows to a point at the bottom).
  const top = look.shape === 'shield';
  const ribbon = top ? { y: 0, h: 104 } : { y: 146, h: H - 146 };
  const flag = top ? { y: 104, h: H - 104 } : { y: 0, h: 146 };
  ctx.save();
  ctx.clip(path);
  ctx.save();
  ctx.translate(0, flag.y);
  ctx.beginPath();
  ctx.rect(0, 0, W, flag.h);
  ctx.clip();
  background(ctx, look, flag.h);
  motif(ctx, look, text.cx, flag.h / 2);
  ctx.restore();
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, ribbon.y, W, ribbon.h);
  ctx.fillStyle = look.colors[0] === '#f7f3ea' || look.colors[0] === '#f4f5f8' ? (look.colors[1] ?? INK) : look.colors[0];
  ctx.fillRect(0, top ? ribbon.h - 4 : ribbon.y, W, 4);
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const city = s.city.toUpperCase();
  const cityY = top ? 66 : ribbon.y + 56;
  const lineY = top ? 90 : ribbon.y + 82;
  fit(ctx, city, (px) => `500 ${px}px "Barlow Condensed", "Arial Narrow", sans-serif`, top ? 50 : 58, text.w);
  ctx.fillText(city, text.cx, cityY);
  // Narrow labels (a circle, a shield) leave out the country: the city says it.
  const narrow = text.w < 220;
  const line = [narrow ? '' : s.country.toUpperCase(), s.code, s.flightNumber, dayOf(s.appliedAt)].filter(Boolean).join(' · ');
  fit(ctx, line, (px) => `500 ${px}px "IBM Plex Mono", monospace`, 14, text.line, 8);
  ctx.fillText(line, text.cx, lineY);
  ctx.restore();

  // A white inner rule and the printed edge.
  ctx.save();
  ctx.clip(path);
  ctx.lineWidth = 14;
  ctx.strokeStyle = 'rgba(255, 252, 244, 0.85)';
  ctx.stroke(path);
  ctx.restore();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(29, 26, 22, 0.55)';
  ctx.stroke(path);

  weather(ctx, path, W, H, age, hashString(`${s.id}|paper`));
  return c;
}

// --- Handling stickers ----------------------------------------------------------------------------

function priority(s: StickerArt, age: number): HTMLCanvasElement {
  const { c, ctx } = canvas(384, 160);
  ctx.fillStyle = '#c8321f';
  ctx.fillRect(0, 0, 384, 160);
  ctx.strokeStyle = '#fbe9d2';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, 360, 136);
  ctx.fillStyle = '#fbe9d2';
  ctx.textAlign = 'center';
  ctx.font = '500 78px "Barlow Condensed", "Arial Narrow", sans-serif';
  ctx.fillText('PRIORITY', 192, 100);
  fit(ctx, s.airlineName.toUpperCase(), (px) => `500 ${px}px "IBM Plex Mono", monospace`, 20, 320);
  ctx.fillText(s.airlineName.toUpperCase(), 192, 134);
  weather(ctx, null, 384, 160, age, hashString(`${s.id}|paper`));
  return c;
}

function fragile(s: StickerArt, age: number): HTMLCanvasElement {
  const { c, ctx } = canvas(384, 192);
  ctx.fillStyle = '#fbf7ee';
  ctx.fillRect(0, 0, 384, 192);
  ctx.strokeStyle = '#d0201a';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 368, 176);
  // A broken wine glass.
  ctx.fillStyle = '#d0201a';
  ctx.beginPath();
  ctx.moveTo(30, 40);
  ctx.lineTo(86, 40);
  ctx.quadraticCurveTo(86, 96, 62, 104);
  ctx.lineTo(62, 140);
  ctx.lineTo(80, 150);
  ctx.lineTo(36, 150);
  ctx.lineTo(54, 140);
  ctx.lineTo(54, 104);
  ctx.quadraticCurveTo(30, 96, 30, 40);
  ctx.fill();
  ctx.strokeStyle = '#fbf7ee';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(58, 40);
  ctx.lineTo(50, 60);
  ctx.lineTo(64, 70);
  ctx.lineTo(54, 92);
  ctx.stroke();
  ctx.fillStyle = '#d0201a';
  ctx.textAlign = 'left';
  ctx.font = '500 72px "Barlow Condensed", "Arial Narrow", sans-serif';
  ctx.fillText('FRAGILE', 108, 104);
  ctx.font = '500 17px "IBM Plex Mono", monospace';
  ctx.fillText('HANDLE WITH CARE', 112, 140);
  weather(ctx, null, 384, 192, age, hashString(`${s.id}|paper`));
  return c;
}

function heavy(s: StickerArt, age: number): HTMLCanvasElement {
  const { c, ctx } = canvas(320, 160);
  ctx.fillStyle = '#f5c400';
  ctx.fillRect(0, 0, 320, 160);
  // Hazard stripes along the top and bottom.
  ctx.fillStyle = '#16130f';
  for (const y of [0, 136]) {
    for (let x = -24; x < 340; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, y + 24);
      ctx.lineTo(x + 16, y);
      ctx.lineTo(x + 32, y);
      ctx.lineTo(x + 16, y + 24);
      ctx.fill();
    }
  }
  ctx.textAlign = 'center';
  ctx.font = '500 70px "Barlow Condensed", "Arial Narrow", sans-serif';
  ctx.fillText('HEAVY', 160, 98);
  ctx.font = '500 14px "IBM Plex Mono", monospace';
  ctx.fillText('LIFT WITH TWO HANDS', 160, 122);
  weather(ctx, null, 320, 160, age, hashString(`${s.id}|paper`));
  return c;
}

function security(s: StickerArt, age: number): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 256);
  const disc = new Path2D();
  disc.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fillStyle = '#1f7a4d';
  ctx.fill(disc);
  ctx.strokeStyle = '#eaf6ee';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(128, 128, 104, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#eaf6ee';
  ctx.textAlign = 'center';
  ctx.font = '500 46px "Barlow Condensed", "Arial Narrow", sans-serif';
  ctx.fillText('SCREENED', 128, 112);
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(96, 150);
  ctx.lineTo(118, 172);
  ctx.lineTo(162, 128);
  ctx.stroke();
  ctx.font = '500 15px "IBM Plex Mono", monospace';
  ctx.fillText(s.fromCode, 128, 208);
  weather(ctx, disc, 256, 256, age, hashString(`${s.id}|paper`));
  return c;
}

function transfer(s: StickerArt, age: number): HTMLCanvasElement {
  const { c, ctx } = canvas(384, 160);
  ctx.fillStyle = '#e8741c';
  ctx.fillRect(0, 0, 384, 160);
  ctx.fillStyle = '#fff6ea';
  ctx.textAlign = 'left';
  ctx.font = '500 70px "Barlow Condensed", "Arial Narrow", sans-serif';
  ctx.fillText('TRANSFER', 24, 96);
  ctx.font = '500 18px "IBM Plex Mono", monospace';
  ctx.fillText(`${s.fromCode} → ${s.code}`, 26, 132);
  // An arrow running off the right edge.
  ctx.beginPath();
  ctx.moveTo(300, 108);
  ctx.lineTo(352, 108);
  ctx.lineTo(352, 96);
  ctx.lineTo(376, 118);
  ctx.lineTo(352, 140);
  ctx.lineTo(352, 128);
  ctx.lineTo(300, 128);
  ctx.closePath();
  ctx.fill();
  weather(ctx, null, 384, 160, age, hashString(`${s.id}|paper`));
  return c;
}

// --- Public --------------------------------------------------------------------------------------

/** A sticker's artwork, and its width as a share of a sticker spot (its height follows the picture). */
export function stickerArtwork(s: StickerArt, age = 0): { canvas: HTMLCanvasElement; scale: number } {
  switch (s.kind) {
    case 'priority':
      return { canvas: priority(s, age), scale: 0.7 };
    case 'fragile':
      return { canvas: fragile(s, age), scale: 0.76 };
    case 'heavy':
      return { canvas: heavy(s, age), scale: 0.62 };
    case 'security':
      return { canvas: security(s, age), scale: 0.5 };
    case 'transfer':
      return { canvas: transfer(s, age), scale: 0.7 };
    default:
      // A round label only fills the spot's height, so it's printed a little larger to hold its own.
      return { canvas: travelLabel(s, age), scale: lookFor(s.countryCode).shape === 'circle' ? 1.18 : 1 };
  }
}

/** The fonts printed on stickers; draw only once they're in. */
export function stickerFonts(): Promise<unknown> {
  return Promise.all([
    document.fonts.load('500 40px "Barlow Condensed"'),
    document.fonts.load('500 20px "IBM Plex Mono"'),
  ]).catch(() => undefined);
}

/** Every country with its own label look (for tests and the docs). */
export const LABEL_COUNTRIES = Object.keys(LOOKS);
