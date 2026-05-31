#!/usr/bin/env node
'use strict';
const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(__dirname, 'balkanestate-ai-deck.pptx');

// ─── Brand palette ────────────────────────────────────────────────────────────
const B = {
  navy:    '0B1E3D',
  blue:    '1A56DB',
  blueMid: '2563EB',
  teal:    '0891B2',
  tealLt:  '06B6D4',
  sky:     '38BDF8',
  slate:   '1E3A5F',
  slateXl: '0F2540',
  mist:    'E8F0FE',
  mistDk:  'C7D9F8',
  white:   'FFFFFF',
  offW:    'F7F9FC',
  gray:    '64748B',
  grayLt:  'CBD5E1',
  dark:    '0B1421',
  orange:  'F59E0B',
  green:   '10B981',
  purple:  '7C3AED',
};

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33" × 7.5"
const W = 13.33, H = 7.5;

// ─── Primitives ───────────────────────────────────────────────────────────────
const R = pptx.ShapeType.rect;
const E = pptx.ShapeType.ellipse;
const RR = pptx.ShapeType.roundRect;

function rect(slide, x, y, w, h, fill, border, radius, transparency) {
  const isGrad = Array.isArray(fill);
  const lineColor = border || (isGrad ? fill[1] : fill);
  slide.addShape(radius ? RR : R, {
    x, y, w, h,
    fill: isGrad
      ? { type:'gradient', gradType:'linear', angle: fill[0], stops:[{position:0,color:fill[1]},{position:100,color:fill[2]}] }
      : { color: fill, transparency: transparency || 0 },
    line: { color: lineColor, pt: border ? 1.5 : 0 },
    rectRadius: radius || 0
  });
}

function circle(slide, cx, cy, r, fill, transparency) {
  const isGrad = Array.isArray(fill);
  const fillColor = isGrad ? fill[1] : fill;
  slide.addShape(E, {
    x: cx - r, y: cy - r, w: r * 2, h: r * 2,
    fill: isGrad
      ? { type:'gradient', gradType:'linear', angle: fill[0], stops:[{position:0,color:fill[1]},{position:100,color:fill[2]}] }
      : { color: fillColor, transparency: transparency || 0 },
    line: { color: fillColor, pt: 0 }
  });
}

function line(slide, x, y, w, color, thick) {
  slide.addShape(R, {
    x, y, w, h: thick || 0.05,
    fill: { color: color }, line: { color: color, pt: 0 }
  });
}

function txt(slide, text, x, y, w, h, opts) {
  slide.addText(text, { x, y, w, h, ...opts });
}

function tag(slide, label, x, y, color, bgColor) {
  const cw = label.length * 0.097 + 0.5;
  rect(slide, x, y, cw, 0.31, bgColor || [90, color, B.teal], color, 0.08);
  txt(slide, label, x, y, cw, 0.31, { fontSize:9, bold:true, color:B.white, align:'center', valign:'middle' });
}

function slideNum(slide, n, total) {
  txt(slide, `${n} / ${total}`, W-1.1, H-0.38, 0.9, 0.3,
    { fontSize:8.5, color:B.grayLt, align:'right', italic:true });
}

