#!/usr/bin/env node
'use strict';
const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(__dirname, 'balkanestate-ai-deck.pptx');

// Brand
const BLUE   = '1A56C4';
const TEAL   = '0EA5A0';
const DARK   = '0D1B2A';
const SLATE  = '1E2D40';
const LIGHT  = 'F4F7FC';
const GRAY   = '5A6E85';
const WHITE  = 'FFFFFF';
const ACCENT = '38BDF8';

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33" × 7.5"

const W = 13.33, H = 7.5;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function bg(slide, dark) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: dark ? DARK : WHITE },
    line: { color: dark ? DARK : WHITE, pt: 0 }
  });
}

function topBar(slide, color) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 0.07,
    fill: { color: color || BLUE }, line: { color: color || BLUE, pt: 0 }
  });
}

function tag(slide, label, x, y, color) {
  const cw = Math.max(label.length * 0.105 + 0.4, 1.2);
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w: cw, h: 0.3,
    fill: { color: color || BLUE, transparency: 88 },
    line: { color: color || BLUE, pt: 1.5 }, rectRadius: 0.06
  });
  slide.addText(label, {
    x, y, w: cw, h: 0.3,
    fontSize: 9.5, bold: true, color: color || BLUE,
    align: 'center', valign: 'middle'
  });
}

function accent(slide, x, y, w, color) {
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w: w || 1.0, h: 0.045,
    fill: { color: color || TEAL }, line: { color: color || TEAL, pt: 0 }
  });
}

function card(slide, x, y, w, h, borderColor, fillColor) {
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w, h,
    fill: { color: fillColor || LIGHT },
    line: { color: borderColor || 'D0DCF0', pt: 1.5 },
    rectRadius: 0.12
  });
}

