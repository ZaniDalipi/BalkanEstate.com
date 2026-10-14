// Isometric spec illustrations: the scenes on the property details page.
//
// Every drawing is built from the same tiny engine (boxes, face rectangles and
// the BalkanEstate two-tower mark painted onto a face), so the whole set shares
// one light direction, one palette and one projection. Each scene hides the
// logo somewhere small.

const C = 0.866;
const SN = 0.5;

export const LOGO_DEFS = `
<symbol id="logo" viewBox="5.2 3.4 12.2 13.8"><g stroke-linejoin="round" stroke-width=".7">
<path d="M9.2 5.9 12.9 4 16.75 5.8 13 7.6Z" fill="#B9DEFB" stroke="#B9DEFB"/>
<path d="M9.2 5.9 13 7.6V16.6L9.2 14.9Z" fill="#6FA6DA" stroke="#6FA6DA"/>
<path d="M13 7.6 16.75 5.8V15.9L13 16.6Z" fill="#93C6F2" stroke="#93C6F2"/>
<path d="M5.9 9 8.5 8 11.3 9.3 8.7 10.3Z" fill="#B9DEFB" stroke="#B9DEFB"/>
<path d="M5.9 9 8.7 10.3V15.3L5.9 13.9Z" fill="#6FA6DA" stroke="#6FA6DA"/>
<path d="M8.7 10.3 11.3 9.3V14.75L8.7 15.3Z" fill="#93C6F2" stroke="#93C6F2"/>
</g></symbol>
<symbol id="logo-white" viewBox="5.2 3.4 12.2 13.8"><g stroke-linejoin="round" stroke-width=".7">
<path d="M9.2 5.9 12.9 4 16.75 5.8 13 7.6Z" fill="#FFFFFF" stroke="#FFFFFF"/>
<path d="M9.2 5.9 13 7.6V16.6L9.2 14.9Z" fill="#D6E7FB" stroke="#D6E7FB"/>
<path d="M13 7.6 16.75 5.8V15.9L13 16.6Z" fill="#F2F8FF" stroke="#F2F8FF"/>
<path d="M5.9 9 8.5 8 11.3 9.3 8.7 10.3Z" fill="#FFFFFF" stroke="#FFFFFF"/>
<path d="M5.9 9 8.7 10.3V15.3L5.9 13.9Z" fill="#D6E7FB" stroke="#D6E7FB"/>
<path d="M8.7 10.3 11.3 9.3V14.75L8.7 15.3Z" fill="#F2F8FF" stroke="#F2F8FF"/>
</g></symbol>`;

const f = (n) => Number(n.toFixed(2));

function scene(S = 10, ox = 140, oy = 60) {
  const out = [];
  const P = (x, y, z) => [f(ox + (x - y) * C * S), f(oy + (x + y) * SN * S - z * S)];
  const pts = (a) => a.map((p) => P(...p).join(',')).join(' ');
  const poly = (a, fill) => out.push(`<polygon points="${pts(a)}" fill="${fill}"/>`);
  const mat = (a, b, c, d, o) => `matrix(${[a, b, c, d, o[0], o[1]].map(f).join(' ')})`;
  const g = {
    P,
    poly,
    raw: (s) => out.push(s),
    box(x, y, z, w, d, h, c) {
      poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], c.r);
      poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], c.l);
      poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], c.t);
    },
    lrect: (yc, x1, x2, z1, z2, fill) => poly([[x1, yc, z1], [x2, yc, z1], [x2, yc, z2], [x1, yc, z2]], fill),
    rrect: (xc, y1, y2, z1, z2, fill) => poly([[xc, y1, z1], [xc, y2, z1], [xc, y2, z2], [xc, y1, z2]], fill),
    trect: (zc, x1, x2, y1, y2, fill) => poly([[x1, y1, zc], [x2, y1, zc], [x2, y2, zc], [x1, y2, zc]], fill),
    // Ellipse lying on a z = const plane (a disc seen in isometric).
    tdisc(zc, cx, cy, r, fill) {
      const o = P(cx, cy, zc);
      out.push(`<ellipse cx="${o[0]}" cy="${o[1]}" rx="${f(r * S * 1.2247)}" ry="${f(r * S * 0.7071)}" fill="${fill}"/>`);
    },
    cyl(cx, cy, z, r, h, c) {
      const b = P(cx, cy, z), t = P(cx, cy, z + h);
      const rx = f(r * S * 1.2247), ry = f(r * S * 0.7071);
      out.push(`<path d="M${b[0] - rx} ${b[1]} A${rx} ${ry} 0 0 0 ${b[0] + rx} ${b[1]} L${t[0] + rx} ${t[1]} L${t[0] - rx} ${t[1]}Z" fill="${c.l}"/>`);
      out.push(`<ellipse cx="${t[0]}" cy="${t[1]}" rx="${rx}" ry="${ry}" fill="${c.t}"/>`);
    },
    logoL(yc, x, ztop, size, id = 'logo') {
      const k = (S * size) / 12;
      out.push(`<use href="#${id}" width="12.2" height="13.8" transform="${mat(C * k, SN * k, 0, k, P(x, yc, ztop))}"/>`);
    },
    logoR(xc, y, ztop, size, id = 'logo') {
      const k = (S * size) / 12;
      out.push(`<use href="#${id}" width="12.2" height="13.8" transform="${mat(C * k, -SN * k, 0, k, P(xc, y, ztop))}"/>`);
    },
    logoT(zc, x, y, size, id = 'logo') {
      const k = (S * size) / 12;
      out.push(`<use href="#${id}" width="12.2" height="13.8" transform="${mat(C * k, SN * k, -C * k, SN * k, P(x, y, zc))}"/>`);
    },
    // Upright logo in screen space (flags, signs, badges).
    logoAt(x, y, size, id = 'logo') {
      out.push(`<use href="#${id}" x="${f(x)}" y="${f(y)}" width="${f(size * 0.884)}" height="${f(size)}"/>`);
    },
    tree(x, y, z, r) {
      const p = P(x, y, z);
      out.push(`<rect x="${p[0] - 1.6}" y="${f(p[1] - r * 1.2)}" width="3.2" height="${f(r * 1.2)}" fill="#8A6A4A"/>`);
      out.push(`<circle cx="${p[0]}" cy="${f(p[1] - r * 1.6)}" r="${r}" fill="#4E9A4A"/>`);
      out.push(`<circle cx="${f(p[0] - r * 0.35)}" cy="${f(p[1] - r * 1.85)}" r="${f(r * 0.55)}" fill="#6DB863"/>`);
    },
    shadow(x, y, z, rx) {
      const p = P(x, y, z);
      out.push(`<ellipse cx="${p[0]}" cy="${p[1]}" rx="${rx}" ry="${f(rx * 0.22)}" fill="#0E1726" opacity=".07"/>`);
    },
    body: () => out.join(''),
  };
  return g;
}

// Palette
const WALL = { t: '#FFFFFF', l: '#F4F6FA', r: '#DCE2EC' };
const SOFT = { t: '#EEF1F5', l: '#E1E6EE', r: '#C9D0DB' };
const BLUE = { t: '#3B82F6', l: '#0252CD', r: '#0141A6' };
const SKY = { t: '#BFD9F5', l: '#93BDEB', r: '#7AA6DA' };
const DARK = { t: '#3A4253', l: '#2A303D', r: '#232834' };
const WOOD = { t: '#D6B48C', l: '#BE9770', r: '#A57E58' };
const GRASS = { t: '#8CC66B', l: '#EEF1F5', r: '#D6DCE6' };
const STEEL = { t: '#C3CAD6', l: '#AEB7C5', r: '#98A2B2' };
const ROOF_F = '#3A4253';
const ROOF_B = '#2A303D';
const GLASS = '#BFD6F2';
const GLASS_D = '#9DBBE0';

