// Soft "clay" icons for use inside pages, drawn to sit beside the 3D sidebar
// pictures: chunky rounded shapes, a top-lit blue/white gradient, and a darker
// copy offset underneath for thickness. 64×64 grid, shown at 20–40px.

import { LOGO_DEFS } from './iso.mjs';

const TONES = {
  blue: { hi: '#7DBBFF', lo: '#2F7BEF', dk: '#1A56C0' },
  white: { hi: '#FFFFFF', lo: '#E9EEF6', dk: '#BCC9DD' },
  gold: { hi: '#FFDB70', lo: '#F8A91E', dk: '#C98000' },
  red: { hi: '#FF9A9A', lo: '#EF4B4B', dk: '#B42323' },
  warm: { hi: '#FFF6D8', lo: '#FFCF73', dk: '#E0A646' },
  grey: { hi: '#E4E8EF', lo: '#A9B3C3', dk: '#7D889A' },
  sky: { hi: '#E4F2FF', lo: '#B5D8FA', dk: '#86B6E6' },
  green: { hi: '#9BE07A', lo: '#4FAE45', dk: '#2F7D2C' },
  wood: { hi: '#E7C49A', lo: '#C08A57', dk: '#8E6238' },
};

const gradDefs = Object.entries(TONES)
  .map(([k, t]) => `<linearGradient id="g-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.hi}"/><stop offset="1" stop-color="${t.lo}"/></linearGradient>`)
  .join('');