function leftBorder(slide, x, y, h, color) {
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w: 0.055, h,
    fill: { color: color || BLUE }, line: { color: color || BLUE, pt: 0 }, rectRadius: 0.03
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();

  // Dark gradient full bg
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { type: 'gradient', gradType: 'linear', angle: 135,
      stops: [{ position: 0, color: '08101E' }, { position: 100, color: '0D1F3C' }] },
    line: { pt: 0, color: '08101E' }
  });

  topBar(slide, BLUE);

  // Right teal glow panel (decorative)
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 8.5, y: -1.5, w: 7, h: 7,
    fill: { color: TEAL, transparency: 92 },
    line: { pt: 0, color: TEAL }
  });

  // Logo mark
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.7, y: 1.1, w: 0.7, h: 0.7,
    fill: { type: 'gradient', gradType: 'linear', angle: 135,
      stops: [{ position: 0, color: BLUE }, { position: 100, color: TEAL }] },
    line: { pt: 0, color: BLUE }, rectRadius: 0.1
  });
  slide.addText('BE', {
    x: 0.7, y: 1.1, w: 0.7, h: 0.7,
    fontSize: 20, bold: true, color: WHITE, align: 'center', valign: 'middle'
  });
  slide.addText('BalkanEstateAI', {
    x: 1.52, y: 1.16, w: 4, h: 0.58,
    fontSize: 18, bold: true, color: WHITE, align: 'left', valign: 'middle'
  });

  tag(slide, 'Investor Deck · 2026', 0.7, 2.1, TEAL);

  slide.addText('AI-Powered Real Estate\nfor the Western Balkans', {
    x: 0.7, y: 2.58, w: 8.5, h: 1.7,
    fontSize: 42, bold: true, color: WHITE, lineSpacingMultiple: 1.12, align: 'left'
  });

  accent(slide, 0.7, 4.36, 1.4, TEAL);

  slide.addText('Helping buyers, sellers, agents, and agencies discover\nproperties through intelligent search, interactive maps,\nand modern property management tools.', {
    x: 0.7, y: 4.55, w: 7.5, h: 1.1,
    fontSize: 15, color: '8EB4D8', lineSpacingMultiple: 1.5, align: 'left'
  });

  // Stat pills
  [['AI-First', 'Search'], ['10+', 'Countries'], ['Multi-Language', 'Platform']].forEach(([val, label], i) => {
    const sx = 0.7 + i * 2.8;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: sx, y: 5.85, w: 2.55, h: 0.75,
      fill: { color: WHITE, transparency: 92 },
      line: { color: TEAL, pt: 1.5 }, rectRadius: 0.1
    });
    slide.addText(val, { x: sx, y: 5.9, w: 2.55, h: 0.35, fontSize: 16, bold: true, color: TEAL, align: 'center' });
    slide.addText(label, { x: sx, y: 6.24, w: 2.55, h: 0.3, fontSize: 10, color: '6A9ABE', align: 'center' });
  });

  slide.addText('BalkanEstateAI.com', {
    x: 0.7, y: 6.9, w: 5, h: 0.32,
    fontSize: 11, color: '4A7A9E', italic: true, align: 'left'
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — THE PROBLEM
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  bg(slide, false);
  topBar(slide, BLUE);
  tag(slide, 'The Problem', 0.55, 0.28);

  slide.addText('The Real Estate Market in\nthe Western Balkans is Fragmented', {
    x: 0.55, y: 0.72, w: 10, h: 1.15,
    fontSize: 32, bold: true, color: DARK, lineSpacingMultiple: 1.15
  });
  accent(slide, 0.55, 1.93, 1.1);

  const problems = [
    { icon: '🗂️', text: 'Listings spread across multiple websites and social media platforms' },
    { icon: '⏳', text: 'Buyers spend hours searching through incomplete or outdated listings' },
    { icon: '📉', text: 'Agencies struggle to gain visibility and manage listings efficiently' },
    { icon: '🔍', text: 'Limited access to market insights and pricing transparency' },
    { icon: '🤖', text: 'Most platforms lack AI search, interactive maps, and advanced filtering' },
  ];

  problems.forEach((p, i) => {
    const y = 2.15 + i * 1.02;
    card(slide, 0.55, y, 12.2, 0.86, 'D8E6F8', 'F8FAFE');
    leftBorder(slide, 0.55, y, 0.86, BLUE);
    slide.addText(p.icon, { x: 0.75, y: y + 0.14, w: 0.52, h: 0.52, fontSize: 20, align: 'center' });
    slide.addText(p.text, { x: 1.38, y: y + 0.16, w: 11.1, h: 0.54, fontSize: 13.5, color: DARK, valign: 'middle' });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — OUR SOLUTION
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  bg(slide, false);
  topBar(slide, TEAL);
  tag(slide, 'Our Solution', 0.55, 0.28, TEAL);

  slide.addText('BalkanEstateAI — Built for\nthe Western Balkans', {
    x: 0.55, y: 0.72, w: 9, h: 1.15,
    fontSize: 32, bold: true, color: DARK, lineSpacingMultiple: 1.15
  });
  accent(slide, 0.55, 1.93, 1.1, TEAL);

  slide.addText('An AI-powered real estate platform making property search easier, faster, and more transparent.', {
    x: 0.55, y: 2.08, w: 12.2, h: 0.45,
    fontSize: 13.5, color: GRAY
  });

  const features = [
    { icon: '🤖', label: 'AI-Assisted\nProperty Search' },
    { icon: '🗺️', label: 'Interactive\nMap Discovery' },
    { icon: '🏢', label: 'Agency &\nAgent Profiles' },
    { icon: '📊', label: 'Analytics &\nPricing Insights' },
    { icon: '🔔', label: 'Saved Searches\n& Alerts' },
    { icon: '🚀', label: 'Property\nPromotion Tools' },
    { icon: '🌍', label: 'Multi-Language\nSupport' },
    { icon: '📱', label: 'Mobile-Friendly\nExperience' },
  ];

  features.forEach((f, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 0.45 + col * 3.2, y = 2.72 + row * 2.2;
    const colors = [['E8F1FF','C0D4F8',BLUE], ['E6FBF8','A0E8E0',TEAL], ['FFF3E6','FFD0A0','E07000'], ['F0EBF8','C9B8E8','7C3AED']];
    const [fill, border, ico] = colors[i % 4];
    card(slide, x, y, 3.0, 1.95, border, fill);
    slide.addText(f.icon, { x, y: y + 0.22, w: 3.0, h: 0.65, fontSize: 28, align: 'center' });
    slide.addText(f.label, { x, y: y + 0.92, w: 3.0, h: 0.85, fontSize: 12, bold: true, color: DARK, align: 'center', lineSpacingMultiple: 1.3 });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — PRODUCT
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  bg(slide, true);
  topBar(slide, BLUE);
  tag(slide, 'The Product', 0.55, 0.28, ACCENT);

  slide.addText('What Users Can Do', {
    x: 0.55, y: 0.72, w: 12, h: 0.72,
    fontSize: 34, bold: true, color: WHITE
  });
  accent(slide, 0.55, 1.5, 1.0, ACCENT);

  // Buyers column
  card(slide, 0.4, 1.75, 5.8, 4.3, '1E3A5A', SLATE);
  leftBorder(slide, 0.4, 1.75, 4.3, ACCENT);
  slide.addText('🏠  For Buyers', {
    x: 0.6, y: 1.9, w: 5.4, h: 0.45, fontSize: 15, bold: true, color: ACCENT
  });
  [
    'Search properties using AI',
    'Discover listings through interactive maps',
    'Save searches and receive alerts',
    'Compare property prices and get insights',
  ].forEach((t, i) => {
    slide.addText('→  ' + t, { x: 0.65, y: 2.5 + i * 0.62, w: 5.3, h: 0.52, fontSize: 12.5, color: 'B0CCE8' });
  });

  // Agents column
  card(slide, 6.55, 1.75, 5.8, 4.3, '1E3A5A', SLATE);
  leftBorder(slide, 6.55, 1.75, 4.3, TEAL);
  slide.addText('🏢  For Agents & Agencies', {
    x: 6.75, y: 1.9, w: 5.4, h: 0.45, fontSize: 15, bold: true, color: TEAL
  });
  [
    'Manage listings in one place',
    'Create professional agency pages',
    'Increase visibility through promotions',
    'Access analytics and performance tools',
  ].forEach((t, i) => {
    slide.addText('→  ' + t, { x: 6.8, y: 2.5 + i * 0.62, w: 5.3, h: 0.52, fontSize: 12.5, color: 'B0CCE8' });
  });

  // Countries strip
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 6.22, w: 11.95, h: 0.96,
    fill: { color: '08101E' }, line: { color: '1A3050', pt: 1.5 }, rectRadius: 0.1
  });
  slide.addText('🌍  Countries Supported:', {
    x: 0.65, y: 6.32, w: 2.6, h: 0.35, fontSize: 11, bold: true, color: TEAL
  });
  slide.addText('North Macedonia · Albania · Kosovo · Montenegro · Serbia · Bosnia & Herzegovina · Croatia · Slovenia · Bulgaria · Greece · Romania', {
    x: 3.15, y: 6.3, w: 8.9, h: 0.75, fontSize: 10.5, color: '8EB4D8', lineSpacingMultiple: 1.35
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — MARKET OPPORTUNITY
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  bg(slide, false);
  topBar(slide, BLUE);
  tag(slide, 'Market Opportunity', 0.55, 0.28);

  slide.addText('A Growing Market —\nUnderserved by Modern PropTech', {
    x: 0.55, y: 0.72, w: 12, h: 1.15,
    fontSize: 32, bold: true, color: DARK, lineSpacingMultiple: 1.15
  });
  accent(slide, 0.55, 1.93, 1.1);

  const drivers = [
    { icon: '🏗️', title: 'Urban Development', body: 'Rapid construction and urbanisation across all Balkan capitals' },
    { icon: '💰', title: 'Foreign Investment', body: 'Growing expat and diaspora interest in regional real estate' },
    { icon: '✈️', title: 'Tourism Expansion', body: 'Record tourism driving demand for short-term and holiday rentals' },
    { icon: '📲', title: 'Digital Demand', body: 'Increasing appetite for digital services across all demographics' },
  ];

  drivers.forEach((d, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.45 + col * 6.3, y = 2.18 + row * 1.88;
    card(slide, x, y, 6.05, 1.65, 'C8D8F0', 'F6F9FF');
    leftBorder(slide, x, y, 1.65, BLUE);
    slide.addText(d.icon, { x: x + 0.18, y: y + 0.22, w: 0.55, h: 0.55, fontSize: 22, align: 'center' });
    slide.addText(d.title, { x: x + 0.85, y: y + 0.2, w: 5.0, h: 0.4, fontSize: 14, bold: true, color: DARK });
    slide.addText(d.body, { x: x + 0.85, y: y + 0.62, w: 5.0, h: 0.75, fontSize: 12, color: GRAY, lineSpacingMultiple: 1.35 });
  });

  // Key insight
  card(slide, 0.45, 6.1, 12.4, 1.08, 'B0CFF0', 'EBF3FF');
  slide.addText('💡', { x: 0.65, y: 6.22, w: 0.5, h: 0.5, fontSize: 20, align: 'center' });
  slide.addText('Despite strong growth across the region, modern PropTech solutions remain significantly behind Western Europe — creating a clear first-mover opportunity for BalkanEstateAI.', {
    x: 1.28, y: 6.18, w: 11.35, h: 0.85, fontSize: 12.5, color: DARK, lineSpacingMultiple: 1.4
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — BUSINESS MODEL
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  bg(slide, false);
  topBar(slide, BLUE);
  tag(slide, 'Business Model', 0.55, 0.28);

  slide.addText('Multiple Revenue Streams.\nDesigned to Scale.', {
    x: 0.55, y: 0.72, w: 12, h: 1.15,
    fontSize: 32, bold: true, color: DARK, lineSpacingMultiple: 1.15
  });
  accent(slide, 0.55, 1.93, 1.1);

  const streams = [
    { icon: '👤', title: 'Agent Subscriptions', body: 'Monthly and annual plans for independent agents with listing quotas and analytics access', color: BLUE },
    { icon: '🏢', title: 'Agency Subscriptions', body: 'Team management, multi-agent dashboards, and enterprise-level listing volumes', color: TEAL },
    { icon: '⭐', title: 'Premium Promotions', body: 'Featured listings, highlighted placements, and priority positioning in search results', color: 'E07000' },
    { icon: '📣', title: 'Advertising & AI Tools', body: 'Banner advertising opportunities and future premium AI analytics for agencies', color: '7C3AED' },
  ];

  streams.forEach((s, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.45 + col * 6.35, y = 2.18 + row * 2.35;
    card(slide, x, y, 6.1, 2.1, 'C8D8F4', 'F8FAFF');
    slide.addShape(pptx.ShapeType.rect, {
      x, y, w: 6.1, h: 0.06, fill: { color: s.color }, line: { color: s.color, pt: 0 }, rectRadius: 0.03
    });
    slide.addText(s.icon, { x: x + 0.2, y: y + 0.22, w: 0.6, h: 0.6, fontSize: 24, align: 'center' });
    slide.addText(s.title, { x: x + 0.92, y: y + 0.2, w: 4.9, h: 0.45, fontSize: 14.5, bold: true, color: DARK });
    slide.addText(s.body, { x: x + 0.18, y: y + 0.72, w: 5.75, h: 1.1, fontSize: 12, color: GRAY, lineSpacingMultiple: 1.4 });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — TRACTION
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  bg(slide, true);
  topBar(slide, TEAL);
  tag(slide, 'Traction', 0.55, 0.28, TEAL);

  slide.addText('Current Progress', {
    x: 0.55, y: 0.72, w: 12, h: 0.65,
    fontSize: 34, bold: true, color: WHITE
  });
  accent(slide, 0.55, 1.44, 1.0, TEAL);

  slide.addText('Platform launched February 2026 · Early-stage startup focused on user acquisition and market validation.', {
    x: 0.55, y: 1.6, w: 12, h: 0.38, fontSize: 13, color: '7ABCD8'
  });

  const milestones = [
    { icon: '🚀', title: 'Platform Live', body: 'Functional web platform launched and publicly accessible as of February 2026' },
    { icon: '🌍', title: 'Multi-Country Support', body: 'Property listings and search active across multiple Western Balkan countries' },
    { icon: '🏢', title: 'Agency System', body: 'Agency and agent profile system fully built and operational' },
    { icon: '🗺️', title: 'Interactive Map', body: 'Interactive map-based property search implemented and live' },
    { icon: '📣', title: 'Active Outreach', body: 'Onboarding agencies through direct outreach and social media campaigns' },
    { icon: '🤝', title: 'Growing Network', body: 'Building a network of potential partners and agencies across the Balkans' },
  ];

  milestones.forEach((m, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.35 + col * 4.35, y = 2.2 + row * 2.5;
    card(slide, x, y, 4.15, 2.12, '1E3A5A', SLATE);
    leftBorder(slide, x, y, 2.12, TEAL);
    slide.addText(m.icon, { x: x + 0.18, y: y + 0.2, w: 0.52, h: 0.52, fontSize: 20, align: 'center' });
    slide.addText(m.title, { x: x + 0.82, y: y + 0.2, w: 3.2, h: 0.42, fontSize: 13.5, bold: true, color: WHITE });
    slide.addText(m.body, { x: x + 0.82, y: y + 0.65, w: 3.15, h: 1.1, fontSize: 11.5, color: '8BAFC8', lineSpacingMultiple: 1.38 });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — COMPETITIVE ADVANTAGE
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  bg(slide, false);
  topBar(slide, BLUE);
  tag(slide, 'Competitive Advantage', 0.55, 0.28);

  slide.addText('Why BalkanEstateAI?', {
    x: 0.55, y: 0.72, w: 12, h: 0.72,
    fontSize: 36, bold: true, color: DARK
  });
  accent(slide, 0.55, 1.5, 1.1);

  slide.addText('We are not another generic listing portal. We are the first AI-first platform built exclusively for the Western Balkans.', {
    x: 0.55, y: 1.65, w: 12, h: 0.45, fontSize: 13.5, color: GRAY
  });

  const advantages = [
    { icon: '🎯', title: 'Built for This Region', body: 'Designed specifically for Western Balkans — not adapted from a generic template' },
    { icon: '🤖', title: 'AI-First Experience', body: 'Natural language search and intelligent recommendations at the core' },
    { icon: '🌐', title: 'Multi-Language', body: 'Native language support across all target countries from day one' },
    { icon: '🗺️', title: 'Interactive Maps', body: 'Draw-zone and map-pin search — not just a list of results' },
    { icon: '🏢', title: 'Agency Tools', body: 'Dedicated tools for agencies — not an afterthought add-on' },
    { icon: '🌱', title: 'Regional Expansion', body: 'Architecture built to scale country by country across all of SEE' },
    { icon: '✨', title: 'Modern UX', body: 'Consumer-grade design vs. outdated traditional portals in the region' },
  ];

  advantages.forEach((a, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    if (i === 4) {
      // Row 2 has 3 items — center them
    }
    // Layout: row 0 → 4 cols, row 1 → 3 cols centered
    let x, y;
    if (row === 0) {
      x = 0.35 + col * 3.22;
      y = 2.35;
    } else {
      const offset = [0.35 + 0 * 3.22, 0.35 + 1.5 * 3.22, 0.35 + 3.0 * 3.22];
      x = offset[i - 4];
      y = 4.55;
    }

    if (i < 4 || i < 7) {
      card(slide, x, y, 3.05, 1.9, 'C8D8F4', 'F4F8FF');
      leftBorder(slide, x, y, 1.9, BLUE);
      slide.addText(a.icon, { x: x + 0.12, y: y + 0.18, w: 0.5, h: 0.5, fontSize: 20, align: 'center' });
      slide.addText(a.title, { x: x + 0.72, y: y + 0.18, w: 2.2, h: 0.42, fontSize: 12.5, bold: true, color: DARK });
      slide.addText(a.body, { x: x + 0.12, y: y + 0.68, w: 2.8, h: 0.9, fontSize: 11, color: GRAY, lineSpacingMultiple: 1.3 });
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — TEAM
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  bg(slide, false);
  topBar(slide, BLUE);
  tag(slide, 'The Team', 0.55, 0.28);

  slide.addText('Built by a Founder Who Ships', {
    x: 0.55, y: 0.72, w: 12, h: 0.72,
    fontSize: 36, bold: true, color: DARK
  });
  accent(slide, 0.55, 1.5, 1.0);

  // Large founder card
  card(slide, 1.8, 1.78, 9.7, 4.5, 'C0D4F4', 'F6F9FF');

  // Avatar
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 2.4, y: 2.18, w: 1.9, h: 1.9,
    fill: { type: 'gradient', gradType: 'linear', angle: 135,
      stops: [{ position: 0, color: BLUE }, { position: 100, color: TEAL }] },
    line: { color: BLUE, pt: 3 }
  });
  slide.addText('V', { x: 2.4, y: 2.18, w: 1.9, h: 1.9, fontSize: 48, bold: true, color: WHITE, align: 'center', valign: 'middle' });

  slide.addText('Valdet', { x: 4.55, y: 2.22, w: 6.5, h: 0.7, fontSize: 32, bold: true, color: DARK });
  slide.addText('Founder · BalkanEstateAI', { x: 4.55, y: 2.9, w: 6.5, h: 0.42, fontSize: 14.5, color: BLUE, bold: true });

  const skills = [
    'Android Developer & Software Engineer',
    'Mobile Architecture & AI Integrations',
    'Product Development & UX Design',
    'Western Balkans Domain Expertise',
  ];

  skills.forEach((s, i) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 4.55, y: 3.52 + i * 0.58, w: 6.55, h: 0.46,
      fill: { color: 'EBF2FF' }, line: { color: 'C0D4F4', pt: 1.2 }, rectRadius: 0.07
    });
    slide.addText('✓  ' + s, {
      x: 4.65, y: 3.54 + i * 0.58, w: 6.35, h: 0.42,
      fontSize: 12, color: BLUE, bold: true, valign: 'middle'
    });
  });

  slide.addText('Building BalkanEstateAI from the ground up — solving real estate discovery challenges across the Balkan region.', {
    x: 2.1, y: 4.4, w: 2.2, h: 1.5,
    fontSize: 11, color: GRAY, lineSpacingMultiple: 1.4, italic: true
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 1.8, y: 6.45, w: 9.7, h: 0.65,
    fill: { color: 'EEF4FF' }, line: { color: 'C0D4F4', pt: 1 }, rectRadius: 0.08
  });
  slide.addText('Currently seeking strategic partners, mentors, and investors to accelerate growth.', {
    x: 1.9, y: 6.48, w: 9.5, h: 0.58,
    fontSize: 12, color: DARK, align: 'center', valign: 'middle', italic: true
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — VISION & ASK
// ═══════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { type: 'gradient', gradType: 'linear', angle: 135,
      stops: [{ position: 0, color: '08101E' }, { position: 100, color: '0D2040' }] },
    line: { pt: 0, color: '08101E' }
  });

  topBar(slide, TEAL);
  tag(slide, 'Vision & Ask', 0.55, 0.28, TEAL);

  slide.addText('Become the Leading AI-Powered\nReal Estate Platform in the\nWestern Balkans', {
    x: 0.55, y: 0.72, w: 8.0, h: 2.0,
    fontSize: 30, bold: true, color: WHITE, lineSpacingMultiple: 1.18
  });

  accent(slide, 0.55, 2.8, 1.2, TEAL);

  // What we need column
  slide.addText('What We Need', {
    x: 0.55, y: 2.98, w: 5.5, h: 0.42, fontSize: 14, bold: true, color: TEAL
  });

  const needs = [
    { icon: '🧭', label: 'Strategic Mentorship', body: 'Guidance on scaling, fundraising, and market entry' },
    { icon: '🤝', label: 'Industry Partnerships', body: 'Agencies, developers, and real estate bodies across SEE' },
    { icon: '📣', label: 'Marketing Support', body: 'Help building brand awareness and growing user base' },
    { icon: '💰', label: 'Early-Stage Investment', body: 'To accelerate product, team, and regional expansion' },
    { icon: '🌐', label: 'Regional Networks', body: 'Access to key contacts across Balkan real estate markets' },
  ];

  needs.forEach((n, i) => {
    const y = 3.52 + i * 0.76;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.55, y, w: 5.5, h: 0.64,
      fill: { color: WHITE, transparency: 93 },
      line: { color: TEAL, pt: 1.2 }, rectRadius: 0.08
    });
    slide.addText(n.icon + '  ' + n.label, { x: 0.72, y: y + 0.04, w: 5.15, h: 0.28, fontSize: 12.5, bold: true, color: TEAL });
    slide.addText(n.body, { x: 0.72, y: y + 0.32, w: 5.15, h: 0.25, fontSize: 10.5, color: '8BAFC8' });
  });

  // Right panel — Building for
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.7, y: 2.82, w: 6.35, h: 4.3,
    fill: { color: '0A1A2E' }, line: { color: '1A3050', pt: 1.5 }, rectRadius: 0.14
  });
  slide.addText('We are building the infrastructure\nfor the next generation of real\nestate discovery in the Balkans.', {
    x: 7.0, y: 3.0, w: 5.8, h: 1.35,
    fontSize: 15, color: '8EB4D8', lineSpacingMultiple: 1.5, italic: true
  });

  [
    ['🌍', 'Regional Platform', '11 countries, 1 unified experience'],
    ['🤖', 'AI at the Core', 'Smarter search, better matches'],
    ['📈', 'Built to Scale', 'From MVP to market leader'],
  ].forEach(([icon, title, sub], i) => {
    const y = 4.55 + i * 0.88;
    slide.addText(icon, { x: 7.0, y, w: 0.5, h: 0.55, fontSize: 18, align: 'center' });
    slide.addText(title, { x: 7.62, y: y + 0.02, w: 5.1, h: 0.3, fontSize: 13, bold: true, color: WHITE });
    slide.addText(sub, { x: 7.62, y: y + 0.32, w: 5.1, h: 0.28, fontSize: 10.5, color: '5A88AA' });
  });

  // CTA bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 7.02, w: W - 0.8, h: 0.28,
    fill: { type: 'gradient', gradType: 'linear', angle: 90,
      stops: [{ position: 0, color: BLUE }, { position: 100, color: TEAL }] },
    line: { pt: 0, color: BLUE }, rectRadius: 0.05
  });
  slide.addText('BalkanEstateAI.com', {
    x: 0.4, y: 7.02, w: W - 0.8, h: 0.28,
    fontSize: 11, bold: true, color: WHITE, align: 'center', valign: 'middle'
  });
}

// ─── Save ────────────────────────────────────────────────────────────────────
pptx.writeFile({ fileName: OUT }).then(() => {
  const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
  console.log(`✅  balkanestate-ai-deck.pptx → ${mb} MB  (10 slides)`);
}).catch(e => { console.error('❌', e.message); process.exit(1); });
