#!/usr/bin/env node
'use strict';
const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(__dirname, 'pitch-deck.pptx');
const shots = JSON.parse(fs.readFileSync(path.resolve(__dirname, '_pitch_shots.json'), 'utf8'));

// Brand
const BLUE   = '0252CD';
const ORANGE = 'FF9500';
const DARK   = '0E1729';
const LIGHT  = 'F5F7FF';
const GRAY   = '64748B';
const WHITE  = 'FFFFFF';

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5"

// ─── Helper to strip data URI prefix ──────────────────────────────────────────
function b64(key) {
  const raw = shots[key] || '';
  return raw.replace(/^data:image\/\w+;base64,/, '');
}

// ─── Shared layout constants ──────────────────────────────────────────────────
const W = 13.33, H = 7.5;

function addBg(slide, dark) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: dark ? DARK : WHITE },
    line: { color: dark ? DARK : WHITE, pt: 0 }
  });
}

function addAccentBar(slide, x, y, w, color) {
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w, h: 0.04,
    fill: { color: color || ORANGE },
    line: { color: color || ORANGE, pt: 0 }
  });
}

function chip(slide, label, x, y, color) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w: label.length * 0.11 + 0.4, h: 0.32,
    fill: { color: color || BLUE, transparency: 85 },
    line: { color: color || BLUE, pt: 1.5 },
    rectRadius: 0.05
  });
  slide.addText(label, {
    x, y, w: label.length * 0.11 + 0.4, h: 0.32,
    fontSize: 10, bold: true, color: color || BLUE,
    align: 'center', valign: 'middle'
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  addBg(slide, true);

  // Left gradient panel
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 6.2, h: H,
    fill: { type: 'gradient', gradType: 'linear', angle: 135,
      stops: [{ position: 0, color: '0A1628' }, { position: 100, color: '0E2348' }] },
    line: { color: '0A1628', pt: 0 }
  });

  // Blue accent top
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 6.2, h: 0.06,
    fill: { color: BLUE }, line: { color: BLUE, pt: 0 }
  });

  // Logo mark
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.55, y: 0.8, w: 0.55, h: 0.55,
    fill: { color: BLUE }, line: { color: BLUE, pt: 0 }, rectRadius: 0.08
  });
  slide.addText('B', {
    x: 0.55, y: 0.8, w: 0.55, h: 0.55,
    fontSize: 24, bold: true, color: WHITE, align: 'center', valign: 'middle'
  });
  slide.addText('BalkanEstate', {
    x: 1.2, y: 0.84, w: 2.8, h: 0.48,
    fontSize: 20, bold: true, color: WHITE, align: 'left', valign: 'middle'
  });

  // Tagline chip
  chip(slide, 'Investor Overview · 2025', 0.55, 1.62, ORANGE);

  // Main headline
  slide.addText('Real Estate for\nSoutheast Europe', {
    x: 0.55, y: 2.1, w: 5.4, h: 1.55,
    fontSize: 40, bold: true, color: WHITE,
    align: 'left', valign: 'top', lineSpacingMultiple: 1.15
  });

  addAccentBar(slide, 0.55, 3.72, 1.2, ORANGE);

  slide.addText('One platform. 10 countries. 10 languages.\nBuyers, sellers, and agents — all connected.', {
    x: 0.55, y: 3.86, w: 5.3, h: 0.85,
    fontSize: 15, color: 'A0B4D0', align: 'left', lineSpacingMultiple: 1.5
  });

  // Stats row
  const stats = [['10', 'Countries'], ['10', 'Languages'], ['100%', 'Live']];
  stats.forEach(([val, label], i) => {
    const sx = 0.55 + i * 1.72;
    slide.addText(val, { x: sx, y: 5.0, w: 1.5, h: 0.55, fontSize: 26, bold: true, color: ORANGE, align: 'left' });
    slide.addText(label, { x: sx, y: 5.52, w: 1.5, h: 0.3, fontSize: 11, color: '7A9ABF', align: 'left' });
  });

  // Founder note
  slide.addText('Zani Dalipi · zanoin@gmail.com · balkanestate.com', {
    x: 0.55, y: 6.8, w: 5.4, h: 0.35,
    fontSize: 10, color: '4A6A8A', align: 'left', italic: true
  });

  // Right — screenshot
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.2, y: 0, w: W - 6.2, h: H,
    fill: { color: '060E1C' }, line: { color: '060E1C', pt: 0 }
  });
  if (shots.home) {
    slide.addImage({ data: 'image/jpeg;base64,' + b64('home'), x: 6.35, y: 0.25, w: 6.78, h: 6.78 * (900/1440) });
  }
  // Overlay gradient
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.2, y: 0, w: 0.4, h: H,
    fill: { type: 'gradient', gradType: 'linear', angle: 90,
      stops: [{ position: 0, color: '0A1628' }, { position: 100, color: '0A162800' }] },
    line: { color: '0A1628', pt: 0 }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — THE PROBLEM
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  addBg(slide, false);

  // Top accent
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 0.06, fill: { color: BLUE }, line: { color: BLUE, pt: 0 }
  });

  chip(slide, 'The Problem', 0.55, 0.3, BLUE);

  slide.addText("Southeast Europe's Real Estate\nMarket is Broken", {
    x: 0.55, y: 0.78, w: 8, h: 1.1,
    fontSize: 34, bold: true, color: DARK, lineSpacingMultiple: 1.15
  });

  addAccentBar(slide, 0.55, 1.94, 1.0);

  slide.addText('Millions of buyers and sellers — zero unified platform. Every country has its own fragmented portals, language barriers, and trust issues.', {
    x: 0.55, y: 2.08, w: 7.8, h: 0.7,
    fontSize: 14, color: GRAY, lineSpacingMultiple: 1.4
  });

  const problems = [
    { icon: '🗺️', title: 'Fragmented Markets', body: '10 countries, 40+ separate portals — no cross-border search exists' },
    { icon: '🌐', title: 'Language Barriers', body: 'Listings only in local language — foreign buyers left out entirely' },
    { icon: '❓', title: 'No Trust Layer', body: 'Unverified agents, no reviews, no accountability — fraud is rampant' },
    { icon: '📵', title: 'No Digital Tools', body: 'No AI valuations, no mortgage calculators, no instant messaging' },
  ];

  problems.forEach((p, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.55 + col * 6.15, y = 3.1 + row * 1.85;

    slide.addShape(pptx.ShapeType.rect, {
      x, y, w: 5.8, h: 1.6,
      fill: { color: 'F8FAFF' }, line: { color: 'E2E8F4', pt: 1.5 }, rectRadius: 0.12
    });
    slide.addShape(pptx.ShapeType.rect, {
      x, y, w: 0.06, h: 1.6,
      fill: { color: BLUE }, line: { color: BLUE, pt: 0 }, rectRadius: 0.04
    });
    slide.addText(p.icon, { x: x + 0.2, y: y + 0.2, w: 0.55, h: 0.55, fontSize: 22, align: 'center' });
    slide.addText(p.title, { x: x + 0.85, y: y + 0.18, w: 4.7, h: 0.42, fontSize: 15, bold: true, color: DARK });
    slide.addText(p.body, { x: x + 0.85, y: y + 0.6, w: 4.7, h: 0.75, fontSize: 12, color: GRAY, lineSpacingMultiple: 1.35 });
  });

  // Right stat panel
  slide.addShape(pptx.ShapeType.rect, {
    x: 11.8, y: 0.8, w: 1.35, h: 6.4,
    fill: { color: 'F0F4FF' }, line: { color: 'E2E8F4', pt: 1 }, rectRadius: 0.1
  });
  [['€15B+', 'Market TAM'], ['40M+', 'Households'], ['Zero', 'Unified\nPortal']].forEach(([val, label], i) => {
    slide.addText(val, { x: 11.85, y: 1.2 + i * 1.9, w: 1.25, h: 0.55, fontSize: 18, bold: true, color: BLUE, align: 'center' });
    slide.addText(label, { x: 11.85, y: 1.73 + i * 1.9, w: 1.25, h: 0.5, fontSize: 9.5, color: GRAY, align: 'center', lineSpacingMultiple: 1.3 });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — THE SOLUTION
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  addBg(slide, false);

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 0.06, fill: { color: BLUE }, line: { color: BLUE, pt: 0 }
  });

  chip(slide, 'The Solution', 0.55, 0.3, BLUE);

  slide.addText('One Platform.\nEvery Market. Every Language.', {
    x: 0.55, y: 0.78, w: 5.8, h: 1.1,
    fontSize: 30, bold: true, color: DARK, lineSpacingMultiple: 1.15
  });

  addAccentBar(slide, 0.55, 1.94, 1.0);

  const features = [
    { icon: '🔍', label: 'Smart Search' },
    { icon: '🏠', label: 'Rich Listings' },
    { icon: '🤖', label: 'AI Valuation' },
    { icon: '💬', label: 'Live Chat' },
    { icon: '🧮', label: 'Mortgage Calc' },
    { icon: '📱', label: 'PWA App' },
    { icon: '🌍', label: '10 Languages' },
    { icon: '✅', label: 'Verified Agents' },
  ];

  features.forEach((f, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 0.55 + col * 1.35, y = 2.2 + row * 1.3;
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 1.2, h: 1.1,
      fill: { color: i % 3 === 0 ? 'EFF3FF' : i % 3 === 1 ? 'FFF5E6' : 'F0FDF4' },
      line: { color: i % 3 === 0 ? 'C7D7FF' : i % 3 === 1 ? 'FFD6A0' : 'A7F3D0', pt: 1.5 },
      rectRadius: 0.1
    });
    slide.addText(f.icon, { x, y: y + 0.08, w: 1.2, h: 0.5, fontSize: 22, align: 'center' });
    slide.addText(f.label, { x, y: y + 0.58, w: 1.2, h: 0.45, fontSize: 10, bold: true, color: DARK, align: 'center' });
  });

  // Screenshot right
  if (shots.search) {
    slide.addShape(pptx.ShapeType.rect, {
      x: 6.0, y: 0.5, w: 7.1, h: 6.7,
      fill: { color: 'F0F4FF' }, line: { color: 'C7D7FF', pt: 2 }, rectRadius: 0.15
    });
    slide.addImage({ data: 'image/jpeg;base64,' + b64('search'), x: 6.15, y: 0.65, w: 6.8, h: 6.8 * (900/1440) });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — PRODUCT
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  addBg(slide, true);

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 0.06, fill: { color: ORANGE }, line: { color: ORANGE, pt: 0 }
  });

  chip(slide, 'The Product', 0.55, 0.3, ORANGE);

  slide.addText('Built. Live. Ready.', {
    x: 0.55, y: 0.78, w: 12, h: 0.72,
    fontSize: 36, bold: true, color: WHITE
  });

  addAccentBar(slide, 0.55, 1.55, 1.0, ORANGE);

  slide.addText('Every screen you see below is the real, live platform — not a mockup.', {
    x: 0.55, y: 1.7, w: 12, h: 0.4,
    fontSize: 14, color: 'A0B4D0'
  });

  // 3 screenshots
  const imgKeys = ['home', 'agents', 'valuation'];
  const labels = ['Homepage & Search', 'Agent Directory', 'AI Valuation Tool'];
  imgKeys.forEach((key, i) => {
    const x = 0.4 + i * 4.3;
    if (shots[key]) {
      slide.addShape(pptx.ShapeType.rect, {
        x, y: 2.2, w: 4.1, h: 4.1 * (900/1440),
        fill: { color: '1A2744' }, line: { color: '2A3C66', pt: 2 }, rectRadius: 0.12
      });
      slide.addImage({ data: 'image/jpeg;base64,' + b64(key), x: x + 0.05, y: 2.3, w: 4.0, h: 4.0 * (900/1440) });
    }
    slide.addText(labels[i], {
      x, y: 2.2 + 4.1 * (900/1440) + 0.12, w: 4.1, h: 0.35,
      fontSize: 11, bold: true, color: WHITE, align: 'center'
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — MARKET
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  addBg(slide, false);

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 0.06, fill: { color: BLUE }, line: { color: BLUE, pt: 0 }
  });

  chip(slide, 'Market Size', 0.55, 0.3, BLUE);

  slide.addText('A €15B+ Opportunity —\nUntouched by Modern Tech', {
    x: 0.55, y: 0.78, w: 10, h: 1.1,
    fontSize: 33, bold: true, color: DARK, lineSpacingMultiple: 1.15
  });

  addAccentBar(slide, 0.55, 1.94, 1.0);

  const markets = [
    { label: 'TAM', val: '€15B+', sub: 'Total real estate\ntransactions in SEE', color: BLUE, w: 3.8 },
    { label: 'SAM', val: '€2.5B', sub: 'Online-reachable\nsegment today', color: '7C3AED', w: 3.1 },
    { label: 'SOM', val: '€5M', sub: 'Year 1 realistic\nreachable revenue', color: ORANGE, w: 2.1 },
  ];

  let mx = 0.55;
  markets.forEach(m => {
    slide.addShape(pptx.ShapeType.rect, {
      x: mx, y: 2.2, w: m.w, h: 3.6,
      fill: { color: m.color, transparency: 90 },
      line: { color: m.color, pt: 2 }, rectRadius: 0.12
    });
    slide.addText(m.label, { x: mx, y: 2.35, w: m.w, h: 0.45, fontSize: 13, bold: true, color: m.color, align: 'center' });
    slide.addText(m.val, { x: mx, y: 2.82, w: m.w, h: 0.9, fontSize: 32, bold: true, color: m.color, align: 'center' });
    slide.addText(m.sub, { x: mx, y: 3.75, w: m.w, h: 0.7, fontSize: 11, color: GRAY, align: 'center', lineSpacingMultiple: 1.35 });
    mx += m.w + 0.35;
  });

  // Why now
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.55, y: 6.0, w: W - 1.1, h: 1.1,
    fill: { color: 'F0F4FF' }, line: { color: 'C7D7FF', pt: 1.5 }, rectRadius: 0.1
  });
  slide.addText('⏰  Why Now:', {
    x: 0.75, y: 6.1, w: 1.5, h: 0.4, fontSize: 12, bold: true, color: BLUE
  });
  slide.addText('Post-COVID digital adoption surge · EU accession tailwinds (Albania, Serbia, N. Macedonia) · No dominant pan-Balkan portal exists · Mobile penetration now >80% across SEE', {
    x: 2.1, y: 6.08, w: 10.8, h: 0.9, fontSize: 11.5, color: GRAY, lineSpacingMultiple: 1.4
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — BUSINESS MODEL
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  addBg(slide, false);

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 0.06, fill: { color: BLUE }, line: { color: BLUE, pt: 0 }
  });

  chip(slide, 'Business Model', 0.55, 0.3, BLUE);

  slide.addText('Clear Revenue Streams.\nStrong Unit Economics.', {
    x: 0.55, y: 0.78, w: 12, h: 1.1,
    fontSize: 32, bold: true, color: DARK, lineSpacingMultiple: 1.15
  });

  addAccentBar(slide, 0.55, 1.94, 1.0);

  const plans = [
    { name: 'Pro Monthly', price: '€60/mo', detail: '30 listings · Analytics\nPriority support', color: BLUE },
    { name: 'Pro Yearly', price: '€400/yr', detail: '400 listings · Save 44%\nvs monthly', color: '7C3AED' },
    { name: 'Enterprise', price: '€1,500/yr', detail: '1,000 listings · Agency\ndashboard · API access', color: DARK },
    { name: 'Promoted Listings', price: '€9.99–€229', detail: 'Featured · Highlighted\nPremium placement', color: ORANGE },
  ];

  plans.forEach((p, i) => {
    const x = 0.4 + i * 3.2;
    slide.addShape(pptx.ShapeType.rect, {
      x, y: 2.2, w: 3.0, h: 4.0,
      fill: { color: p.color === DARK ? DARK : 'FFFFFF' },
      line: { color: p.color, pt: 2 }, rectRadius: 0.14
    });
    slide.addShape(pptx.ShapeType.rect, {
      x, y: 2.2, w: 3.0, h: 0.06,
      fill: { color: p.color }, line: { color: p.color, pt: 0 }, rectRadius: 0.02
    });
    slide.addText(p.name, {
      x, y: 2.35, w: 3.0, h: 0.45,
      fontSize: 13, bold: true, color: p.color === DARK ? WHITE : DARK, align: 'center'
    });
    slide.addText(p.price, {
      x, y: 2.88, w: 3.0, h: 0.7,
      fontSize: 26, bold: true, color: p.color === DARK ? WHITE : p.color, align: 'center'
    });
    slide.addText(p.detail, {
      x: x + 0.15, y: 3.68, w: 2.7, h: 0.9,
      fontSize: 11.5, color: p.color === DARK ? 'A0B4D0' : GRAY, align: 'center', lineSpacingMultiple: 1.4
    });
  });

  // Unit economics strip
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 6.35, w: W - 0.8, h: 0.85,
    fill: { color: 'F0F4FF' }, line: { color: 'C7D7FF', pt: 1.5 }, rectRadius: 0.1
  });
  const econ = [['LTV', '€720'], ['CAC', '<€80'], ['Payback', '<2 mo'], ['Gross Margin', '>85%']];
  econ.forEach(([k, v], i) => {
    const ex = 1.2 + i * 2.9;
    slide.addText(k, { x: ex, y: 6.42, w: 2.2, h: 0.3, fontSize: 10, color: GRAY, align: 'center' });
    slide.addText(v, { x: ex, y: 6.7, w: 2.2, h: 0.38, fontSize: 16, bold: true, color: BLUE, align: 'center' });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — TRACTION
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  addBg(slide, true);

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 0.06, fill: { color: ORANGE }, line: { color: ORANGE, pt: 0 }
  });

  chip(slide, 'Traction', 0.55, 0.3, ORANGE);

  slide.addText('What We\'ve Already Built', {
    x: 0.55, y: 0.78, w: 12, h: 0.65,
    fontSize: 36, bold: true, color: WHITE
  });

  addAccentBar(slide, 0.55, 1.5, 1.0, ORANGE);

  slide.addText('Pre-revenue, but the hard part is done — the platform is live and fully functional.', {
    x: 0.55, y: 1.65, w: 12, h: 0.38,
    fontSize: 14, color: 'A0B4D0'
  });

  const milestones = [
    { icon: '🌐', title: 'Platform Live', body: 'balkanestate.com is live and publicly accessible today' },
    { icon: '🤖', title: 'AI Integration', body: 'Google Gemini-powered valuations and neighborhood insights' },
    { icon: '🌍', title: '10 Languages', body: 'Full localization — Albanian, Serbian, Greek, Bulgarian & more' },
    { icon: '💬', title: 'Real-time Messaging', body: 'Socket.io live chat between buyers and agents, zero latency' },
    { icon: '📱', title: 'PWA / Mobile', body: 'Installable on iOS and Android — no app store needed' },
    { icon: '💳', title: 'Payments Live', body: 'Paysera + Stripe integrated — subscription billing ready' },
  ];

  milestones.forEach((m, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.4 + col * 4.3, y = 2.25 + row * 2.15;

    slide.addShape(pptx.ShapeType.rect, {
      x, y, w: 4.1, h: 1.85,
      fill: { color: '0A1628' }, line: { color: '1A3058', pt: 1.5 }, rectRadius: 0.12
    });
    slide.addShape(pptx.ShapeType.rect, {
      x, y, w: 0.06, h: 1.85,
      fill: { color: ORANGE }, line: { color: ORANGE, pt: 0 }, rectRadius: 0.04
    });
    slide.addText(m.icon, { x: x + 0.18, y: y + 0.18, w: 0.5, h: 0.5, fontSize: 20, align: 'center' });
    slide.addText(m.title, { x: x + 0.78, y: y + 0.18, w: 3.2, h: 0.4, fontSize: 14, bold: true, color: WHITE });
    slide.addText(m.body, { x: x + 0.78, y: y + 0.6, w: 3.2, h: 0.9, fontSize: 11.5, color: 'A0B4D0', lineSpacingMultiple: 1.35 });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — TEAM
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  addBg(slide, false);

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 0.06, fill: { color: BLUE }, line: { color: BLUE, pt: 0 }
  });

  chip(slide, 'The Team', 0.55, 0.3, BLUE);

  slide.addText('Built by a Founder Who\nKnows Real Estate & Tech', {
    x: 0.55, y: 0.78, w: 12, h: 1.1,
    fontSize: 33, bold: true, color: DARK, lineSpacingMultiple: 1.15
  });

  addAccentBar(slide, 0.55, 1.94, 1.0);

  // Founder card
  slide.addShape(pptx.ShapeType.rect, {
    x: 2.5, y: 2.2, w: 8.3, h: 4.5,
    fill: { color: 'F8FAFF' }, line: { color: 'C7D7FF', pt: 2 }, rectRadius: 0.16
  });

  // Avatar circle
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 3.5, y: 2.5, w: 1.8, h: 1.8,
    fill: { color: BLUE }, line: { color: '7AA8FF', pt: 3 }
  });
  slide.addText('ZD', { x: 3.5, y: 2.5, w: 1.8, h: 1.8, fontSize: 32, bold: true, color: WHITE, align: 'center', valign: 'middle' });

  slide.addText('Zani Dalipi', { x: 5.5, y: 2.55, w: 5.0, h: 0.6, fontSize: 26, bold: true, color: DARK });
  slide.addText('Founder & CEO · BalkanEstate.com', { x: 5.5, y: 3.15, w: 5.0, h: 0.38, fontSize: 13, color: BLUE, bold: true });
  slide.addText('zanoin@gmail.com', { x: 5.5, y: 3.55, w: 5.0, h: 0.35, fontSize: 12, color: GRAY, italic: true });

  const skills = ['Full-stack Development', 'Real Estate Domain', 'Product Design', 'SEE Market Knowledge'];
  skills.forEach((s, i) => {
    const sx = 3.5 + (i % 2) * 3.0, sy = 4.55 + Math.floor(i / 2) * 0.52;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: sx, y: sy, w: 2.7, h: 0.38,
      fill: { color: 'EFF3FF' }, line: { color: 'C7D7FF', pt: 1 }, rectRadius: 0.06
    });
    slide.addText('✓  ' + s, { x: sx + 0.1, y: sy + 0.02, w: 2.5, h: 0.34, fontSize: 11, color: BLUE, bold: true });
  });

  slide.addText('Solo founder — building fast, shipping real features, staying lean.', {
    x: 2.8, y: 6.1, w: 7.8, h: 0.42,
    fontSize: 12, color: GRAY, italic: true, align: 'center'
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — THE ASK
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  addBg(slide, true);

  // Full gradient bg
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { type: 'gradient', gradType: 'linear', angle: 135,
      stops: [{ position: 0, color: '0A1020' }, { position: 100, color: '0E2348' }] },
    line: { color: '0A1020', pt: 0 }
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 0.06, fill: { color: ORANGE }, line: { color: ORANGE, pt: 0 }
  });

  chip(slide, 'The Ask', 0.55, 0.3, ORANGE);

  slide.addText('Let\'s Build the\nFuture of Real Estate\nin Southeast Europe', {
    x: 0.55, y: 0.78, w: 12, h: 1.6,
    fontSize: 34, bold: true, color: WHITE, lineSpacingMultiple: 1.15
  });

  addAccentBar(slide, 0.55, 2.44, 1.0, ORANGE);

  // Raise box
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.55, y: 2.62, w: 5.5, h: 1.6,
    fill: { color: ORANGE, transparency: 85 },
    line: { color: ORANGE, pt: 2 }, rectRadius: 0.14
  });
  slide.addText('Raising', { x: 0.75, y: 2.78, w: 5.1, h: 0.35, fontSize: 12, color: ORANGE, bold: true });
  slide.addText('$250,000', { x: 0.75, y: 3.08, w: 5.1, h: 0.7, fontSize: 38, bold: true, color: WHITE });
  slide.addText('Seed · Pre-revenue · SAFE or convertible note', {
    x: 0.75, y: 3.76, w: 5.1, h: 0.35, fontSize: 11, color: 'A0B4D0'
  });

  // Use of funds
  const funds = [
    ['40%', 'Growth & Marketing', 'SEO, paid acquisition, agent onboarding'],
    ['30%', 'Engineering', 'Team hire, feature expansion, mobile app'],
    ['20%', 'Operations', 'Legal, compliance, regional partnerships'],
    ['10%', 'Working Capital', 'Buffer for 18-month runway'],
  ];
  funds.forEach((f, i) => {
    const y = 2.62 + i * 0.98;
    slide.addShape(pptx.ShapeType.rect, {
      x: 6.55, y, w: 6.5, h: 0.85,
      fill: { color: '0A1628' }, line: { color: '1A3058', pt: 1 }, rectRadius: 0.1
    });
    slide.addText(f[0], { x: 6.7, y: y + 0.08, w: 0.8, h: 0.65, fontSize: 18, bold: true, color: ORANGE, valign: 'middle' });
    slide.addText(f[1], { x: 7.55, y: y + 0.06, w: 4.5, h: 0.3, fontSize: 13, bold: true, color: WHITE });
    slide.addText(f[2], { x: 7.55, y: y + 0.37, w: 4.5, h: 0.35, fontSize: 10.5, color: '7A9ABF' });
  });

  // 12-month targets
  slide.addText('12-Month Targets', {
    x: 0.55, y: 4.42, w: 6, h: 0.38, fontSize: 14, bold: true, color: ORANGE
  });
  const targets = ['500+ active agent subscriptions', '50,000+ monthly active users', '€30K+ MRR by month 12'];
  targets.forEach((t, i) => {
    slide.addText('→  ' + t, {
      x: 0.55, y: 4.85 + i * 0.45, w: 6, h: 0.38,
      fontSize: 12, color: 'A0B4D0'
    });
  });

  // CTA
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.55, y: 6.35, w: W - 1.1, h: 0.85,
    fill: { color: BLUE }, line: { color: BLUE, pt: 0 }, rectRadius: 0.12
  });
  slide.addText('Ready to talk?   zanoin@gmail.com   ·   balkanestate.com', {
    x: 0.55, y: 6.35, w: W - 1.1, h: 0.85,
    fontSize: 16, bold: true, color: WHITE, align: 'center', valign: 'middle'
  });
}

// ─── Save ──────────────────────────────────────────────────────────────────────
pptx.writeFile({ fileName: OUT }).then(() => {
  const mb = (require('fs').statSync(OUT).size / 1024 / 1024).toFixed(1);
  console.log(`✅  pitch-deck.pptx → ${mb} MB  (9 slides)`);
}).catch(e => { console.error('❌', e.message); process.exit(1); });
