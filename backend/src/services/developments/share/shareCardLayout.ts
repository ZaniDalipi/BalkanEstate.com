/**
 * The share card's drawing, as an SVG laid over the residence photo: every
 * building outlined where it stands in the picture with a label ("Plaza Tower
 * · 36 available"), the brand top-left and the residence name, place and
 * availability in a band along the bottom. Pure, so the layout is testable
 * without images; the photo itself is cropped by sharp to the same frame.
 */
import { fill, formatEuro, type ShareCardWords } from './shareCardText';

export const CARD_W = 1200;
export const CARD_H = 630;
const FONT = "DejaVu Sans, Arial, Helvetica, sans-serif";
const TEAL = '#14b8a6';
const MAX_LABELS = 6;

type Pt = [number, number];

export interface CardRegion {
  shape: 'polygon' | 'rect';
  /** Normalised 0–1 points on the source photo. */
  points: number[][];
  label: string;
  available: number;
  units: number;
}

export interface CardInput {
  /** Source photo size; absent when there is no photo (plain branded card). */
  photo?: { width: number; height: number };
  regions: CardRegion[];
  name: string;
  place: string;
  stats: { total: number; available: number; priceMin: number | null };
  words: ShareCardWords;
}

export const escapeXml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] as string);

/** Cut to `max` characters with an ellipsis. */
export const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

/**
 * Rough rendered width of `text` at `size` px in DejaVu Sans: Cyrillic and
 * Greek letters run wider than Latin ones, spaces and digits narrower.
 */
export const textWidth = (text: string, size: number, bold = false): number =>
  [...text].reduce((w, c) => w + (c === ' ' ? 0.32 : /[0-9.,·]/.test(c) ? 0.6 : c.charCodeAt(0) > 0x24f ? 0.68 : 0.6), 0) *
  size *
  (bold ? 1.04 : 0.94);

/** How a photo of w×h is scaled and cropped (centred) to fill the card: same maths as sharp's `cover`. */
export function coverTransform(w: number, h: number) {
  const scale = Math.max(CARD_W / w, CARD_H / h);
  return { scale, dx: (w * scale - CARD_W) / 2, dy: (h * scale - CARD_H) / 2 };
}

const toPolygon = (r: CardRegion): Pt[] => {
  const pts = r.points.map(([x, y]) => [x, y] as Pt);
  if (r.shape !== 'rect' || pts.length < 2) return pts;
  const [[x0, y0], [x1, y1]] = pts;
  const [a, b, c, d] = [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)];
  return [[a, b], [c, b], [c, d], [a, d]];
};

/** The region's outline in card pixels. */
export function projectRegion(r: CardRegion, photo: { width: number; height: number }): Pt[] {
  const { scale, dx, dy } = coverTransform(photo.width, photo.height);
  return toPolygon(r).map(([x, y]) => [x * photo.width * scale - dx, y * photo.height * scale - dy]);
}

const area = (pts: Pt[]) => Math.abs(pts.reduce((s, [x1, y1], i) => {
  const [x2, y2] = pts[(i + 1) % pts.length];
  return s + x1 * y2 - x2 * y1;
}, 0)) / 2;

interface Box { x: number; y: number; w: number; h: number }
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w + 6 && b.x < a.x + a.w + 6 && a.y < b.y + b.h + 6 && b.y < a.y + a.h + 6;

/** Where each building's label goes: above its outline, inside the frame, not on top of another label. */
export function placeLabels(shapes: Array<{ pts: Pt[]; title: string; sub: string }>): Array<Box & { title: string; sub: string }> {
  const placed: Array<Box & { title: string; sub: string }> = [];
  const reserved: Box[] = [{ x: 0, y: 0, w: 300, h: 96 }, { x: 0, y: 400, w: CARD_W, h: CARD_H - 400 }];
  const ordered = [...shapes].sort((a, b) => area(b.pts) - area(a.pts)).slice(0, MAX_LABELS);
  for (const s of ordered) {
    const xs = s.pts.map((p) => p[0]);
    const ys = s.pts.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const top = Math.min(...ys);
    const w = Math.max(textWidth(s.title, 22, true), textWidth(s.sub, 17)) + 32;
    const h = 60;
    const x = Math.min(Math.max(cx - w / 2, 16), CARD_W - w - 16);
    const candidates = [top - h - 10, top + 12, top + h + 24, top + 2 * h + 36];
    const spot = candidates
      .map((y) => ({ x, y: Math.min(Math.max(y, 16), CARD_H - h - 16), w, h }))
      .find((b) => ![...reserved, ...placed].some((o) => overlaps(o, b)));
    if (spot) placed.push({ ...spot, title: s.title, sub: s.sub });
  }
  return placed;
}