/** A filled shape with thickness. `stroke` rounds its corners. */
function blob(d, tone, { stroke = 3, depth = 2.6, fill = true } = {}) {
  const t = TONES[tone];
  const common = `stroke-linejoin="round" stroke-linecap="round" stroke-width="${stroke}"`;
  // Light shapes get a faint rim so they still read on white.
  const rim = tone === 'white' || tone === 'sky'
    ? `<path d="${d}" fill="none" stroke="#C3D1E6" stroke-linejoin="round" stroke-linecap="round" stroke-width="${stroke + 1.6}"/>`
    : '';
  return `<path d="${d}" transform="translate(0 ${depth})" fill="${fill ? t.dk : 'none'}" stroke="${t.dk}" ${common}/>` + rim +
    `<path d="${d}" fill="${fill ? `url(#g-${tone})` : 'none'}" stroke="url(#g-${tone})" ${common}/>`;
}

/** A thick rounded line (handle, ring, rail) with thickness. */
function tube(d, tone, width, depth = 2.6) {
  const t = TONES[tone];
  return `<path d="${d}" transform="translate(0 ${depth})" fill="none" stroke="${t.dk}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="url(#g-${tone})" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

const ring = (cx, cy, r) => `M${cx} ${cy - r}a${r} ${r} 0 1 1 0 ${2 * r}a${r} ${r} 0 1 1 0-${2 * r}`;
const disc = (cx, cy, r, tone, o) => blob(ring(cx, cy, r), tone, o);
const gloss = (d) => `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-opacity=".55" stroke-width="2.2" stroke-linecap="round"/>`;
const logo = (x, y, h, id = 'logo') => `<use href="#${id}" x="${x}" y="${y}" width="${(h * 0.884).toFixed(2)}" height="${h}"/>`;
const line = (d, color = '#FFFFFF', w = 3) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const magnifier = (inner = '') =>
  tube('M41 41 53 53', 'blue', 9) +
  `<circle cx="27" cy="27" r="13" fill="url(#g-sky)"/>` + inner +
  tube(ring(27, 27, 13), 'blue', 7) +
  gloss('M18 21a11 11 0 0 1 6-5');

export const SOFT = {
  // ── people & account ────────────────────────────────────────────────
  search: () => magnifier(logo(22.6, 21, 11.4)),
  home: () =>
    blob('M42 12h8v14h-8z', 'white') +
    blob('M15 30 32 16 49 30V52H15Z', 'white') +
    tube('M9 32 32 12 55 32', 'blue', 9) +
    gloss('M14 29 32 13.5') +
    blob('M21 37h11v15H21z', 'blue') +
    blob('M38 38h7v7h-7z', 'warm', { stroke: 2.4 }) +
    logo(26.6, 21.6, 11.4),
  user: () =>
    disc(32, 32, 24, 'blue') +
    `<circle cx="32" cy="32" r="18.5" fill="url(#g-white)"/>` +
    blob('M19 47c1-8 6-12 13-12s12 4 13 12a18 18 0 0 1-26 0Z', 'blue', { stroke: 2, depth: 1.4 }) +
    disc(32, 25, 7, 'white', { stroke: 2, depth: 1.4 }) +
    gloss('M15 22a18 18 0 0 1 8-9'),
  building: () =>
    blob('M14 16h36v38H14z', 'white') +
    blob('M12 11h40v6H12z', 'blue', { stroke: 2 }) +
    [21, 30, 39].map((y) => [19, 28.5, 38].map((x) => `<rect x="${x}" y="${y}" width="7" height="6" rx="1.6" fill="url(#g-sky)"/>`).join('')).join('') +
    blob('M27 46h10v8H27z', 'blue', { stroke: 2, depth: 1.4 }),
  store: () =>
    blob('M12 26h40v28H12z', 'white') +
    blob('M10 14h44l-3 12H13Z', 'blue') +
    '<path d="M10 26a5.5 5.5 0 0 0 11 0a5.5 5.5 0 0 0 11 0a5.5 5.5 0 0 0 11 0a5.5 5.5 0 0 0 11 0Z" fill="url(#g-blue)"/>' +
    '<path d="M21 26a5.5 5.5 0 0 0 11 0Z M43 26a5.5 5.5 0 0 0 11 0Z" fill="#FFFFFF" opacity=".9"/>' +
    blob('M18 37h12v9H18z', 'sky', { stroke: 2, depth: 1.2 }) +
    blob('M36 37h10v17H36z', 'blue', { stroke: 2, depth: 1.2 }),
  landmark: () =>
    blob('M8 24 32 10 56 24Z', 'blue') +
    [14, 24, 35, 45].map((x) => blob(`M${x} 28h5v18h-5z`, 'white', { stroke: 2, depth: 1.4 })).join('') +
    blob('M10 48h44v6H10z', 'blue', { stroke: 2 }) +
    logo(28.2, 15, 7.6, 'logo-white'),
  bell: () =>
    blob('M32 9c-10 0-15 8-15 17v9l-5 8h40l-5-8v-9c0-9-5-17-15-17Z', 'blue') +
    disc(32, 49, 5, 'gold', { stroke: 2, depth: 1.4 }) +
    gloss('M21 24c0-6 3-10 8-11') +
    disc(48, 14, 6, 'red', { stroke: 2, depth: 1.2 }),
  calendar: () =>
    blob('M10 14h44v40H10z', 'white') +
    blob('M10 14h44v11H10z', 'blue', { stroke: 3, depth: 1.6 }) +
    tube('M21 9v9M43 9v9', 'grey', 4.4, 1.4) +
    [31, 39, 47].map((y, r) => [15, 25, 35, 45].map((x, c) => `<rect x="${x}" y="${y}" width="6" height="5" rx="1.6" fill="${r === 1 && c === 2 ? 'url(#g-blue)' : 'url(#g-sky)'}"/>`).join('')).join(''),
  chart: () =>
    blob('M10 54h44', 'grey', { stroke: 4, depth: 1.4, fill: false }) +
    blob('M13 36h9v15h-9z', 'sky') +
    blob('M27.5 26h9v25h-9z', 'blue') +
    blob('M42 14h9v37h-9z', 'blue') +
    tube('M12 30 26 20 36 24 52 9', 'gold', 3.6, 1.4) +
    gloss('M45 18v12'),
  globe: () =>
    disc(32, 32, 22, 'blue') +
    '<path d="M18 22c6 1 8 6 6 10s2 8 0 12M38 12c-2 6 4 8 8 10s4 8 0 10M30 52c2-4 8-4 10-8" fill="none" stroke="#9BE07A" stroke-width="5" stroke-linecap="round"/>' +
    `<ellipse cx="32" cy="32" rx="9" ry="22" fill="none" stroke="#FFFFFF" stroke-opacity=".6" stroke-width="1.6"/>` +
    line('M10 32h44', 'rgba(255,255,255,.6)', 1.6) +
    gloss('M16 21a18 18 0 0 1 9-8'),
  docCheck: () =>
    blob('M14 8h26l10 10v38H14z', 'white') +
    blob('M40 8v10h10Z', 'sky', { stroke: 2, depth: 1 }) +
    line('M20 24h18M20 31h22M20 38h14', '#9DBBE0', 3) +
    disc(44, 46, 10, 'blue', { stroke: 2, depth: 2 }) +
    line('M39 46l4 4 7-8', '#FFFFFF', 3.4),
  card: () =>
    blob('M6 16h52v34H6z', 'blue') +
    blob('M6 22h52v7H6z', 'grey', { stroke: 1, depth: 0 }) +
    blob('M12 36h10v8H12z', 'gold', { stroke: 2, depth: 1 }) +
    line('M28 41h16', 'rgba(255,255,255,.75)', 3) +
    logo(46, 34, 10, 'logo-white') +
    gloss('M11 19h20'),
  pin: () =>
    blob('M32 56C20 42 14 34 14 25a18 18 0 0 1 36 0c0 9-6 17-18 31Z', 'blue') +
    `<circle cx="32" cy="25" r="9" fill="#FFFFFF"/>` +
    logo(28.2, 20, 10) +
    gloss('M19 19a14 14 0 0 1 7-6'),
  shield: () =>
    blob('M32 7 52 14v15c0 13-9 21-20 26C21 50 12 42 12 29V14Z', 'blue') +
    gloss('M17 17 30 12') +
    line('M22 31l7 7 13-14', '#FFFFFF', 5.4),
  gear: () => {
    const teeth = Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      const x = 32 + Math.cos(a) * 20, y = 32 + Math.sin(a) * 20;
      return `M${(x - 4).toFixed(1)} ${(y - 4).toFixed(1)}h8v8h-8z`;
    }).join('');
    return blob(teeth, 'grey', { stroke: 4 }) + disc(32, 32, 17, 'grey') + disc(32, 32, 7, 'blue', { stroke: 2, depth: 1.4 }) + gloss('M20 24a13 13 0 0 1 6-6');
  },
  sparkles: () =>
    blob('M28 8l5 13 13 5-13 5-5 13-5-13-13-5 13-5Z', 'blue') +
    blob('M48 34l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z', 'gold', { stroke: 2, depth: 1.6 }) +
    blob('M14 42l2 4 4 2-4 2-2 4-2-4-4-2 4-2Z', 'sky', { stroke: 1.6, depth: 1.2 }),
  key: () =>
    tube('M31 33 52 54M44 46l5-5M49 51l4-4', 'gold', 7) +
    tube(ring(22, 22, 13), 'blue', 8) +
    `<circle cx="22" cy="22" r="7.5" fill="#FFFFFF"/>` +
    logo(18.6, 17.6, 8.6),
  cash: () =>
    blob('M8 22h40v26H8z', 'green') +
    blob('M14 16h40v26H14z', 'green') +
    disc(34, 29, 7, 'white', { stroke: 1.6, depth: 1 }) +
    line('M34 25v8', '#4FAE45', 2.6) +
    disc(48, 48, 9, 'gold', { stroke: 2, depth: 2 }) +
    line('M45 48h6M48 45v6', '#FFFFFF', 2.4),
  info: () =>
    disc(32, 31, 23, 'blue') +
    gloss('M17 22a17 17 0 0 1 9-9') +
    `<circle cx="32" cy="19" r="3.6" fill="#FFFFFF"/>` +
    line('M32 27v15', '#FFFFFF', 6),
  star: () =>
    blob('M32 7l7.6 15.4 17 2.5-12.3 12 2.9 16.9L32 46l-15.2 7.8 2.9-16.9-12.3-12 17-2.5Z', 'gold') +
    gloss('M24 24 30 13'),

  // ── map & measuring ─────────────────────────────────────────────────
  thermometer: () =>
    tube('M32 10v28', 'white', 12) +
    disc(32, 45, 10, 'red') +
    tube('M32 18v24', 'red', 5, 0.8) +
    line('M40 16h5M40 23h5M40 30h5', '#9DBBE0', 2.6),
  area: () =>
    blob('M10 54V10l44 44Z', 'blue') +
    blob('M18 46V30l16 16Z', 'white', { stroke: 2, depth: 1.4 }) +
    line('M14 18h4M14 26h4M14 34h4M14 42h4', '#FFFFFF', 2),
  ruler: () =>
    blob('M6 40 40 6l18 18-34 34Z', 'gold') +
    line('M16 38l5 5M22 32l3 3M28 26l5 5M34 20l3 3M40 14l5 5', '#8E6238', 2.4) +
    gloss('M12 38 38 12'),
  pencil: () =>
    tube('M16 48 44 20', 'blue', 11) +
    tube('M44 20 49 15', 'grey', 11) +
    blob('M10 54l3-11 8 8Z', 'warm', { stroke: 2, depth: 1.2 }) +
    '<path d="M10 54l1.4-5 3.6 3.6Z" fill="#2C3446"/>',

  // ── listing features ────────────────────────────────────────────────
  pool: () =>
    blob('M6 30h52v24H6z', 'white') +
    blob('M11 34h42v16H11z', 'blue', { stroke: 2, depth: 1 }) +
    line('M14 40q4-3 8 0t8 0t8 0t8 0', '#BEE4FD', 2.4) +
    tube('M44 34V14q0-5 5-5M52 34V14q0-5 5-5', 'grey', 3.4, 1),
  leaf: () =>
    blob('M12 52C10 30 24 12 54 10c0 28-16 44-42 42Z', 'green') +
    line('M14 50C24 38 34 28 46 18', '#DDF5CF', 3) +
    gloss('M22 30c4-8 12-13 22-15'),
  spa: () =>
    blob('M8 40h48c0 8-8 14-24 14S8 48 8 40Z', 'white') +
    blob('M32 10c8 10 12 16 12 21a12 12 0 0 1-24 0c0-5 4-11 12-21Z', 'blue') +
    gloss('M26 26c0-3 2-6 4-9'),
  wine: () =>
    blob('M18 8h28c0 18-6 26-14 26S18 26 18 8Z', 'red') +
    blob('M20 12h24', 'white', { stroke: 2, depth: 0, fill: false }) +
    tube('M32 34v16', 'white', 4, 1.2) +
    blob('M20 52h24v4H20z', 'white', { stroke: 2, depth: 1 }),
  mountain: () =>
    blob('M4 54 24 18 34 32 42 22 60 54Z', 'blue') +
    blob('M24 18 30 29 26 27 22 31 19 27Z', 'white', { stroke: 2, depth: 0.8 }) +
    blob('M42 22 47 31 43 29 40 32 38 28Z', 'white', { stroke: 2, depth: 0.8 }) +
    disc(52, 12, 6, 'gold', { stroke: 2, depth: 1 }),
  kitchen: () =>
    blob('M8 28h36v14c0 8-6 12-18 12S8 50 8 42Z', 'blue') +
    tube('M44 32h14', 'grey', 6) +
    line('M18 22q-3-5 0-10M26 22q-3-5 0-10M34 22q-3-5 0-10', '#AEB7C5', 2.6) +
    gloss('M12 32h10'),
  bath: () =>
    blob('M6 30h52v6c0 10-8 16-26 16S6 46 6 36Z', 'white') +
    tube('M14 52l-3 5M50 52l3 5', 'grey', 3.4, 0.8) +
    tube('M12 30V16q0-7 7-7q6 0 6 6', 'grey', 3.6, 1) +
    blob('M40 22h10v12H40z', 'blue', { stroke: 2, depth: 1.2 }),
  car: () =>
    blob('M6 38c0-6 4-8 8-9l6-11c1-2 3-3 5-3h14c2 0 4 1 5 3l6 11c4 1 8 3 8 9v8H6Z', 'blue') +
    blob('M22 18h20l5 11H17Z', 'sky', { stroke: 2, depth: 0.8 }) +
    disc(18, 47, 6, 'grey', { stroke: 2, depth: 1.4 }) +
    disc(46, 47, 6, 'grey', { stroke: 2, depth: 1.4 }) +
    `<rect x="26" y="36" width="12" height="5" rx="1.6" fill="#FFFFFF"/>` +
    logo(30, 35.8, 5.4),
  sea: () =>
    blob('M4 34q7-7 14 0t14 0t14 0t14 0V56H4Z', 'blue') +
    line('M8 46q6-5 12 0t12 0t12 0t12 0', '#BEE4FD', 2.6) +
    disc(46, 16, 8, 'gold', { stroke: 2, depth: 1.2 }),
  tree: () =>
    tube('M32 40v16', 'wood', 6, 1) +
    blob('M32 6 50 30H40l10 12H14l10-12H14Z', 'green'),
  city: () =>
    blob('M8 30h14v26H8z', 'sky') +
    blob('M24 12h16v44H24z', 'blue') +
    blob('M42 24h14v32H42z', 'white') +
    [18, 26, 34, 42].map((y) => `<rect x="28" y="${y}" width="8" height="4" rx="1" fill="rgba(255,255,255,.6)"/>`).join('') +
    logo(28.6, 2, 9),
  flower: () =>
    tube('M32 34v20', 'green', 4, 1) +
    blob('M32 40c6-8 14-6 16-2-6 4-12 4-16 2Z', 'green', { stroke: 2, depth: 1 }) +
    [0, 72, 144, 216, 288].map((a) => {
      const r = (a * Math.PI) / 180, x = 32 + Math.cos(r) * 10, y = 22 + Math.sin(r) * 10;
      return disc(+x.toFixed(1), +y.toFixed(1), 7, 'red', { stroke: 1.6, depth: 1.2 });
    }).join('') + disc(32, 22, 6, 'gold', { stroke: 1.6, depth: 1 }),
  houses: () =>
    blob('M6 34 20 22 34 34V54H6Z', 'white') +
    tube('M4 35 20 21 36 35', 'blue', 6) +
    blob('M30 30 44 18 58 30V54H30Z', 'white') +
    tube('M28 31 44 16 60 31', 'blue', 7) +
    blob('M40 42h8v12h-8z', 'blue', { stroke: 2, depth: 1 }) +
    logo(40.4, 24.6, 9),
  crane: () =>
    tube('M18 56V10', 'gold', 6) +
    tube('M10 12h44', 'gold', 5) +
    tube('M44 12v18', 'grey', 2, 0.6) +
    blob('M38 30h12v10H38z', 'blue', { stroke: 2, depth: 1.4 }) +
    blob('M8 12h8v8H8z', 'grey', { stroke: 2, depth: 1.2 }) +
    blob('M10 52h16v4H10z', 'grey', { stroke: 2, depth: 1 }),
};

export function renderSoft(name) {
  const body = SOFT[name]();
  const defs = `<defs>${gradDefs}${body.includes('#logo') ? LOGO_DEFS : ''}</defs>`;
  return { defs, body };
}