// Decorative ring (unfilled circle outline)
function ring(slide, cx, cy, r, color, transparency, thick) {
  slide.addShape(E, {
    x: cx-r, y: cy-r, w: r*2, h: r*2,
    fill: { color: color, transparency:100 },
    line: { color, pt: thick||2.5, transparency: transparency||0 }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();

  // Full dark background
  rect(slide, 0, 0, W, H, [135, B.dark, '0D2040']);

  // Decorative geometry — right side orbs
  circle(slide, 11.8, 1.5, 3.2, B.blue, 90);
  circle(slide, 12.4, 4.8, 2.2, B.teal, 88);
  circle(slide, 10.5, 3.0, 1.0, B.sky, 82);
  ring(slide, 11.2, 2.2, 3.8, B.sky, 88, 1.2);
  ring(slide, 11.2, 2.2, 5.5, B.blue, 92, 0.8);

  // Top accent bar
  rect(slide, 0, 0, W, 0.08, [90, B.blue, B.teal]);

  // Logo mark
  rect(slide, 0.72, 0.9, 0.72, 0.72, [135, B.blue, B.teal], null, 0.1);
  txt(slide, 'BE', 0.72, 0.9, 0.72, 0.72, { fontSize:22, bold:true, color:B.white, align:'center', valign:'middle' });
  txt(slide, 'BalkanEstateAI', 1.58, 0.97, 4.5, 0.58, { fontSize:17, bold:true, color:B.white, align:'left', valign:'middle' });

  // Eyebrow tag
  tag(slide, 'INVESTOR PITCH DECK  ·  2026', 0.72, 1.9, B.teal, B.teal);

  // Hero headline — very large
  txt(slide, 'AI-Powered\nReal Estate\nfor the Balkans', 0.72, 2.38, 8.2, 2.8,
    { fontSize:52, bold:true, color:B.white, lineSpacingMultiple:1.1, align:'left', charSpacing:-0.5 });

  // Divider
  line(slide, 0.72, 5.3, 1.5, B.teal, 0.055);

  txt(slide, 'Helping buyers, sellers, agents, and agencies discover\nproperties through intelligent search, interactive maps,\nand modern property management tools.', 0.72, 5.45, 7.0, 1.15,
    { fontSize:13.5, color:'8EB8D8', lineSpacingMultiple:1.55, align:'left' });

  // Stat pills bottom
  const stats = [['AI-First', 'Search Experience'], ['11', 'Countries'], ['Multi-Lang', 'Platform']];
  stats.forEach(([v, l], i) => {
    const sx = 0.72 + i*3.2;
    rect(slide, sx, 6.82, 2.9, 0.52, B.white, null, 0.09, 94);
    txt(slide, v, sx, 6.86, 1.4, 0.22, { fontSize:12.5, bold:true, color:B.sky, align:'center' });
    txt(slide, l, sx+1.4, 6.86, 1.4, 0.22, { fontSize:10, color:'7AAED0', align:'center' });
    txt(slide, '|', sx+1.35, 6.86, 0.15, 0.22, { fontSize:12, color:B.teal, align:'center' });
  });

  txt(slide, 'BalkanEstateAI.com', 0.72, 7.22, 5, 0.22,
    { fontSize:10, color:'3A7A9A', italic:true });

  slideNum(slide, 1, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — THE PROBLEM
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  rect(slide, 0, 0, W, H, B.offW);

  // Bold left panel
  rect(slide, 0, 0, 3.6, H, [160, B.navy, B.slateXl]);
  circle(slide, 3.6, 7.5, 3.0, B.blue, 90);
  circle(slide, 0, 0, 1.5, B.teal, 88);

  txt(slide, '02', 0.3, 0.3, 1.2, 1.0, { fontSize:11, bold:true, color:B.teal, align:'left' });
  line(slide, 0.38, 1.38, 1.0, B.teal, 0.05);

  txt(slide, 'The\nProblem', 0.35, 1.55, 2.9, 1.5,
    { fontSize:36, bold:true, color:B.white, lineSpacingMultiple:1.1, align:'left' });

  txt(slide, 'The real estate\nmarket in the\nWestern Balkans\nis fragmented\nand broken.', 0.35, 3.2, 3.0, 2.4,
    { fontSize:13, color:'7AAED0', lineSpacingMultiple:1.55, align:'left' });

  // Right — numbered problem list
  const problems = [
    'Property listings are spread across dozens of websites and social media platforms',
    'Buyers spend hours searching through incomplete or outdated listings',
    'Agencies struggle to gain visibility online and manage listings efficiently',
    'Limited access to market insights and any form of pricing transparency',
    'Platforms lack AI search, interactive maps, and advanced filtering tools',
  ];

  problems.forEach((p, i) => {
    const y = 0.55 + i * 1.3;
    // Number badge
    rect(slide, 3.95, y, 0.58, 0.58, i < 2 ? B.blue : i === 2 ? B.teal : B.slate, null, 0.1);
    txt(slide, `0${i+1}`, 3.95, y, 0.58, 0.58, { fontSize:14, bold:true, color:B.white, align:'center', valign:'middle' });

    rect(slide, 4.68, y, 8.3, 0.58, B.white, B.mistDk, 0.1);
    // Left color stripe
    rect(slide, 4.68, y, 0.06, 0.58, i < 2 ? B.blue : i === 2 ? B.teal : B.slate, null, 0);
    txt(slide, p, 4.88, y+0.06, 7.9, 0.46, { fontSize:12.5, color:B.navy, valign:'middle' });
  });

  slideNum(slide, 2, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — OUR SOLUTION
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  rect(slide, 0, 0, W, H, B.navy);

  // Decorative top-right
  circle(slide, W, 0, 4.5, B.blue, 90);
  circle(slide, W, 0, 2.8, B.teal, 88);
  ring(slide, W-1, 0, 5.8, B.sky, 90, 0.8);

  rect(slide, 0, 0, W, 0.08, [90, B.teal, B.blue]);

  txt(slide, '03', 0.6, 0.28, 1, 0.35, { fontSize:10, bold:true, color:B.teal });
  tag(slide, 'OUR SOLUTION', 0.6, 0.72, B.teal, B.teal);

  txt(slide, 'One Platform.\nEvery Market.\nEvery Language.', 0.6, 1.2, 6.0, 2.0,
    { fontSize:40, bold:true, color:B.white, lineSpacingMultiple:1.1 });

  line(slide, 0.6, 3.28, 1.2, B.teal, 0.055);

  txt(slide, 'BalkanEstateAI is built specifically for the Western Balkans —\nmaking property search faster, smarter, and more transparent.', 0.6, 3.45, 6.0, 0.75,
    { fontSize:12.5, color:'7AAED0', lineSpacingMultiple:1.5 });

  // Feature grid — right
  const features = [
    { icon:'🤖', label:'AI Property Search',    color: B.blue   },
    { icon:'🗺️', label:'Interactive Maps',      color: B.teal   },
    { icon:'🏢', label:'Agency Profiles',        color: B.purple },
    { icon:'📊', label:'Pricing Analytics',      color: B.orange },
    { icon:'🔔', label:'Saved Searches',         color: B.green  },
    { icon:'🚀', label:'Listing Promotions',     color: B.blue   },
    { icon:'🌍', label:'Multi-Language',         color: B.teal   },
    { icon:'📱', label:'Mobile-First PWA',       color: B.purple },
  ];

  features.forEach((f, i) => {
    const col = i % 2, row = Math.floor(i / 4) * 2 + Math.floor((i % 4) / 2);
    // Actually do 4 rows × 2 cols on right side
    const c = i % 2, r = Math.floor(i / 2);
    const x = 7.1 + c * 3.05, y = 0.48 + r * 1.72;
    rect(slide, x, y, 2.85, 1.52, B.slateXl, f.color, 0.14);
    rect(slide, x, y, 2.85, 0.055, f.color, null, 0);
    txt(slide, f.icon, x, y+0.12, 2.85, 0.62, { fontSize:26, align:'center' });
    txt(slide, f.label, x, y+0.78, 2.85, 0.55, { fontSize:11.5, bold:true, color:B.white, align:'center', lineSpacingMultiple:1.2 });
  });

  slideNum(slide, 3, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — PRODUCT
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  rect(slide, 0, 0, W, H, B.offW);

  // Top full header bar
  rect(slide, 0, 0, W, 1.85, [160, B.navy, B.slateXl]);
  rect(slide, 0, 0, W, 0.08, [90, B.blue, B.teal]);
  circle(slide, W, 0, 3.0, B.blue, 90);

  txt(slide, '04', 0.6, 0.22, 1, 0.35, { fontSize:10, bold:true, color:B.teal });
  txt(slide, 'The Product', 0.6, 0.58, 5, 0.65, { fontSize:32, bold:true, color:B.white });
  txt(slide, 'What users can do on BalkanEstateAI', 0.6, 1.25, 7, 0.38, { fontSize:13, color:'7AAED0' });

  // Two columns
  // Buyers
  rect(slide, 0.45, 2.1, 5.9, 4.85, B.white, B.mistDk, 0.16);
  rect(slide, 0.45, 2.1, 5.9, 0.52, B.blue, null, 0.08);
  txt(slide, '🏠  For Buyers', 0.65, 2.14, 5.5, 0.44, { fontSize:14, bold:true, color:B.white });

  const buyerItems = [
    ['🔍', 'AI-Powered Search', 'Natural language and filter-based property discovery'],
    ['🗺️', 'Interactive Map', 'Browse listings on a live map, draw zones to search'],
    ['🔔', 'Save & Alert', 'Save searches and get notified when new matches appear'],
    ['📈', 'Price Compare', 'Compare prices and access market pricing insights'],
  ];
  buyerItems.forEach(([icon, title, sub], i) => {
    const y = 2.82 + i * 1.0;
    txt(slide, icon, 0.65, y, 0.5, 0.45, { fontSize:18, align:'center' });
    txt(slide, title, 1.22, y, 4.8, 0.3, { fontSize:12.5, bold:true, color:B.navy });
    txt(slide, sub, 1.22, y+0.3, 4.8, 0.38, { fontSize:11, color:B.gray });
  });

  // Agents
  rect(slide, 6.98, 2.1, 5.9, 4.85, B.white, B.mistDk, 0.16);
  rect(slide, 6.98, 2.1, 5.9, 0.52, [90, B.teal, B.tealLt], null, 0.08);
  txt(slide, '🏢  For Agents & Agencies', 6.98+0.2, 2.14, 5.5, 0.44, { fontSize:14, bold:true, color:B.white });

  const agentItems = [
    ['📋', 'Listing Manager', 'Create, edit, and publish property listings in one place'],
    ['🌟', 'Agency Pages', 'Build a professional branded agency profile'],
    ['🚀', 'Promotions', 'Boost visibility through featured and premium placements'],
    ['📊', 'Analytics', 'Track views, leads, and performance across all listings'],
  ];
  agentItems.forEach(([icon, title, sub], i) => {
    const y = 2.82 + i * 1.0;
    txt(slide, icon, 7.18, y, 0.5, 0.45, { fontSize:18, align:'center' });
    txt(slide, title, 7.75, y, 4.8, 0.3, { fontSize:12.5, bold:true, color:B.navy });
    txt(slide, sub, 7.75, y+0.3, 4.8, 0.38, { fontSize:11, color:B.gray });
  });

  // Countries footer
  rect(slide, 0.45, 7.08, 12.43, 0.32, B.navy, null, 0.08);
  txt(slide, '🌍  N. Macedonia · Albania · Kosovo · Montenegro · Serbia · Bosnia · Croatia · Slovenia · Bulgaria · Greece · Romania', 0.6, 7.1, 12.1, 0.28, { fontSize:10, color:B.sky, align:'center', bold:true });

  slideNum(slide, 4, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — MARKET OPPORTUNITY
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  rect(slide, 0, 0, W, H, B.navy);
  circle(slide, 0, H, 4.0, B.blue, 88);
  circle(slide, 0, H, 2.0, B.teal, 86);
  ring(slide, 6.65, 3.75, 3.5, B.sky, 90, 0.6);

  rect(slide, 0, 0, W, 0.08, [90, B.blue, B.teal]);
  txt(slide, '05', 0.6, 0.28, 1, 0.32, { fontSize:10, bold:true, color:B.teal });
  tag(slide, 'MARKET OPPORTUNITY', 0.6, 0.72, B.teal, B.teal);

  txt(slide, 'A Growing Region\nUnderserved by PropTech', 0.6, 1.2, 8.0, 1.35,
    { fontSize:38, bold:true, color:B.white, lineSpacingMultiple:1.1 });

  // Growth drivers — left column
  const drivers = [
    { icon:'🏗️', label:'Urban Development', sub:'Rapid construction across all Balkan capitals' },
    { icon:'💰', label:'Foreign Investment', sub:'Growing expat & diaspora demand for property' },
    { icon:'✈️', label:'Tourism Expansion', sub:'Record tourism driving holiday rental demand' },
    { icon:'📲', label:'Digital Adoption', sub:'Rising demand for modern digital services' },
  ];

  drivers.forEach((d, i) => {
    const y = 2.82 + i * 1.12;
    rect(slide, 0.55, y, 5.65, 0.92, B.slateXl, B.slate, 0.12);
    rect(slide, 0.55, y, 0.06, 0.92, i < 2 ? B.blue : B.teal, null, 0);
    txt(slide, d.icon, 0.72, y+0.14, 0.52, 0.55, { fontSize:20, align:'center' });
    txt(slide, d.label, 1.35, y+0.1, 4.6, 0.32, { fontSize:13, bold:true, color:B.white });
    txt(slide, d.sub, 1.35, y+0.42, 4.6, 0.35, { fontSize:11, color:'7ABCD8' });
  });

  // Right — big "why now" callout
  rect(slide, 6.85, 2.75, 6.1, 4.38, B.slateXl, B.slate, 0.18);
  rect(slide, 6.85, 2.75, 6.1, 0.07, [90, B.blue, B.teal], null, 0);

  txt(slide, '💡', 6.85, 3.0, 6.1, 0.7, { fontSize:32, align:'center' });
  txt(slide, 'Why Now?', 6.85, 3.72, 6.1, 0.55, { fontSize:22, bold:true, color:B.white, align:'center' });
  line(slide, 8.8, 4.34, 2.2, B.teal, 0.05);

  const whyNow = [
    'Post-COVID digital adoption surge across SEE',
    'EU accession tailwinds for Albania, Serbia,\nNorth Macedonia',
    'No dominant pan-Balkan portal exists today',
    'Mobile penetration above 80% across the region',
  ];
  whyNow.forEach((w, i) => {
    txt(slide, '→  ' + w, 7.1, 4.52 + i*0.52, 5.65, 0.5, { fontSize:11.5, color:'8ABCD8', lineSpacingMultiple:1.3 });
  });

  slideNum(slide, 5, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — BUSINESS MODEL
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  rect(slide, 0, 0, W, H, B.offW);

  rect(slide, 0, 0, W, 0.08, [90, B.blue, B.teal]);

  // Header
  rect(slide, 0, 0, W, 1.72, B.navy);
  circle(slide, W, 0, 3.5, B.blue, 90);
  txt(slide, '06', 0.6, 0.22, 1, 0.32, { fontSize:10, bold:true, color:B.teal });
  txt(slide, 'Business Model', 0.6, 0.56, 7, 0.62, { fontSize:30, bold:true, color:B.white });
  txt(slide, 'Multiple revenue streams · Designed for scale across the region', 0.6, 1.22, 9, 0.34, { fontSize:12.5, color:'6AAED0' });

  const streams = [
    { icon:'👤', title:'Agent\nSubscriptions',  body:'Monthly & annual plans for independent agents. Includes listing quotas and analytics.', color: B.blue,   accent:'2D6EF5' },
    { icon:'🏢', title:'Agency\nSubscriptions', body:'Team management, multi-agent dashboards, and enterprise listing volumes.', color: B.teal,   accent:'0AB4D6' },
    { icon:'⭐', title:'Premium\nPromotions',   body:'Featured, highlighted, and priority placements in search results and the homepage.', color: B.orange, accent:'F59E0B' },
    { icon:'📣', title:'Advertising\n& AI Tools', body:'Display advertising for partners and future premium AI analytics products.', color: B.purple, accent:'8B5CF6' },
  ];

  streams.forEach((s, i) => {
    const x = 0.38 + i * 3.2;
    rect(slide, x, 1.98, 3.02, 5.0, B.white, B.mistDk, 0.18);
    // Top color band
    rect(slide, x, 1.98, 3.02, 0.08, s.color, null, 0.04);
    // Icon circle
    circle(slide, x + 1.51, 2.86, 0.55, s.color, 86);
    txt(slide, s.icon, x, 2.32, 3.02, 1.05, { fontSize:28, align:'center' });
    txt(slide, s.title, x, 3.5, 3.02, 0.75, { fontSize:14.5, bold:true, color:B.navy, align:'center', lineSpacingMultiple:1.1 });
    line(slide, x+0.9, 4.32, 1.22, s.color, 0.05);
    txt(slide, s.body, x+0.12, 4.48, 2.78, 1.5, { fontSize:11, color:B.gray, align:'center', lineSpacingMultiple:1.45 });

    // Bottom badge
    rect(slide, x+0.4, 6.6, 2.22, 0.3, s.color, null, 0.12, 88);
    txt(slide, 'Revenue Stream', x+0.4, 6.6, 2.22, 0.3, { fontSize:9, bold:true, color:s.color, align:'center', valign:'middle' });
  });

  slideNum(slide, 6, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — TRACTION
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  rect(slide, 0, 0, W, H, [135, B.dark, '0C1E3A']);

  circle(slide, W, 0, 5.5, B.teal, 92);
  circle(slide, W, 0, 3.2, B.blue, 90);
  ring(slide, W, 0, 7.0, B.sky, 92, 0.6);

  rect(slide, 0, 0, W, 0.08, [90, B.teal, B.blue]);

  txt(slide, '07', 0.6, 0.28, 1, 0.32, { fontSize:10, bold:true, color:B.teal });
  tag(slide, 'TRACTION', 0.6, 0.72, B.teal, B.teal);

  txt(slide, 'Current Progress', 0.6, 1.18, 9, 0.72, { fontSize:38, bold:true, color:B.white });
  line(slide, 0.6, 1.97, 1.2, B.teal, 0.055);
  txt(slide, 'Platform launched February 2026 · Early-stage, focused on acquisition and market validation', 0.6, 2.12, 10, 0.38, { fontSize:12.5, color:'6AAED0' });

  const milestones = [
    { icon:'🚀', title:'Platform Live',         body:'Fully functional web platform live and publicly accessible',    color: B.blue   },
    { icon:'🌍', title:'Multi-Country',         body:'Property listings and search active across multiple countries',  color: B.teal   },
    { icon:'🏢', title:'Agency System',         body:'Agency and agent profile system fully built and operational',   color: B.purple },
    { icon:'🗺️', title:'Interactive Maps',      body:'Map-based property search live with draw-zone capability',      color: B.orange },
    { icon:'📣', title:'Active Outreach',       body:'Onboarding agencies via direct outreach and social media',      color: B.green  },
    { icon:'🤝', title:'Growing Network',       body:'Building partner network of agencies across the Balkans',       color: B.blue   },
  ];

  milestones.forEach((m, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.38 + col * 4.3, y = 2.72 + row * 2.3;
    rect(slide, x, y, 4.12, 2.0, B.slateXl, m.color, 0.14);
    rect(slide, x, y, 4.12, 0.07, m.color, null, 0);

    // Icon circle
    circle(slide, x + 0.55, y + 0.62, 0.38, m.color, 82);
    txt(slide, m.icon, x+0.17, y+0.25, 0.76, 0.75, { fontSize:20, align:'center' });

    txt(slide, m.title, x+1.05, y+0.18, 2.9, 0.42, { fontSize:13.5, bold:true, color:B.white });
    txt(slide, m.body, x+1.05, y+0.62, 2.9, 0.98, { fontSize:11, color:'8ABCD8', lineSpacingMultiple:1.38 });
  });

  slideNum(slide, 7, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — COMPETITIVE ADVANTAGE
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  rect(slide, 0, 0, W, H, B.offW);

  rect(slide, 0, 0, W, 0.08, [90, B.blue, B.teal]);
  rect(slide, 0, 0, W, 1.78, B.navy);
  circle(slide, 0, 0, 3.5, B.blue, 90);

  txt(slide, '08', 0.6, 0.22, 1, 0.32, { fontSize:10, bold:true, color:B.teal });
  txt(slide, 'Competitive Advantage', 0.6, 0.56, 9, 0.62, { fontSize:30, bold:true, color:B.white });
  txt(slide, 'We are not another generic listing portal', 0.6, 1.22, 9, 0.38, { fontSize:13, color:'6AAED0' });

  const advantages = [
    { icon:'🎯', title:'Built for This Region',  body:'Designed exclusively for Western Balkans — not adapted from a global template', color: B.blue   },
    { icon:'🤖', title:'AI-First Experience',    body:'Natural language search and intelligent recommendations at the core',           color: B.teal   },
    { icon:'🌐', title:'Native Multi-Language',  body:'Full localisation across all target countries from day one',                   color: B.purple },
    { icon:'🗺️', title:'Draw-Zone Map Search',  body:'Users draw areas on a map — not just filter by city name',                    color: B.orange },
    { icon:'🏢', title:'Agency-Focused Tools',   body:'Dedicated agency management dashboard built in — not an afterthought',         color: B.green  },
    { icon:'🌱', title:'Regional Scale Path',    body:'Architecture built to expand country by country across Southeast Europe',      color: B.blue   },
    { icon:'✨', title:'Modern UX Design',       body:'Consumer-grade UI compared to outdated traditional portals in the region',     color: B.teal   },
  ];

  // 4 top + 3 bottom
  advantages.forEach((a, i) => {
    const row = i < 4 ? 0 : 1;
    const colCount = row === 0 ? 4 : 3;
    const col = i < 4 ? i : i - 4;
    const totalW = colCount === 4 ? 3.1 : 4.05;
    const startX = colCount === 4 ? 0.38 : 0.72;
    const x = startX + col * (totalW + 0.1);
    const y = 2.0 + row * 2.62;

    rect(slide, x, y, totalW, 2.28, B.white, B.mistDk, 0.16);
    rect(slide, x, y, totalW, 0.07, a.color, null, 0);

    txt(slide, a.icon, x, y+0.18, totalW, 0.62, { fontSize:28, align:'center' });
    txt(slide, a.title, x+0.12, y+0.88, totalW-0.24, 0.46, { fontSize:12.5, bold:true, color:B.navy, align:'center' });
    txt(slide, a.body, x+0.12, y+1.36, totalW-0.24, 0.78, { fontSize:10.5, color:B.gray, align:'center', lineSpacingMultiple:1.35 });
  });

  slideNum(slide, 8, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — TEAM
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  rect(slide, 0, 0, W, H, B.navy);

  // Decorative
  circle(slide, W, H, 5.0, B.blue, 90);
  circle(slide, 0, 0, 2.5, B.teal, 92);
  ring(slide, 6.65, 3.75, 6.0, B.sky, 93, 0.6);

  rect(slide, 0, 0, W, 0.08, [90, B.blue, B.teal]);

  txt(slide, '09', 0.6, 0.28, 1, 0.32, { fontSize:10, bold:true, color:B.teal });
  tag(slide, 'THE TEAM', 0.6, 0.72, B.teal, B.teal);
  txt(slide, 'Built by a Founder Who Ships', 0.6, 1.2, 10, 0.72, { fontSize:36, bold:true, color:B.white });
  line(slide, 0.6, 1.98, 1.2, B.teal, 0.055);

  // Large founder card — center
  rect(slide, 1.2, 2.32, 10.92, 4.62, B.slateXl, B.slate, 0.2);
  rect(slide, 1.2, 2.32, 10.92, 0.07, [90, B.blue, B.teal], null, 0);

  // Avatar
  circle(slide, 3.3, 4.58, 1.05, B.blue, 0);
  circle(slide, 3.3, 4.58, 1.05, [135, B.blue, B.teal], 0);
  txt(slide, 'V', 2.25, 3.53, 2.1, 2.1, { fontSize:52, bold:true, color:B.white, align:'center', valign:'middle' });
  ring(slide, 3.3, 4.58, 1.18, B.teal, 72, 2.2);

  // Name & title
  txt(slide, 'Valdet', 4.6, 2.65, 7.1, 0.78, { fontSize:38, bold:true, color:B.white });
  txt(slide, 'Founder & CEO  ·  BalkanEstateAI', 4.6, 3.42, 7.1, 0.45, { fontSize:15, color:B.sky, bold:true });
  line(slide, 4.6, 3.95, 2.5, B.teal, 0.05);

  const skills = [
    ['🛠️', 'Android Developer & Software Engineer'],
    ['🏗️', 'Mobile Architecture & AI Integrations'],
    ['🎨', 'Product Design & UX Development'],
    ['🌍', 'Western Balkans Domain Expertise'],
  ];

  skills.forEach(([icon, label], i) => {
    const y = 4.15 + i * 0.62;
    rect(slide, 4.6, y, 7.1, 0.5, B.navy, B.slate, 0.1, 50);
    txt(slide, icon + '  ' + label, 4.78, y+0.05, 6.7, 0.4, { fontSize:12.5, color:B.white, bold:true, valign:'middle' });
  });

  // Bottom note
  rect(slide, 1.2, 6.62, 10.92, 0.58, B.navy, null, 0.1, 50);
  txt(slide, '⭐  Currently seeking strategic partners, mentors, and investors to accelerate growth.',
    1.38, 6.67, 10.6, 0.45, { fontSize:12, color:B.sky, italic:true, valign:'middle' });

  slideNum(slide, 9, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — VISION & ASK
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  rect(slide, 0, 0, W, H, [135, B.dark, '0C1E3A']);

  // Decorative large rings
  ring(slide, 6.65, 3.75, 5.2, B.blue, 90, 0.8);
  ring(slide, 6.65, 3.75, 3.5, B.teal, 88, 0.6);
  circle(slide, 6.65, 3.75, 1.0, B.blue, 86);
  txt(slide, 'BE', 6.15, 3.25, 1.0, 1.0, { fontSize:22, bold:true, color:B.white, align:'center', valign:'middle' });

  circle(slide, 0, H, 3.5, B.teal, 90);
  circle(slide, W, 0, 3.0, B.blue, 90);

  rect(slide, 0, 0, W, 0.08, [90, B.teal, B.blue]);

  txt(slide, '10', 0.6, 0.28, 1, 0.32, { fontSize:10, bold:true, color:B.teal });
  tag(slide, 'VISION & ASK', 0.6, 0.72, B.teal, B.teal);

  // Left column
  txt(slide, 'Become the Leading\nAI Real Estate Platform\nin the Western Balkans.', 0.6, 1.22, 5.6, 2.0,
    { fontSize:28, bold:true, color:B.white, lineSpacingMultiple:1.18 });

  line(slide, 0.6, 3.3, 1.0, B.teal, 0.055);

  const needs = [
    { icon:'🧭', label:'Strategic Mentorship' },
    { icon:'🤝', label:'Industry Partnerships' },
    { icon:'📣', label:'Marketing Support'    },
    { icon:'💰', label:'Early-Stage Investment'},
    { icon:'🌐', label:'Regional Networks'    },
  ];

  txt(slide, 'What We Are Looking For', 0.6, 3.48, 5.6, 0.42, { fontSize:13, bold:true, color:B.teal });

  needs.forEach((n, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    // Last item centered
    let x, y;
    if (i < 4) { x = 0.6 + col * 2.85; y = 4.0 + row * 0.76; }
    else { x = 0.6 + 1.425; y = 4.0 + 2 * 0.76; }
    rect(slide, x, y, 2.65, 0.62, B.slateXl, B.teal, 0.1, 50);
    txt(slide, n.icon + '  ' + n.label, x+0.12, y+0.1, 2.4, 0.42, { fontSize:12, bold:true, color:B.sky, valign:'middle' });
  });

  // Right column — vision points
  rect(slide, 7.6, 1.18, 5.35, 5.98, B.slateXl, B.slate, 0.18);
  rect(slide, 7.6, 1.18, 5.35, 0.07, [90, B.blue, B.teal], null, 0);

  txt(slide, 'Why BalkanEstateAI Wins', 7.82, 1.38, 5.0, 0.45, { fontSize:14.5, bold:true, color:B.white });
  line(slide, 7.82, 1.9, 1.8, B.teal, 0.05);

  const visionPts = [
    ['🌍', 'Regional First-Mover',    '11 countries, one unified platform — no one else has done this'],
    ['🤖', 'AI at the Core',           'Smarter search and recommendations from day one'],
    ['📈', 'Multiple Revenue Streams', 'Subscriptions, promotions, advertising, and AI tools'],
    ['🏗️', 'Infrastructure Ready',    'Built to expand country by country across SEE'],
    ['✨', 'Modern vs Incumbents',     'Consumer-grade UX against outdated traditional portals'],
  ];

  visionPts.forEach(([icon, title, sub], i) => {
    const y = 2.1 + i * 1.0;
    txt(slide, icon, 7.82, y, 0.52, 0.55, { fontSize:20, align:'center' });
    txt(slide, title, 8.42, y+0.03, 4.35, 0.32, { fontSize:13, bold:true, color:B.white });
    txt(slide, sub, 8.42, y+0.38, 4.35, 0.45, { fontSize:11, color:'6AAED0', lineSpacingMultiple:1.3 });
  });

  // CTA bar
  rect(slide, 0, 7.12, W, 0.38, [90, B.blue, B.teal]);
  txt(slide, '🌐  BalkanEstateAI.com  ·  Building the future of real estate discovery in the Balkans', 0, 7.12, W, 0.38,
    { fontSize:12.5, bold:true, color:B.white, align:'center', valign:'middle' });
}

// ─── Write file ───────────────────────────────────────────────────────────────
pptx.writeFile({ fileName: OUT }).then(() => {
  const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
  console.log(`✅  balkanestate-ai-deck.pptx → ${mb} MB  (10 slides)`);
}).catch(e => { console.error('❌', e.message); process.exit(1); });
