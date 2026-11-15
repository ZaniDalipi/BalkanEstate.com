import QRCode from 'qrcode';
import { initials, type ShareCardContent } from './shareCardData';

/** 4:5 portrait: the size Instagram, Facebook and LinkedIn show uncropped in the feed. */
export const CARD_W = 1080;
export const CARD_H = 1350;
const FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const INK = '#1A202C';
const MUTED = '#718096';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // Without CORS the photo would taint the canvas and the card could not be
    // saved; with it, a server that refuses simply falls back to initials.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Largest font size (down to `min`) at which `text` fits `maxW`; ellipsis past that. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, min: number, weight: number): string {
  for (let s = size; s >= min; s -= 2) {
    ctx.font = `${weight} ${s}px ${FONT}`;
    if (ctx.measureText(text).width <= maxW) return text;
  }
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxW) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

function drawLanyard(ctx: CanvasRenderingContext2D, tone: string) {
  const x = CARD_W / 2;
  ctx.fillStyle = tone;
  ctx.fillRect(x - 22, 0, 44, 150);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  for (const dx of [-15, 15]) {
    ctx.beginPath(); ctx.moveTo(x + dx, 0); ctx.lineTo(x + dx, 150); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = '#A0AEC0'; // metal clip
  roundRect(ctx, x - 50, 140, 100, 44, 10); ctx.fill();
  ctx.fillStyle = '#E2E8F0';
  roundRect(ctx, x - 36, 150, 72, 14, 7); ctx.fill();
}

function drawBand(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, tone: string) {
  ctx.save();
  roundRect(ctx, x, y, w, 260, 40); ctx.clip();
  ctx.fillStyle = tone; ctx.fillRect(x, y, w, 260);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 10;
  for (let i = -300; i < w + 300; i += 36) { ctx.beginPath(); ctx.moveTo(x + i, y + 260); ctx.lineTo(x + i + 260, y); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = '#F2F2F7'; // slot punched for the clip
  roundRect(ctx, CARD_W / 2 - 70, y + 30, 140, 26, 13); ctx.fill();
}

async function drawPortrait(ctx: CanvasRenderingContext2D, c: ShareCardContent, cy: number) {
  const r = 140;
  const cx = CARD_W / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(15,23,42,0.25)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r + 12, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  const img = c.imageUrl ? await loadImage(c.imageUrl) : null;
  if (img) {
    const s = Math.max((r * 2) / img.width, (r * 2) / img.height);
    ctx.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
  } else {
    ctx.fillStyle = c.tone; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = '#fff'; ctx.font = `700 110px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(initials(c.name), cx, cy + 6);
  }
  ctx.restore();
}

/** Draws the share card and returns it as a PNG. Runs in the browser (canvas + QR code, no server). */
export async function drawShareCard(c: ShareCardContent): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W; canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  await document.fonts?.ready;

  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
  bg.addColorStop(0, '#EEF2FF'); bg.addColorStop(1, '#F2F2F7');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, CARD_W, CARD_H);

  const x = 110; const y = 170; const w = CARD_W - 220; const h = 1060;
  ctx.save();
  ctx.shadowColor = 'rgba(15,23,42,0.18)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
  ctx.fillStyle = '#fff'; roundRect(ctx, x, y, w, h, 40); ctx.fill();
  ctx.restore();
  drawBand(ctx, x, y, w, c.tone);
  drawLanyard(ctx, c.tone);
  await drawPortrait(ctx, c, y + 260);

  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = INK;
  ctx.fillText(fitText(ctx, c.name, w - 120, 68, 40, 800), CARD_W / 2, y + 500);
  ctx.fillStyle = c.tone;
  ctx.fillText(fitText(ctx, c.role, w - 120, 40, 28, 600), CARD_W / 2, y + 560);
  ctx.fillStyle = MUTED;
  ctx.fillText(fitText(ctx, c.place.toUpperCase(), w - 120, 28, 22, 600), CARD_W / 2, y + 608);

  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, c.url, { width: 300, margin: 1, errorCorrectionLevel: 'M', color: { dark: INK, light: '#ffffff' } });
  ctx.strokeStyle = '#E2E8F0'; ctx.setLineDash([10, 10]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + 60, y + 650); ctx.lineTo(x + w - 60, y + 650); ctx.stroke(); ctx.setLineDash([]);
  ctx.drawImage(qr, CARD_W / 2 - 150, y + 680, 300, 300);
  ctx.fillStyle = MUTED; ctx.font = `600 28px ${FONT}`;
  ctx.fillText(c.scanLabel, CARD_W / 2, y + 1025);

  ctx.fillStyle = INK; ctx.font = `800 34px ${FONT}`;
  ctx.fillText(c.site, CARD_W / 2, CARD_H - 50);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the image'))), 'image/png');
  });
}