/** Whether any part of the outline's bounding box is on the card (a tall tower can have every corner off it). */
const onCard = (pts: Pt[]) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return Math.max(...xs) > 0 && Math.min(...xs) < CARD_W && Math.max(...ys) > 0 && Math.min(...ys) < CARD_H;
};

const polygonSvg = (pts: Pt[], open: boolean) => {
  const d = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const colour = open ? TEAL : '#94a3b8';
  return `<polygon points="${d}" fill="${colour}" fill-opacity="0.32" stroke="#ffffff" stroke-width="6" stroke-linejoin="round"/>`
    + `<polygon points="${d}" fill="none" stroke="${colour}" stroke-width="3" stroke-linejoin="round"/>`;
};

const labelSvg = (b: Box & { title: string; sub: string }) =>
  `<g><rect x="${b.x.toFixed(1)}" y="${b.y.toFixed(1)}" width="${b.w.toFixed(1)}" height="${b.h}" rx="14" fill="#0f172a" fill-opacity="0.86"/>`
  + `<text x="${(b.x + 16).toFixed(1)}" y="${(b.y + 26).toFixed(1)}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff">${escapeXml(b.title)}</text>`
  + `<text x="${(b.x + 16).toFixed(1)}" y="${(b.y + 49).toFixed(1)}" font-family="${FONT}" font-size="17" fill="#5eead4">${escapeXml(b.sub)}</text></g>`;

const chipSvg = (x: number, y: number, text: string, dark: boolean) => {
  const w = textWidth(text, 22, true) + 36;
  return {
    w,
    svg: `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="44" rx="22" fill="${dark ? TEAL : '#ffffff'}"/>`
      + `<text x="${(x + 18).toFixed(1)}" y="${y + 29}" font-family="${FONT}" font-size="22" font-weight="700" fill="${dark ? '#ffffff' : '#0f172a'}">${escapeXml(text)}</text>`,
  };
};

/** The SVG overlay for a 1200×630 card. */
export function buildShareCardSvg(input: CardInput): string {
  const { words, stats } = input;
  const shapes = input.photo
    ? input.regions
        .map((r) => ({ r, pts: projectRegion(r, input.photo!) }))
        .filter(({ pts }) => pts.length >= 3 && onCard(pts))
    : [];
  const labels = placeLabels(
    shapes.map(({ r, pts }) => ({
      pts,
      title: clip(r.label, 22),
      sub: r.available > 0 ? fill(words.buildingAvailable, { n: r.available }) : words.soldOut,
    }))
  );

  const chips: string[] = [];
  let chipX = 56;
  for (const [text, dark] of [
    [stats.total > 0 ? fill(words.available, { a: stats.available, t: stats.total }) : '', true],
    [stats.priceMin ? fill(words.from, { p: formatEuro(stats.priceMin) }) : '', false],
  ] as Array<[string, boolean]>) {
    if (!text) continue;
    const chip = chipSvg(chipX, 448, text, dark);
    if (chipX + chip.w > CARD_W - 56) break;
    chips.push(chip.svg);
    chipX += chip.w + 12;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020617" stop-opacity="0"/><stop offset="1" stop-color="#020617" stop-opacity="0.9"/></linearGradient></defs>
${input.photo ? '' : `<rect width="${CARD_W}" height="${CARD_H}" fill="#0f172a"/><circle cx="1010" cy="140" r="260" fill="${TEAL}" fill-opacity="0.18"/>`}
${shapes.map(({ r, pts }) => polygonSvg(pts, r.available > 0)).join('\n')}
<rect x="0" y="330" width="${CARD_W}" height="${CARD_H - 330}" fill="url(#fade)"/>
${labels.map(labelSvg).join('\n')}
<rect x="32" y="32" width="236" height="52" rx="26" fill="#ffffff"/><circle cx="62" cy="58" r="10" fill="${TEAL}"/>
<text x="82" y="66" font-family="${FONT}" font-size="23" font-weight="700" fill="#0f172a">BalkanEstate</text>
${chips.join('\n')}
<text x="56" y="548" font-family="${FONT}" font-size="50" font-weight="700" fill="#ffffff">${escapeXml(clip(input.name, 34))}</text>
<text x="56" y="590" font-family="${FONT}" font-size="25" fill="#cbd5e1">${escapeXml(clip(input.place, 60))}</text>
</svg>`;
}