function gable(g, x, y, z, w, d, rh, o, wallR = WALL.r) {
  g.poly([[x - o, y - o, z], [x + w + o, y - o, z], [x + w + o, y + d / 2, z + rh], [x - o, y + d / 2, z + rh]], ROOF_B);
  g.poly([[x - o, y + d + o, z], [x + w + o, y + d + o, z], [x + w + o, y + d / 2, z + rh], [x - o, y + d / 2, z + rh]], ROOF_F);
  g.poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d / 2, z + rh]], wallR);
}

export const ISO = {
  house(g) {
    g.box(-3, -3, -0.7, 19, 15, 0.7, GRASS);
    g.tree(-1.5, 9.5, 0, 9);
    const w = 12, d = 8, h = 7, rh = 4, o = 0.7;
    g.box(0, 0, 0, w, d, h, WALL);
    g.lrect(d, 1.5, 4.5, 1, 3.6, GLASS); g.lrect(d, 1.5, 4.5, 4.2, 6.2, GLASS);
    g.lrect(d, 6.6, 9.4, 0, h, '#0252CD');
    g.lrect(d, 7.3, 8.7, 0, 3.6, '#1C2433');
    g.lrect(d, 10.2, 11.4, 4.2, 6.2, GLASS);
    g.rrect(w, 2, 4, 1.2, 3.4, GLASS_D); g.rrect(w, 2, 4, 4.2, 6.2, GLASS_D); g.rrect(w, 5.2, 6.6, 4.2, 6.2, GLASS_D);
    g.poly([[-o, -o, h], [w + o, -o, h], [w + o, d / 2, h + rh], [-o, d / 2, h + rh]], ROOF_B);
    g.box(8.4, 1.4, 8, 1.4, 1.4, 4.4, { t: '#C9D1DD', l: '#EEF1F5', r: '#D3DAE4' });
    const top = g.P(9.1, 2.1, 12.4);
    g.raw(`<line x1="${top[0]}" y1="${top[1]}" x2="${top[0]}" y2="${top[1] - 40}" stroke="#5A6578" stroke-width="1.8"/>`);
    g.raw(`<path d="M${top[0]} ${top[1] - 40} h30 l-5 9 5 9 h-30z" fill="#FFFFFF" stroke="#0252CD" stroke-width="1.4"/>`);
    g.logoAt(top[0] + 4, top[1] - 38.5, 15);
    g.poly([[-o, d + o, h], [w + o, d + o, h], [w + o, d / 2, h + rh], [-o, d / 2, h + rh]], ROOF_F);
    g.poly([[w, 0, h], [w, d, h], [w, d / 2, h + rh]], WALL.r);
    g.tree(14, 1, 0, 8);
  },
  apartment(g) {
    g.box(-2, -2, -0.6, 14, 12, 0.6, { t: '#D7DCE3', l: '#EEF1F5', r: '#C9D0DA' });
    g.box(0, 0, 0, 8, 7, 16, WALL);
    for (let z = 1.5; z < 15; z += 3) {
      for (const x of [1, 3.5, 6]) g.lrect(7, x, x + 1.4, z, z + 1.8, GLASS);
      for (const y of [1.2, 4.2]) g.rrect(8, y, y + 1.6, z, z + 1.8, GLASS_D);
    }
    g.box(2.6, 7, 0, 2.8, 0.15, 0, WALL);
    g.lrect(7, 3, 5, 0, 1.6, '#0252CD');
    for (const z of [4.4, 7.4, 10.4]) {
      g.box(0.6, 7, z, 3.4, 1.4, 0.3, SOFT);
      g.lrect(8.4, 0.6, 4, z + 0.3, z + 1.3, 'rgba(147,189,235,.75)');
    }
    g.box(-0.2, -0.2, 16, 8.4, 7.4, 0.5, BLUE);
    g.logoL(7, 4.9, 15.3, 2.1);
    g.tree(10, 8.5, 0, 6);
  },
  villa(g) {
    g.box(-2, -2, -0.6, 22, 17, 0.6, GRASS);
    g.box(10, 9, -0.6, 8, 5, 0.62, { t: '#E8ECF2', l: '#E8ECF2', r: '#E8ECF2' });
    g.trect(0.03, 10.6, 17.4, 9.6, 13.4, '#5FB2F0');
    g.trect(0.04, 11.2, 16.8, 10.2, 12.8, '#8ED0FA');
    g.logoT(0.05, 15.2, 10.4, 1.6, 'logo-white');
    g.box(0, 0, 0, 14, 7.5, 4, WALL);
    g.lrect(7.5, 1, 8, 0.4, 3.4, GLASS);
    g.lrect(7.5, 9, 13, 0, 3.4, '#0252CD');
    g.box(1, 0, 4, 9, 6, 3.6, WALL);
    g.lrect(6, 2, 8, 4.6, 6.8, GLASS);
    g.rrect(10, 1, 4, 4.6, 6.8, GLASS_D);
    g.box(-0.4, -0.4, 4, 14.8, 8.3, 0.35, DARK);
    g.box(0.6, -0.4, 7.6, 9.8, 6.8, 0.35, DARK);
    g.tree(18.5, 2, 0, 7); g.tree(-1, 12, 0, 7);
  },
  plot(g) {
    const W = 20, D = 15;
    g.box(0, 0, -0.9, W, D, 0.9, GRASS);
    g.trect(0.02, 9.5, 11, 7, D, '#E6E1D6');
    g.box(7, 2.5, 0, 6.5, 4.5, 3.6, WALL);
    g.lrect(7, 8, 9.2, 0, 2, '#0252CD');
    gable(g, 7, 2.5, 3.6, 6.5, 4.5, 2, 0.4);
    g.tree(3.5, 3.5, 0, 7); g.tree(16, 10, 0, 6);
    const c = [[0.4, 0.4], [W - 0.4, 0.4], [W - 0.4, D - 0.4], [0.4, D - 0.4]].map(([x, y]) => g.P(x, y, 0.02));
    g.raw(`<polygon points="${c.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#0252CD" stroke-width="2.6" stroke-linejoin="round"/>`);
    [[0.4, 0.4], [W - 0.4, 0.4], [W - 0.4, D - 0.4], [0.4, D - 0.4]].forEach(([x, y]) => g.box(x - 0.3, y - 0.3, 0, 0.6, 0.6, 1.4, BLUE));
    const p3 = g.P(W + 1.6, 0, -0.9), p4 = g.P(W + 1.6, D, -0.9);
    g.raw(`<line x1="${p3[0]}" y1="${p3[1]}" x2="${p4[0]}" y2="${p4[1]}" stroke="#8A94A6" stroke-width="1.2"/>`);
    const s = g.P(2.6, D - 1.2, 0);
    g.raw(`<rect x="${s[0] - 1.2}" y="${s[1] - 40}" width="2.4" height="40" fill="#8A6A4A"/>`);
    g.lrect(D - 1.2, 0.6, 5.6, 3.4, 7.8, '#FFFFFF');
    g.rrect(5.6, D - 1.5, D - 1.2, 3.4, 7.8, '#C9D1DD');
    g.logoL(D - 1.2, 1.5, 7.5, 3.6);
  },
  area(g) {
    const W = 16, D = 12;
    g.box(0, 0, 0, W, D, 0.6, { t: '#EAF2FE', l: '#C9D9F2', r: '#B3C7E8' });
    const wall = { t: '#FFFFFF', l: '#E6EBF3', r: '#D2DAE6' };
    g.box(0, 0, 0.6, W, 0.5, 2.2, wall);
    g.box(0, 0, 0.6, 0.5, D, 2.2, wall);
    g.box(9, 0.5, 0.6, 0.4, 6, 2.2, wall);
    g.box(0.5, 6.5, 0.6, 5, 0.4, 2.2, wall);
    g.trect(0.62, 10.5, 15, 7.5, 11, '#C7DBF8');
    g.logoT(0.63, 11.6, 7.9, 2.6);
    g.box(2, 1.5, 0.6, 4, 3, 0.9, SOFT);
    g.box(10.5, 1.5, 0.6, 3.5, 2.6, 1.2, WOOD);
    const a = g.P(0, D + 1.5, 0), b = g.P(W, D + 1.5, 0), c = g.P(W + 1.5, 0, 0), d = g.P(W + 1.5, D, 0);
    g.raw(`<g stroke="#0252CD" stroke-width="1.6" stroke-linecap="round"><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/><line x1="${c[0]}" y1="${c[1]}" x2="${d[0]}" y2="${d[1]}"/></g>`);
    for (const p of [a, b, c, d]) g.raw(`<circle cx="${p[0]}" cy="${p[1]}" r="2.6" fill="#0252CD"/>`);
  },
  beds(g) {
    g.box(-4.2, 0.3, 0, 2.8, 2.8, 3.4, { t: '#E9E3DA', l: '#D9D0C3', r: '#C6BBAC' });
    const lp = g.P(-2.8, 1.7, 3.4);
    g.raw(`<rect x="${lp[0] - 1}" y="${lp[1] - 18}" width="2" height="18" fill="#A99B89"/><path d="M${lp[0] - 9} ${lp[1] - 18} h18 l-4 -12 h-10z" fill="#F5EFE6"/>`);
    g.box(0, -0.9, 0, 11, 0.9, 6.2, { t: '#EDE6DC', l: '#E2D9CC', r: '#CFC4B5' });
    g.box(0, 0, 0, 11, 13, 1.6, { t: '#D9CFC2', l: '#BFB2A2', r: '#AA9C8B' });
    g.box(0.3, 0.3, 1.6, 10.4, 12.4, 1.7, { t: '#FFFFFF', l: '#F1F3F7', r: '#DDE3EC' });
    g.box(1, 1, 3.3, 4, 2.8, 1.1, { t: '#FFFFFF', l: '#F3F5F9', r: '#E0E5EE' });
    g.box(6, 1, 3.3, 4, 2.8, 1.1, { t: '#FFFFFF', l: '#F3F5F9', r: '#E0E5EE' });
    g.logoT(4.41, 7.6, 1.3, 2.2);
    g.box(0.1, 6, 3.3, 10.8, 6.9, 0.35, BLUE);
    g.trect(3.66, 0.1, 10.9, 7.4, 8.2, '#FFFFFF');
    g.lrect(12.9, 0.1, 10.9, 1.4, 3.65, '#0252CD');
    g.rrect(10.9, 6, 12.9, 1.2, 3.65, '#0141A6');
  },
  baths(g) {
    const f0 = g.P(6, 0.4, 5);
    g.raw(`<path d="M${f0[0]} ${f0[1] + 2} v-26 q0 -8 9 -8 q9 0 9 8 v6" fill="none" stroke="#5A6578" stroke-width="3" stroke-linecap="round"/>`);
    for (const [x, y] of [[0.6, 0.6], [11, 0.6], [0.6, 5.2], [11, 5.2]]) g.box(x, y, 0, 0.8, 0.8, 0.9, STEEL);
    g.box(0, 0, 0.9, 12.4, 6.6, 3.8, WALL);
    g.trect(4.7, 0.8, 11.6, 0.8, 5.8, '#E3EBF6');
    g.trect(4.3, 1.1, 11.3, 1.1, 5.5, '#BFD9F5');
    g.trect(4.72, 7.2, 10, 4.6, 6.6, '#3B82F6');
    g.lrect(6.6, 7.2, 10, 1.6, 4.72, '#0252CD');
    g.logoL(6.6, 7.6, 4.35, 2.3, 'logo-white');
    g.lrect(6.6, 7.2, 10, 1.6, 1.95, '#FFFFFF');
    g.box(13.5, 0.4, 0, 2.6, 2.6, 2.4, { t: '#E8ECF2', l: '#FFFFFF', r: '#D5DBE5' });
    const pl = g.P(14.8, 1.7, 2.4);
    g.raw(`<path d="M${pl[0]} ${pl[1]} q-14 -10 -10 -26 q8 8 10 24 q2 -20 12 -28 q4 16 -10 30z" fill="#4E9A4A"/>`);
  },
  toilet(g) {
    g.box(-1, -1, 0, 12, 1, 9, { t: '#F4F6FA', l: '#E9EDF3', r: '#DCE2EC' });
    g.box(1.5, 0, 3.6, 5, 2, 4, WALL);
    g.lrect(2, 3, 5, 6.2, 6.6, '#0252CD');
    g.logoL(2, 3.2, 7.4, 1.4);
    g.box(2.8, 1.8, 0, 2.4, 2.6, 2.6, WALL);
    g.cyl(4, 4.5, 2.6, 2.3, 0.9, { t: '#FFFFFF', l: '#E6EBF2' });
    g.tdisc(3.5, 4, 4.5, 1.6, '#BFD9F5');
    g.box(8, 1, 3, 2.4, 0.6, 3.2, { t: '#3B82F6', l: '#0252CD', r: '#0141A6' });
    g.cyl(9.2, 0.5, 6.4, 0.25, 0.6, STEEL);
  },
  livingRooms(g) {
    g.box(0, 0, 0, 13, 1.6, 5.4, SOFT);
    g.box(0, 0, 0, 1.6, 5.6, 3.4, SOFT);
    g.box(1.6, 1.6, 0, 9.8, 4, 2, SOFT);
    g.box(1.7, 1.7, 2, 4.8, 3.9, 0.8, { t: '#FFFFFF', l: '#F1F4F8', r: '#DCE2EB' });
    g.box(6.5, 1.7, 2, 4.8, 3.9, 0.8, { t: '#FFFFFF', l: '#F1F4F8', r: '#DCE2EB' });
    g.box(7.6, 1.7, 2.8, 3, 0.9, 2.9, BLUE);
    g.logoL(2.6, 8.1, 5.3, 2.2, 'logo-white');
    g.box(11.4, 0, 0, 1.6, 5.6, 3.4, SOFT);
    g.box(2.5, 8, 0, 7, 3.6, 1.8, WOOD);
    const cup = g.P(5, 9.5, 1.8);
    g.raw(`<rect x="${cup[0] - 4}" y="${cup[1] - 7}" width="8" height="7" rx="1.5" fill="#FFFFFF"/>`);
    const l = g.P(14.6, 0.6, 0);
    g.raw(`<rect x="${l[0] - 1}" y="${l[1] - 74}" width="2" height="74" fill="#5A6578"/><path d="M${l[0] - 12} ${l[1] - 74} h24 l-5 -16 h-14z" fill="#F7F1E4"/>`);
  },
  kitchen(g) {
    g.box(0, -1, 0, 14, 1, 11, { t: '#F4F6FA', l: '#EEF1F6', r: '#DCE2EC' });
    g.box(0, 0, 6.5, 14, 2, 3, WALL);
    g.lrect(2, 0.4, 6.8, 6.8, 9.2, '#EAF0F8');
    g.lrect(2, 7.2, 13.6, 6.8, 9.2, '#0252CD');
    g.logoL(2, 9.6, 8.9, 1.9, 'logo-white');
    g.box(0, 0, 0, 14, 5, 4, WALL);
    g.lrect(5, 0.4, 4.4, 0.4, 3.6, '#EAF0F8');
    g.lrect(5, 4.8, 9.2, 0.4, 3.6, '#0252CD');
    g.lrect(5, 9.6, 13.6, 0.4, 3.6, '#EAF0F8');
    g.box(-0.2, -0.2, 4, 14.4, 5.4, 0.4, { t: '#3A4253', l: '#2A303D', r: '#232834' });
    g.tdisc(4.42, 9.5, 2.4, 1, '#5A6578'); g.tdisc(4.42, 12, 2.4, 1, '#5A6578');
    g.cyl(9.5, 2.4, 4.4, 1.1, 1.3, { t: '#C3CAD6', l: '#0252CD' });
    g.box(2, 1.4, 4.4, 3.4, 2.2, 0.3, WOOD);
  },
  dining(g) {
    const chair = (x, y) => { g.box(x, y, 0, 2.4, 2.4, 2.4, WOOD); g.box(x, y, 2.4, 2.4, 0.4, 3, WOOD); };
    chair(2, -1.8); chair(7.5, -1.8);
    g.box(0, 0, 0, 12, 7, 3.6, { t: '#E3C59E', l: '#BE9770', r: '#A57E58' });
    g.box(0.8, 0.8, 0, 10.4, 5.4, 3.2, { t: '#0000', l: '#9C7752', r: '#8A6845' });
    g.box(-0.3, -0.3, 3.6, 12.6, 7.6, 0.4, { t: '#FFFFFF', l: '#EEF1F5', r: '#D9DFE8' });
    g.trect(4.02, 1.5, 4.8, 2, 5, '#0252CD');
    g.logoT(4.03, 2.6, 2.6, 2.1, 'logo-white');
    g.tdisc(4.02, 8.2, 3.5, 1.3, '#FFFFFF');
    g.cyl(8.2, 3.5, 4, 0.9, 0.3, { t: '#EEF1F5', l: '#D9DFE8' });
    g.cyl(6, 1.2, 4, 0.35, 1.8, { t: '#BFD9F5', l: '#93BDEB' });
    const cx = g.P(10.2, 6, 4);
    g.raw(`<circle cx="${cx[0]}" cy="${cx[1] - 6}" r="5" fill="#4E9A4A"/>`);
    g.box(-2.6, 2.2, 0, 2.4, 2.4, 2.4, WOOD);
  },
  storage(g) {
    g.box(0, 0, 0, 12, 4, 0.5, STEEL);
    g.box(0, 0, 4, 12, 4, 0.4, STEEL);
    g.box(0, 0, 8, 12, 4, 0.4, STEEL);
    for (const x of [0, 11.5]) g.box(x, 3.5, 0, 0.5, 0.5, 8.8, { t: '#98A2B2', l: '#5A6578', r: '#4A5466' });
    const cardboard = { t: '#E8C48E', l: '#D6A96A', r: '#C29257' };
    g.box(1, 0.5, 0.5, 4, 3, 3, cardboard);
    g.box(6, 0.5, 0.5, 3, 3, 2.4, cardboard);
    g.box(1.5, 0.5, 4.4, 3.4, 3, 2.6, BLUE);
    g.logoL(3.5, 2.3, 6.6, 1.9, 'logo-white');
    g.box(6.2, 0.5, 4.4, 4.6, 3, 3.2, cardboard);
    g.lrect(3.5, 7.2, 9.8, 6.3, 6.7, '#FFFFFF');
    g.box(2, 0.6, 8.4, 3, 2.8, 2, { t: '#FFFFFF', l: '#EEF1F5', r: '#D5DBE5' });
    g.box(6.8, 0.6, 8.4, 3.6, 2.8, 1.6, cardboard);
  },
  office(g) {
    g.box(-2, 3.5, 0, 3.2, 3.2, 3.2, DARK);
    g.box(-2, 3.5, 3.2, 3.2, 0.6, 3.4, DARK);
    g.box(0, 0, 3.6, 12, 6, 0.5, { t: '#FFFFFF', l: '#EEF1F5', r: '#D5DBE5' });
    g.box(0.4, 0.4, 0, 0.6, 5.2, 3.6, STEEL);
    g.box(11, 0.4, 0, 0.6, 5.2, 3.6, STEEL);
    g.box(3, 1.5, 4.1, 5, 3.4, 0.25, STEEL);
    g.poly([[3, 1.5, 4.35], [8, 1.5, 4.35], [8, 1.0, 7.6], [3, 1.0, 7.6]], '#2A303D');
    g.poly([[3, 1.5, 4.35], [8, 1.5, 4.35], [8, 1.5, 4.35], [3, 1.5, 4.35]], '#2A303D');
    g.lrect(1.3, 3.3, 7.7, 4.7, 7.3, '#3B82F6');
    g.logoL(1.3, 4.8, 6.9, 1.9, 'logo-white');
    g.cyl(10, 3, 4.1, 0.7, 1.1, { t: '#3A4253', l: '#0252CD' });
    const pl = g.P(1.6, 1.4, 4.1);
    g.raw(`<path d="M${pl[0]} ${pl[1]} q-10 -8 -6 -20 q6 6 6 18 q2 -14 10 -20 q2 12 -10 22z" fill="#4E9A4A"/>`);
  },
  openPlan(g) {
    const W = 18, D = 13;
    g.box(0, 0, 0, W, D, 0.6, { t: '#EFE6D8', l: '#DCD1C0', r: '#C9BCA8' });
    g.box(0, 0, 0.6, W, 0.4, 4, { t: '#FFFFFF', l: '#EEF1F5', r: '#D9DFE8' });
    g.box(0, 0, 0.6, 0.4, D, 4, { t: '#FFFFFF', l: '#EEF1F5', r: '#D9DFE8' });
    g.lrect(0.4, 3, 8, 1.6, 4, GLASS);
    g.rrect(0.4, 3, 9, 1.6, 4, GLASS_D);
    g.trect(0.62, 3, 9, 6, 11, '#3B82F6');
    g.logoT(0.63, 6.8, 7, 2.8, 'logo-white');
    g.box(3, 4, 0.6, 6, 1.6, 2.2, SOFT);
    g.box(11, 2, 0.6, 5, 3, 2.4, WOOD);
    g.box(12, 7, 0.6, 3.5, 3.5, 2.2, { t: '#FFFFFF', l: '#EEF1F5', r: '#D9DFE8' });
    g.tree(16, 11, 0.6, 5);
  },
  garage(g) {
    g.box(-1, -1, -0.6, 18, 17, 0.6, { t: '#D7DCE3', l: '#EEF1F5', r: '#C9D0DA' });
    g.box(0, 0, 0, 10, 7, 6, WALL);
    g.box(-0.3, -0.3, 6, 10.6, 7.6, 0.6, DARK);
    g.lrect(7, 1.4, 8.6, 0, 4.4, '#E3E8F0');
    for (let z = 0.55; z < 4.4; z += 0.55) g.lrect(7, 1.4, 8.6, z, z + 0.08, '#C7CFDB');
    g.lrect(7, 3.4, 6.6, 4.7, 5.8, '#FFFFFF');
    g.logoL(7, 4.45, 5.75, 1.05);
    g.rrect(10, 2, 5, 2.4, 4.6, GLASS_D);
    g.box(2.2, 8.4, 0.6, 5.6, 7.2, 1.7, BLUE);
    g.box(2.7, 9.8, 2.3, 4.6, 3.8, 1.5, { t: '#2A303D', l: '#9DBBE0', r: '#7FA2CC' });
    g.lrect(15.6, 3.4, 6.6, 1.0, 1.6, '#FFFFFF');
    const wl = g.P(2.2, 14, 0.6), wr = g.P(7.8, 14, 0.6);
    g.raw(`<ellipse cx="${wl[0] + 2}" cy="${wl[1] - 3}" rx="5" ry="6" fill="#1C2433"/><ellipse cx="${wr[0] - 1}" cy="${wr[1] - 6}" rx="5" ry="6" fill="#1C2433"/>`);
    const h1 = g.P(2.6, 15.6, 1.6), h2 = g.P(7.4, 15.6, 1.6);
    g.raw(`<circle cx="${h1[0]}" cy="${h1[1]}" r="2.4" fill="#FFF6D6"/><circle cx="${h2[0]}" cy="${h2[1]}" r="2.4" fill="#FFF6D6"/>`);
    g.tree(14, 1.5, 0, 7);
  },
  floors(g) {
    const slab = { t: '#FFFFFF', l: '#E6EBF3', r: '#D2DAE6' };
    for (let i = 0; i < 4; i++) {
      const z = i * 3.4;
      g.box(0, 0, z, 10, 8, 0.6, i === 3 ? BLUE : slab);
      if (i < 3) {
        for (const [x, y] of [[0.2, 0.2], [9.2, 0.2], [9.2, 7.2], [0.2, 7.2]]) g.box(x, y, z + 0.6, 0.6, 0.6, 2.8, STEEL);
        g.lrect(8, 1.5, 8.5, z + 1, z + 3.2, 'rgba(191,214,242,.55)');
      }
    }
    const steps = 6;
    for (let s = 0; s < steps; s++) g.box(10.4, 2 + s * 0.9, s * 0.55, 2, 0.9, 0.55, SOFT);
    g.lrect(8, 3.4, 6.6, 10.6, 12.6, '#FFFFFF');
    g.logoL(8, 4.2, 12.4, 1.6);
  },
  yearBuilt(g) {
    g.box(0, 0, 0, 10, 1.2, 11, { t: '#FFFFFF', l: '#F4F6FA', r: '#DCE2EC' });
    g.lrect(1.2, 0, 10, 8, 11, '#0252CD');
    g.logoL(1.2, 4, 10.6, 2.2, 'logo-white');
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      g.lrect(1.2, 1 + c * 2.2, 2.4 + c * 2.2, 5.6 - r * 2.2, 6.8 - r * 2.2, r === 1 && c === 2 ? '#3B82F6' : '#E1E7F0');
    }
    for (const x of [2.5, 7.5]) g.box(x, 0.3, 10.6, 0.5, 0.5, 1.4, STEEL);
    // key lying in front
    g.tdisc(0, 9, 4, 1.6, '#F5B400');
    g.tdisc(0.01, 9, 4, 0.7, '#FFFFFF');
    g.box(10.3, 3.6, 0, 4.5, 0.8, 0.35, { t: '#FFCB3D', l: '#E0A400', r: '#C98F00' });
    g.box(13.3, 4.4, 0, 0.6, 0.8, 0.35, { t: '#FFCB3D', l: '#E0A400', r: '#C98F00' });
  },
  construction(g) {
    g.box(-1, -1, -0.5, 16, 12, 0.5, { t: '#D7DCE3', l: '#EEF1F5', r: '#C9D0DA' });
    g.box(0, 0, 0, 7, 6, 6, WALL);
    g.lrect(6, 1, 3, 1, 3, GLASS); g.lrect(6, 4, 6, 1, 3, GLASS);
    for (const [x, y] of [[0, 0], [6.6, 0], [6.6, 5.6], [0, 5.6]]) g.box(x, y, 6, 0.4, 0.4, 3, STEEL);
    g.box(0, 0, 9, 7, 6, 0.4, { t: '#E9EDF3', l: '#D9DFE8', r: '#C9D0DB' });
    g.box(10, 3, 0, 0.8, 0.8, 16, { t: '#FFCB3D', l: '#F5B400', r: '#D99A00' });
    const a = g.P(3, 3.4, 16), b = g.P(15, 3.4, 16), t = g.P(10.4, 3.4, 18);
    g.raw(`<g stroke="#F5B400" stroke-width="2.4" stroke-linecap="round"><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/><line x1="${t[0]}" y1="${t[1]}" x2="${a[0]}" y2="${a[1]}"/><line x1="${t[0]}" y1="${t[1]}" x2="${b[0]}" y2="${b[1]}"/></g>`);
    const hook = g.P(5, 3.4, 16);
    g.raw(`<line x1="${hook[0]}" y1="${hook[1]}" x2="${hook[0]}" y2="${hook[1] + 34}" stroke="#5A6578" stroke-width="1.2"/>`);
    g.box(13.6, 2.6, 15, 1.8, 1.6, 1.4, BLUE);
    const cw = g.P(13.6, 4.2, 16.4);
    g.logoAt(cw[0] + 1, cw[1] + 0.5, 10, 'logo-white');
    const hb = g.P(4.4, 3, 11.2);
    g.box(4.2, 3, 10.4, 1.6, 1.6, 1.2, BLUE);
    g.raw(`<circle cx="${hb[0]}" cy="${hb[1]}" r="0" fill="none"/>`);
  },
  furnishing(g) {
    const fab = { t: '#4C8FF0', l: '#0252CD', r: '#0141A6' };
    g.box(0, 0, 0, 7, 7, 2.4, fab);
    g.box(0, 0, 2.4, 7, 1.6, 5, fab);
    g.box(0, 1.6, 2.4, 1.4, 5.4, 2, fab);
    g.box(5.6, 1.6, 2.4, 1.4, 5.4, 2, fab);
    g.box(1.4, 1.6, 2.4, 4.2, 5.2, 0.9, { t: '#6AA2F2', l: '#2F74E0', r: '#1D5CC2' });
    g.logoL(1.6, 2.4, 6.6, 2.3, 'logo-white');
    for (const [x, y] of [[0.4, 6.2], [6, 6.2]]) g.box(x, y, -0.8, 0.5, 0.5, 0.8, WOOD);
    g.box(9.5, 2, 0, 3, 3, 3.6, WOOD);
    g.cyl(11, 3.5, 3.6, 0.3, 2.4, STEEL);
    const sh = g.P(11, 3.5, 6);
    g.raw(`<path d="M${sh[0] - 9} ${sh[1] + 1} h18 l-4 -12 h-10z" fill="#F7F1E4"/>`);
  },
  heating(g) {
    g.box(-1, -1, 0, 14, 1, 10, { t: '#F4F6FA', l: '#EEF1F6', r: '#DCE2EC' });
    g.box(0, 0, 0, 12, 3, 7, { t: '#FFFFFF', l: '#F4F6FA', r: '#DCE2EC' });
    g.lrect(3, 2.5, 9.5, 0.6, 5, '#2A303D');
    const fl = g.P(6, 3, 0.8);
    g.raw(`<path d="M${fl[0]} ${fl[1]} c-14 -4 -12 -18 -2 -26 c0 8 6 10 6 4 c8 8 10 20 -4 22z" fill="#FF8A3D"/><path d="M${fl[0]} ${fl[1]} c-7 -2 -6 -10 0 -14 c1 5 5 5 4 2 c4 5 4 11 -4 12z" fill="#FFD25A"/>`);
    g.box(-0.4, -0.4, 7, 12.8, 3.8, 0.6, BLUE);
    g.lrect(3.4, 4.2, 7.8, 7.08, 7.55, '#0141A6');
    g.logoL(3.4, 5.2, 9.6, 2.4);
    g.box(1, 0.6, 7.6, 1.4, 1.4, 2.6, { t: '#FFFFFF', l: '#EEF1F5', r: '#D5DBE5' });
    g.box(9.2, 0.6, 7.6, 2, 1.2, 1.6, WOOD);
  },
  condition(g) {
    g.box(0, 0, 0, 12, 6, 5, BLUE);
    g.box(0, 0, 5, 12, 6, 0.8, { t: '#4C8FF0', l: '#1D63D6', r: '#0E4FB8' });
    g.lrect(6, 0, 12, 4.6, 5.0, '#0141A6');
    g.logoL(6, 4.6, 3.6, 2.6, 'logo-white');
    const h1 = g.P(3.5, 3, 5.8), h2 = g.P(8.5, 3, 5.8);
    g.raw(`<path d="M${h1[0]} ${h1[1]} v-12 q0 -4 4 -4 h${h2[0] - h1[0] - 8} q4 0 4 4 v12" fill="none" stroke="#2A303D" stroke-width="3.2" stroke-linecap="round"/>`);
    g.box(13.5, 1, 0, 1.2, 1.2, 7, WOOD);
    g.box(12.3, 0.6, 7, 3.6, 2, 1.8, { t: '#FFFFFF', l: '#EEF1F5', r: '#D5DBE5' });
    g.box(-3.5, 3, 0, 2.6, 2.6, 2.4, { t: '#C3CAD6', l: '#AEB7C5', r: '#98A2B2' });
    g.tdisc(2.42, -2.2, 4.3, 1.1, '#3B82F6');
  },
  view(g) {
    g.box(0, 0, 0, 13, 1.4, 12, { t: '#FFFFFF', l: '#F4F6FA', r: '#DCE2EC' });
    g.lrect(1.4, 1.2, 11.8, 1.2, 10.8, '#CFE6FB');
    const m = (x1, x2, peak, z0, fill) => g.poly([[x1, 1.4, z0], [x2, 1.4, z0], [(x1 + x2) / 2, 1.4, peak]], fill);
    m(1.2, 8, 8.4, 1.2, '#8FA9C8');
    m(5, 11.8, 7.2, 1.2, '#6F8CB0');
    g.poly([[3.6, 1.4, 6.8], [4.6, 1.4, 8.4], [5.6, 1.4, 6.8]], '#FFFFFF');
    g.lrect(1.4, 1.2, 11.8, 1.2, 3, '#7DBB6A');
    const sun = g.P(9.5, 1.4, 9.4);
    g.raw(`<circle cx="${sun[0]}" cy="${sun[1]}" r="6" fill="#FFD25A"/>`);
    g.lrect(1.4, 6.3, 6.7, 1.2, 10.8, '#FFFFFF');
    g.lrect(1.4, 1.2, 11.8, 5.8, 6.2, '#FFFFFF');
    g.logoL(1.4, 1.8, 10.2, 1.8);
    g.box(-0.6, 1.4, 0, 14.2, 1.6, 0.5, WALL);
    g.box(8, 1.6, 0.5, 2, 1.2, 1.6, { t: '#E8ECF2', l: '#FFFFFF', r: '#D5DBE5' });
    const pl = g.P(9, 2.2, 2.1);
    g.raw(`<path d="M${pl[0]} ${pl[1]} q-8 -6 -6 -16 q5 5 6 14 q1 -12 8 -16 q2 10 -8 18z" fill="#4E9A4A"/>`);
  },
  energy(g) {
    g.box(0, 0, 0, 12, 8, 5, WALL);
    g.lrect(8, 2, 5, 0, 3.4, '#0252CD');
    g.lrect(8, 7, 10, 1.4, 3.4, GLASS);
    gable(g, 0, 0, 5, 12, 8, 3.6, 0.5);
    // panels on the front slope
    const panel = (x1, x2) => g.poly([[x1, 7.6, 5.4], [x2, 7.6, 5.4], [x2, 4.6, 8], [x1, 4.6, 8]], '#1E3A6E');
    panel(1, 5.2); panel(6.2, 10.6);
    for (const [x1, x2] of [[1, 5.2], [6.2, 10.6]]) {
      const a = g.P(x1, 6.1, 6.7), b = g.P(x2, 6.1, 6.7), c = g.P((x1 + x2) / 2, 7.6, 5.4), d = g.P((x1 + x2) / 2, 4.6, 8);
      g.raw(`<g stroke="#5E86C4" stroke-width=".8"><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/><line x1="${c[0]}" y1="${c[1]}" x2="${d[0]}" y2="${d[1]}"/></g>`);
    }
    const bd = g.P(13, 4, 9);
    g.raw(`<circle cx="${bd[0] + 10}" cy="${bd[1] - 14}" r="16" fill="#22A55A"/><circle cx="${bd[0] + 10}" cy="${bd[1] - 14}" r="12" fill="#FFFFFF"/><path d="M${bd[0] + 3} ${bd[1] - 14} l5 6 10 -12" fill="none" stroke="#22A55A" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`);
    g.logoL(8, 7.2, 4.9, 1.2);
  },
  orientation(g) {
    g.cyl(6, 6, 0, 7, 1, { t: '#FFFFFF', l: '#D5DBE5' });
    g.tdisc(1.01, 6, 6, 6.2, '#F4F6FA');
    g.tdisc(1.02, 6, 6, 5.6, '#FFFFFF');
    const n = g.P(6, -0.2, 1.05), s = g.P(6, 12.2, 1.05), c = g.P(6, 6, 1.05);
    const e = g.P(7.1, 6, 1.05), w = g.P(4.9, 6, 1.05);
    g.raw(`<polygon points="${n.join(',')} ${e.join(',')} ${c.join(',')}" fill="#0252CD"/><polygon points="${n.join(',')} ${w.join(',')} ${c.join(',')}" fill="#3B82F6"/>`);
    g.raw(`<polygon points="${s.join(',')} ${e.join(',')} ${c.join(',')}" fill="#AEB7C5"/><polygon points="${s.join(',')} ${w.join(',')} ${c.join(',')}" fill="#C9D0DB"/>`);
    g.raw(`<circle cx="${c[0]}" cy="${c[1]}" r="3" fill="#2A303D"/>`);
    g.logoT(1.04, 8.6, 8.6, 2.4);
    for (const [x, y] of [[6, 0.9], [11.1, 6], [6, 11.1], [0.9, 6]]) g.tdisc(1.03, x, y, 0.35, '#5A6578');
  },
  balcony(g) {
    g.box(0, 0, 0, 12, 1.2, 12, WALL);
    g.lrect(1.2, 2, 7, 4, 10.5, GLASS);
    g.lrect(1.2, 4.4, 4.6, 4, 10.5, '#FFFFFF');
    g.box(0.5, 1.2, 3.4, 11, 5, 0.6, SOFT);
    g.box(8.4, 2, 4, 2.4, 2.4, 1.8, { t: '#E8ECF2', l: '#FFFFFF', r: '#D5DBE5' });
    const pl = g.P(9.6, 3.2, 5.8);
    g.raw(`<path d="M${pl[0]} ${pl[1]} q-10 -8 -6 -20 q6 6 6 18 q2 -14 10 -20 q2 12 -10 22z" fill="#4E9A4A"/>`);
    g.box(2.4, 2.4, 4, 2.6, 2.2, 1.8, WOOD);
    g.lrect(6.2, 0.5, 11.5, 4, 7, 'rgba(147,189,235,.55)');
    g.rrect(11.5, 1.2, 6.2, 4, 7, 'rgba(122,166,218,.55)');
    g.box(0.5, 6.1, 7, 11, 0.2, 0.3, BLUE);
    g.box(11.3, 1.2, 7, 0.2, 5, 0.3, BLUE);
    g.logoL(6.2, 5.4, 6.4, 2.2);
  },
  garden(g) {
    g.box(0, 0, -0.8, 16, 13, 0.8, GRASS);
    g.trect(0.02, 6, 8, 0, 13, '#E6E1D6');
    g.tree(3, 3, 0, 9); g.tree(13, 2.5, 0, 8);
    const fl = [[2, 9, '#F06292'], [3, 10.5, '#FFD25A'], [1.5, 11.5, '#F06292'], [12, 9, '#FFD25A'], [13.5, 10.2, '#F06292'], [12.5, 11.6, '#3B82F6']];
    for (const [x, y, c] of fl) { const p = g.P(x, y, 0); g.raw(`<circle cx="${p[0]}" cy="${p[1] - 2}" r="2.4" fill="${c}"/>`); }
    g.box(9.5, 6, 0, 4, 1.4, 1.6, WOOD);
    g.box(9.5, 6, 1.6, 4, 0.4, 2, BLUE);
    g.logoL(6.4, 10.5, 3.4, 1.6, 'logo-white');
    g.cyl(5, 9, 0, 0.9, 1.6, { t: '#C3CAD6', l: '#AEB7C5' });
  },
  elevator(g) {
    g.box(0, 0, 0, 10, 2, 14, { t: '#FFFFFF', l: '#F4F6FA', r: '#DCE2EC' });
    g.lrect(2, 1.6, 8.4, 0, 10.4, '#C3CAD6');
    g.lrect(2, 2, 4.9, 0, 10, '#DCE2EC');
    g.lrect(2, 5.1, 8, 0, 10, '#E7EBF1');
    g.lrect(2, 1.6, 8.4, 11, 13, '#0252CD');
    g.logoL(2, 4.4, 12.75, 1.6, 'logo-white');
    g.box(8.9, 2, 4, 0.2, 0.1, 0, WALL);
    g.lrect(2, 8.8, 9.6, 4, 6.4, '#2A303D');
    const b1 = g.P(9.2, 2, 5.8), b2 = g.P(9.2, 2, 4.8);
    g.raw(`<circle cx="${b1[0]}" cy="${b1[1]}" r="1.6" fill="#3B82F6"/><circle cx="${b2[0]}" cy="${b2[1]}" r="1.6" fill="#FFFFFF"/>`);
    g.box(-0.5, 2, -0.3, 11, 4, 0.3, SOFT);
  },
  security(g) {
    g.box(0, 0, 3, 1.2, 9, 8, { t: '#FFFFFF', l: '#F4F6FA', r: '#E6EBF2' });
    g.box(1.2, 3, 8, 1.6, 1.2, 0.6, DARK);
    g.box(2.4, 2.4, 6.6, 6, 2.4, 2.4, { t: '#FFFFFF', l: '#EEF1F5', r: '#D5DBE5' });
    g.rrect(8.4, 2.6, 4.6, 6.8, 8.8, '#2A303D');
    const lens = g.P(8.4, 3.6, 7.8);
    g.raw(`<circle cx="${lens[0]}" cy="${lens[1]}" r="3.2" fill="#3B82F6"/><circle cx="${lens[0] - 1}" cy="${lens[1] - 1}" r="1" fill="#FFFFFF"/>`);
    const sc = g.P(7, 9, 0);
    const x = sc[0], y = sc[1] - 44;
    g.raw(`<path d="M${x} ${y} l24 9 v16 c0 15 -10 24 -24 30 c-14 -6 -24 -15 -24 -30 v-16z" fill="#0141A6"/>`);
    g.raw(`<path d="M${x - 2} ${y - 2} l24 9 v16 c0 15 -10 24 -24 30 c-14 -6 -24 -15 -24 -30 v-16z" fill="#0252CD"/>`);
    g.logoAt(x - 12, y + 10, 26, 'logo-white');
  },
  airConditioning(g) {
    g.box(0, 0, 0, 14, 1, 10, { t: '#F4F6FA', l: '#EEF1F6', r: '#DCE2EC' });
    g.box(1, 1, 5, 12, 2.6, 3.6, { t: '#FFFFFF', l: '#F7F9FC', r: '#DCE2EC' });
    g.lrect(3.6, 1.6, 12.4, 5.4, 6.2, '#2A303D');
    g.lrect(3.6, 1.6, 12.4, 5.55, 5.7, '#5A6578');
    g.lrect(3.6, 1.8, 3.6, 7.6, 8.2, '#0252CD');
    g.logoL(3.6, 10.4, 8.3, 1.7);
    const a = g.P(4, 4.5, 4.4), b = g.P(9, 4.5, 4.4), c = g.P(6.5, 4.5, 3.4);
    g.raw(`<g fill="none" stroke="#7FB2F0" stroke-width="2.2" stroke-linecap="round"><path d="M${a[0]} ${a[1]} q-6 10 2 18"/><path d="M${c[0]} ${c[1]} q-6 10 2 18"/><path d="M${b[0]} ${b[1]} q-6 10 2 18"/></g>`);
  },
  pool(g) {
    g.box(0, 0, -1, 18, 13, 1, { t: '#F4F6FA', l: '#E6EBF2', r: '#D5DBE5' });
    g.trect(0.01, 1.5, 15, 1.5, 10.5, '#3E9EEA');
    g.trect(0.02, 2.2, 14.3, 2.2, 9.8, '#6DC0F7');
    const w1 = g.P(5, 5, 0.03), w2 = g.P(10, 7, 0.03);
    g.raw(`<g fill="none" stroke="#B7E3FD" stroke-width="1.8" stroke-linecap="round"><path d="M${w1[0] - 10} ${w1[1]} q5 -4 10 0 t10 0"/><path d="M${w2[0] - 10} ${w2[1]} q5 -4 10 0 t10 0"/></g>`);
    g.logoT(0.03, 11.5, 2.6, 2.8, 'logo-white');
    const l1 = g.P(15, 4, 0), l2 = g.P(15, 6, 0);
    g.raw(`<g fill="none" stroke="#AEB7C5" stroke-width="2" stroke-linecap="round"><path d="M${l1[0]} ${l1[1]} v-22 q0 -6 -6 -6"/><path d="M${l2[0]} ${l2[1]} v-22 q0 -6 -6 -6"/></g>`);
    g.box(1, 11, 0, 5, 1.6, 0.8, WOOD);
    const um = g.P(3.5, 11.8, 0);
    g.raw(`<line x1="${um[0]}" y1="${um[1]}" x2="${um[0]}" y2="${um[1] - 44}" stroke="#5A6578" stroke-width="1.6"/><path d="M${um[0] - 24} ${um[1] - 36} q24 -22 48 0z" fill="#0252CD"/><path d="M${um[0] - 8} ${um[1] - 36} q8 -22 16 0z" fill="#FFFFFF"/>`);
  },
  pets(g) {
    g.box(-1, -1, -0.5, 13, 11, 0.5, GRASS);
    g.box(1, 1, 0, 7, 6, 4.6, { t: '#FFFFFF', l: '#F4F6FA', r: '#DCE2EC' });
    const dp = (x, z) => g.P(x, 7, z);
    const a = dp(3, 0), b = dp(6, 0), c = dp(6, 2.6), d = dp(3, 2.6), top = dp(4.5, 3.5);
    g.raw(`<path d="M${a[0]} ${a[1]} L${b[0]} ${b[1]} L${c[0]} ${c[1]} Q${top[0] + 9} ${top[1] - 4} ${top[0]} ${top[1]} Q${top[0] - 9} ${top[1] - 4} ${d[0]} ${d[1]}Z" fill="#2A303D"/>`);
    const r = 2.6, o = 0.5;
    g.poly([[1 - o, 1 - o, 4.6], [8 + o, 1 - o, 4.6], [8 + o, 4, 4.6 + r], [1 - o, 4, 4.6 + r]], '#0141A6');
    g.poly([[1 - o, 7 + o, 4.6], [8 + o, 7 + o, 4.6], [8 + o, 4, 4.6 + r], [1 - o, 4, 4.6 + r]], '#0252CD');
    g.poly([[8, 1, 4.6], [8, 7, 4.6], [8, 4, 4.6 + r]], '#DCE2EC');
    g.logoR(8, 5, 6.2, 1.5);
    g.cyl(10.5, 8, 0, 1, 0.5, { t: '#3B82F6', l: '#0252CD' });
    const bone = g.P(4.5, 9.5, 0);
    g.raw(`<g fill="#FFFFFF" stroke="#D5DBE5" stroke-width=".8"><rect x="${bone[0] - 6}" y="${bone[1] - 1.6}" width="12" height="3.2" rx="1.6"/><circle cx="${bone[0] - 6}" cy="${bone[1] - 1.4}" r="2"/><circle cx="${bone[0] - 6}" cy="${bone[1] + 1.4}" r="2"/><circle cx="${bone[0] + 6}" cy="${bone[1] - 1.4}" r="2"/><circle cx="${bone[0] + 6}" cy="${bone[1] + 1.4}" r="2"/></g>`);
  },
  city(g) {
    g.box(-1, -1, -0.5, 17, 13, 0.5, { t: '#D7DCE3', l: '#EEF1F5', r: '#C9D0DA' });
    const tower = (x, y, w, d, h, c) => {
      g.box(x, y, 0, w, d, h, c);
      for (let z = 1.2; z < h - 0.8; z += 1.8) g.lrect(y + d, x + 0.5, x + w - 0.5, z, z + 0.9, 'rgba(255,255,255,.55)');
    };
    tower(0, 0, 4, 4, 12, { t: '#B9DEFB', l: '#6FA6DA', r: '#93C6F2' });
    tower(5, 0, 4, 4, 17, { t: '#FFFFFF', l: '#EEF1F5', r: '#D5DBE5' });
    tower(10, 1, 4, 4, 9, { t: '#3B82F6', l: '#0252CD', r: '#0141A6' });
    tower(1, 6, 5, 4, 6, WALL);
    tower(8, 6.5, 4, 4, 7.5, { t: '#B9DEFB', l: '#6FA6DA', r: '#93C6F2' });
    g.logoL(10, 6, 16.4, 2.2);
  },
  sea(g) {
    g.box(0, 0, -1, 18, 6, 1, { t: '#F3E3BF', l: '#E3CFA2', r: '#D3BC8C' });
    g.box(0, 6, -1.4, 18, 8, 1.2, { t: '#4FA8EE', l: '#2D86D6', r: '#1F6FBD' });
    const w1 = g.P(4, 9, -0.2), w2 = g.P(11, 11, -0.2);
    g.raw(`<g fill="none" stroke="#BEE4FD" stroke-width="1.8" stroke-linecap="round"><path d="M${w1[0] - 10} ${w1[1]} q5 -4 10 0 t10 0"/><path d="M${w2[0] - 10} ${w2[1]} q5 -4 10 0 t10 0"/></g>`);
    g.trect(0.01, 2, 6, 1, 3.2, '#0252CD');
    g.logoT(0.02, 3.2, 1.25, 1.7, 'logo-white');
    const um = g.P(9, 2.5, 0);
    g.raw(`<line x1="${um[0]}" y1="${um[1]}" x2="${um[0] - 4}" y2="${um[1] - 50}" stroke="#5A6578" stroke-width="1.8"/><path d="M${um[0] - 30} ${um[1] - 38} q26 -26 52 -4z" fill="#FFFFFF"/><path d="M${um[0] - 12} ${um[1] - 45} q8 -12 16 -8 l4 9z" fill="#0252CD"/>`);
    const boat = g.P(14, 10, -0.2);
    g.raw(`<path d="M${boat[0] - 12} ${boat[1] - 4} h24 l-5 6 h-14z" fill="#FFFFFF"/><path d="M${boat[0]} ${boat[1] - 4} v-20 l10 16z" fill="#FFFFFF"/>`);
  },
  school(g) {
    g.box(-1, -1, -0.5, 18, 11, 0.5, GRASS);
    g.box(0, 0, 0, 16, 6, 5, { t: '#FFFFFF', l: '#F4F6FA', r: '#DCE2EC' });
    for (const x of [1, 3.4, 10.6, 13]) g.lrect(6, x, x + 1.8, 1.4, 3.6, GLASS);
    g.box(6, 0, 0, 4, 7, 8, { t: '#FFFFFF', l: '#EEF1F5', r: '#D5DBE5' });
    g.lrect(7, 7, 9, 0, 2.6, '#0252CD');
    const ck = g.P(8, 7, 6);
    g.raw(`<circle cx="${ck[0]}" cy="${ck[1]}" r="6" fill="#FFFFFF" stroke="#0252CD" stroke-width="1.6"/><path d="M${ck[0]} ${ck[1]} v-4 M${ck[0]} ${ck[1]} h3" stroke="#2A303D" stroke-width="1.4" stroke-linecap="round"/>`);
    g.box(-0.3, -0.3, 5, 16.6, 6.6, 0.4, { t: '#3A4253', l: '#2A303D', r: '#232834' });
    gable(g, 6, 0, 8, 4, 7, 2.6, 0.3, '#D5DBE5');
    const fp = g.P(14.5, 7.5, 0);
    g.raw(`<line x1="${fp[0]}" y1="${fp[1]}" x2="${fp[0]}" y2="${fp[1] - 64}" stroke="#5A6578" stroke-width="1.6"/><path d="M${fp[0]} ${fp[1] - 64} h26 l-4 8 4 8 h-26z" fill="#FFFFFF" stroke="#0252CD" stroke-width="1.2"/>`);
    g.logoAt(fp[0] + 3, fp[1] - 63, 14);
  },
  hospital(g) {
    g.box(-1, -1, -0.5, 18, 12, 0.5, { t: '#D7DCE3', l: '#EEF1F5', r: '#C9D0DA' });
    g.box(0, 0, 0, 16, 7, 6, { t: '#FFFFFF', l: '#F4F6FA', r: '#DCE2EC' });
    g.box(4, 0, 6, 8, 7, 4, { t: '#FFFFFF', l: '#F4F6FA', r: '#DCE2EC' });
    for (const x of [1, 13]) for (const z of [1.4, 3.6]) g.lrect(7, x, x + 2, z, z + 1.4, GLASS);
    for (const x of [5, 9.6]) g.lrect(7, x, x + 1.4, 7, 8.6, GLASS);
    g.lrect(7, 6.4, 9.6, 0, 3, '#BFD6F2');
    g.box(5.6, 7, 3, 4.8, 1.6, 0.4, BLUE);
    const cr = g.P(8, 7, 9.2);
    g.raw(`<rect x="${cr[0] - 7}" y="${cr[1] - 7}" width="14" height="14" rx="3" fill="#FFFFFF"/><path d="M${cr[0]} ${cr[1] - 5} v10 M${cr[0] - 5} ${cr[1]} h10" stroke="#EF4444" stroke-width="3.4" stroke-linecap="round"/>`);
    g.lrect(7, 6.6, 9.4, 4.4, 5.6, '#FFFFFF');
    g.logoL(7, 7.4, 5.45, 1.1);
    g.tree(17, 2, 0, 6);
  },
};

export function renderIso(name) {
  const g = scene(10, 140, 70);
  ISO[name](g);
  const body = g.body();
  const defs = body.includes('#logo') ? `<defs>${LOGO_DEFS}</defs>` : '';
  return { defs, body };
}
