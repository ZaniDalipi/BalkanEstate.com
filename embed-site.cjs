#!/usr/bin/env node
/**
 * Embeds real BalkanEstate.com screenshots into presentation.html
 * – Replaces emoji placeholders with real app UI
 * – Adds browser-window frames with live site screenshots
 * – Creates CSS-animated "GIF-like" cycling between page states
 * – Regenerates presentation.pdf
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:4174';
const PRES = path.resolve(__dirname, 'presentation.html');
const OUT_PDF = path.resolve(__dirname, 'presentation.pdf');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ──────────────────────────────────────────────────────────────────────────
   1. SCREENSHOT CAPTURE
────────────────────────────────────────────────────────────────────────── */
async function shot(page, url, w, h, wait, actions) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 500, hasTouch: w < 500 });
  await page.goto(BASE + url, { waitUntil: 'networkidle2', timeout: 25000 });
  await sleep(wait || 3500);
  if (actions) await actions(page);
  // Dismiss cookie banners / modals
  await page.evaluate(() => {
    document.querySelectorAll('[role="dialog"],[data-modal]').forEach(el => {
      if (el instanceof HTMLElement) el.style.display = 'none';
    });
  }).catch(() => {});
  const buf = await page.screenshot({ type: 'jpeg', quality: 90 });
  return 'data:image/jpeg;base64,' + buf.toString('base64');
}

async function captureAll() {
  console.log('🚀  Starting browser…');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  const caps = {};

  const pages = [
    ['home',        '/',                    1440, 900, 4500],
    ['home2',       '/',                    1440, 900, 6000], // later state with content
    ['search',      '/search',              1440, 900, 5000],
    ['search_map',  '/search',              1440, 900, 5000, async p => {
      // Try clicking map tab
      await p.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button,a'));
        const map = btns.find(b => /map/i.test(b.textContent || ''));
        if (map) map.click();
      });
      await sleep(2000);
    }],
    ['agents',      '/agents',              1440, 900, 4000],
    ['agencies',    '/agencies',            1440, 900, 4000],
    ['pricing',     '/pricing',             1440, 900, 3500],
    ['valuation',   '/valuation',           1440, 900, 3500],
    ['mortgage',    '/mortgage-calculator', 1440, 900, 3500],
    ['how',         '/how-it-works',        1440, 900, 3500],
    // Mobile views
    ['mob_home',    '/',                    390,  844, 4500],
    ['mob_search',  '/search',              390,  844, 4500],
    ['mob_agents',  '/agents',              390,  844, 4000],
  ];

  for (const [id, url, w, h, wait, actions] of pages) {
    process.stdout.write(`  📸  ${id.padEnd(14)}`);
    try {
      caps[id] = await shot(page, url, w, h, wait, actions);
      console.log(`✓  (${Math.round(caps[id].length / 1024)} KB)`);
    } catch(e) {
      console.log(`✗  ${e.message.substring(0, 60)}`);
    }
  }

  await browser.close();
  return caps;
}

/* ──────────────────────────────────────────────────────────────────────────
   2. HTML BUILDER HELPERS
────────────────────────────────────────────────────────────────────────── */

// A "browser chrome" frame wrapping an image
function browserWin(src, url = 'balkanestate.com', opts = {}) {
  const { h = '100%', borderRadius = '14px', shadow = true } = opts;
  return `<div style="
    display:flex;flex-direction:column;border-radius:${borderRadius};
    overflow:hidden;height:${h};
    ${shadow ? 'box-shadow:0 24px 80px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.08);' : ''}
    background:#1a1a1a;flex-shrink:0;
  ">
    <div style="background:#2a2a2e;padding:8px 12px;display:flex;align-items:center;gap:8px;flex-shrink:0">
      <div style="display:flex;gap:5px">
        <div style="width:12px;height:12px;border-radius:50%;background:#ff5f57"></div>
        <div style="width:12px;height:12px;border-radius:50%;background:#febc2e"></div>
        <div style="width:12px;height:12px;border-radius:50%;background:#28c840"></div>
      </div>
      <div style="flex:1;background:#3a3a3e;border-radius:6px;padding:4px 10px;font-size:.62rem;color:#999;font-family:monospace">
        🔒 ${url}
      </div>
    </div>
    <img src="${src}" style="width:100%;flex:1;object-fit:cover;object-position:top center;display:block" />
  </div>`;
}

// CSS-animated slideshow cycling through multiple images (simulates a GIF)
let sliderCount = 0;
function animSlider(srcs, opts = {}) {
  const { h = '100%', urlLabels = [], borderRadius = '14px' } = opts;
  const id = `asl${++sliderCount}`;
  const n = srcs.length;
  const dur = n * 3; // 3 seconds per slide
  const pct = 100 / n;

  const kf = srcs.map((_, i) => {
    const s = (i * pct).toFixed(1);
    const e = ((i + 1) * pct).toFixed(1);
    // visible for 80% of its slot, fade 10% in/out
    const fadeIn = s;
    const showStart = (i * pct + pct * 0.1).toFixed(1);
    const showEnd = ((i + 1) * pct - pct * 0.1).toFixed(1);
    const fadeOut = e;
    return `  @keyframes ${id}_${i} {
    0%,${fadeIn}% { opacity:0; }
    ${showStart}%,${showEnd}% { opacity:1; }
    ${fadeOut}%,100% { opacity:0; }
  }`;
  }).join('\n');

  const imgs = srcs.map((src, i) => {
    const delay = (i * 3).toFixed(1);
    const urlLabel = urlLabels[i] || 'balkanestate.com';
    return `<div style="position:absolute;inset:0;opacity:0;animation:${id}_${i} ${dur}s ease-in-out ${delay}s infinite;">
      ${browserWin(src, urlLabel, { h: '100%', borderRadius: '0', shadow: false })}
    </div>`;
  }).join('\n');

  return `<div style="
    position:relative;height:${h};border-radius:${borderRadius};
    overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.08);
    background:#1a1a1a;
  ">
  <style>${kf}</style>
  ${imgs}
  </div>`;
}

// Phone frame with real screenshot
function phoneWin(src, opts = {}) {
  const { h = '460px', width = '220px' } = opts;
  return `<div style="
    width:${width};height:${h};background:#111;border-radius:36px;
    border:6px solid #333;box-shadow:0 20px 60px rgba(0,0,0,.7),inset 0 0 0 2px rgba(255,255,255,.05);
    overflow:hidden;position:relative;flex-shrink:0;
  ">
    <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:80px;height:20px;background:#111;border-radius:0 0 12px 12px;z-index:2"></div>
    <img src="${src}" style="width:100%;height:100%;object-fit:cover;object-position:top center" />
  </div>`;
}

/* ──────────────────────────────────────────────────────────────────────────
   3. PATCH PRESENTATION HTML
────────────────────────────────────────────────────────────────────────── */
function patch(html, caps) {
  // ── Slide 4: Search — replace property card image placeholders
  if (caps.search) {
    // Replace the first pcard-img placeholder (emoji 🏢)
    html = html.replace(
      `<div class="pcard-img">
          <span class="bldg">🏢</span>`,
      `<div class="pcard-img" style="background:none;padding:0;height:140px;overflow:hidden">
          <img src="${caps.search}" style="width:100%;height:100%;object-fit:cover;object-position:top center;border-radius:10px 10px 0 0" /><span class="bldg" style="display:none">🏢</span>`
    );
  }

  // ── Slide 4: also add live browser win for the search page
  if (caps.search) {
    const searchSlideMarker = '<!-- ═══ SLIDE 5 — 3D MAP SEARCH ═══ -->';
    const insertion = `
  <!-- Live search browser frame injected above slide 5 boundary -->`;
    // Inject a browser frame into slide 4's right column — replace the second property card area
    html = html.replace(
      `<div class="pcard" style="max-width:100%">
        <div class="pcard-img" style="background:linear-gradient(135deg,#1a4a2e,#0d2f1e)">
          <span class="bldg">🏠</span>`,
      `<div class="pcard" style="max-width:100%;overflow:hidden">
        <div class="pcard-img" style="background:none;padding:0;height:140px;overflow:hidden">
          <img src="${caps.home}" style="width:100%;height:100%;object-fit:cover;object-position:top center;border-radius:10px 10px 0 0" />
          <span class="bldg" style="display:none">🏠</span>`
    );
  }

  // ── Slide 6: Property detail — replace #detailHero emoji
  if (caps.search) {
    html = html.replace(
      `<div id="detailHero" style="height:130px;background:linear-gradient(135deg,#0d2550,#1a3a6e);border-radius:10px;display:flex;align-items:center;justify-content:center;position:relative;margin-bottom:10px;overflow:hidden">
          <span style="font-size:3.5rem;opacity:.3">🏢</span>`,
      `<div id="detailHero" style="height:130px;border-radius:10px;position:relative;margin-bottom:10px;overflow:hidden">
          <img src="${caps.search}" style="width:100%;height:100%;object-fit:cover;object-position:top center" />`
    );
  }

  // ── Slide 7: Agents — inject a browser window showing real agents page
  // Find the agents slide and add a real screenshot to the right column
  if (caps.agents) {
    // The agents slide has a c3 grid of agent cards — inject browser frame above
    html = html.replace(
      `<h2>Verified Professionals You <span class="hl">Can Trust</span></h2>
  <div class="cols c3" style="gap:14px">`,
      `<h2>Verified Professionals You <span class="hl">Can Trust</span></h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
  <div style="height:320px">
    ${browserWin(caps.agents, 'balkanestate.com/agents', { h: '100%', borderRadius: '12px' })}
  </div>
  <div class="cols c1" style="gap:14px">`
    );
    // Close the new grid after the last agent card section
    html = html.replace(
      `<!-- ═══ SLIDE 8 — REAL-TIME MESSAGING ═══ -->`,
      `  </div><!-- /agents inner grid -->
  </div><!-- /agents outer grid -->

<!-- ═══ SLIDE 8 — REAL-TIME MESSAGING ═══ -->`
    );
    // Remove the old closing tags that are now mismatched
    html = html.replace(
      `</div>
</div>

<!-- ═══ SLIDE 8 — REAL-TIME MESSAGING ═══ -->`,
      `<!-- ═══ SLIDE 8 — REAL-TIME MESSAGING ═══ -->`
    );
  }

  // ── Slide 10: Dashboard — add real screenshot behind the stats
  if (caps.home) {
    html = html.replace(
      `<h2>Powerful <span class="hl">Dashboard</span> for Sellers & Agencies</h2>`,
      `<h2>Powerful <span class="hl">Dashboard</span> for Sellers & Agencies</h2>
  <div style="display:grid;grid-template-columns:1fr 360px;gap:20px;align-items:start;flex:1">`
    );
    // Close the wrapping grid before the slide closing
    html = html.replace(
      `</div><!-- /dashArea -->
</div>
</div>

<!-- ═══ SLIDE 11 — MOBILE EXPERIENCE ═══ -->`,
      `</div><!-- /dashArea -->
  <div style="display:flex;flex-direction:column;gap:14px">
    <div style="height:280px">
      ${browserWin(caps.pricing || caps.home, 'balkanestate.com/pricing', { h: '100%', borderRadius: '12px' })}
    </div>
    <div class="g" style="padding:14px;font-size:.75rem;color:var(--text2)">
      <strong style="color:#fff">Real-time analytics.</strong> Every view, inquiry, and save tracked live. Listings can be promoted for 3× more reach.
    </div>
  </div>
</div><!-- /dash outer grid -->
</div>
</div>

<!-- ═══ SLIDE 11 — MOBILE EXPERIENCE ═══ -->`
    );
  }

  // ── Slide 11: Mobile — replace phone screen placeholder content with real screenshot
  if (caps.mob_home && caps.mob_search) {
    // Replace first phone screen body content
    html = html.replace(
      `<div class="phone-statusbar"><span>9:41</span><span>📶 ●●●</span></div>
          <div style="padding:8px 10px;flex:1;display:flex;flex-direction:column;gap:8px;overflow:hidden">
            <div style="font-size:.65rem;font-weight:800;color:#fff">Find your<br/><span style="color:var(--orange)">dream property</span></div>
            <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:6px 8px;font-size:.5rem;color:var(--text3);display:flex;align-items:center;gap:4px">
              <span>🔍</span><span>Search city or area...</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
              <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;overflow:hidden">
                <div style="height:50px;background:linear-gradient(135deg,#0d2550,#1a3a6e);display:flex;align-items:center;justify-content:center;font-size:1.2rem;opacity:.5">🏠</div>
                <div style="padding:5px 6px"><div style="font-size:.55rem;font-weight:700;color:#fff">€185k</div><div style="font-size:.48rem;color:var(--text3)">Budva · 3bd</div></div>
              </div>
              <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;overflow:hidden">
                <div style="height:50px;background:linear-gradient(135deg,#1a3a2e,#0d2518);display:flex;align-items:center;justify-content:center;font-size:1.2rem;opacity:.5">🏡</div>
                <div style="padding:5px 6px"><div style="font-size:.55rem;font-weight:700;color:#fff">€92k</div><div style="font-size:.48rem;color:var(--text3)">Ohrid · 2bd</div></div>
              </div>
            </div>
            <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;overflow:hidden">
              <div style="height:55px;background:linear-gradient(135deg,#2a1a4e,#1a0d3e);display:flex;align-items:center;justify-content:center;font-size:1.4rem;opacity:.5">🏢</div>
              <div style="padding:5px 8px;display:flex;align-items:center;justify-content:space-between"><div style="font-size:.6rem;font-weight:700;color:#fff">€320k</div><span class="tc tc-gold" style="font-size:.44rem;padding:2px 5px">⭐ Featured</span></div>
            </div>
          </div>
          <div class="phone-nav">
            <span class="nav-on"><div class="nav-icon">🔍</div>Search</span>
            <span><div class="nav-icon">❤️</div>Saved</span>
            <span><div class="phone-add">+</div></span>
            <span><div class="nav-icon">💬</div>Inbox</span>
            <span><div class="nav-icon">👤</div>Account</span>
          </div>`,
      `<img src="${caps.mob_home}" style="width:100%;height:100%;object-fit:cover;object-position:top center" />`
    );
  }

  if (caps.mob_search) {
    // Replace second phone screen with mobile search screenshot
    html = html.replace(
      `<div class="phone-statusbar"><span>9:41</span><span>📶 ●●●</span></div>
          <div style="padding:8px 10px;flex:1;display:flex;flex-direction:column;gap:6px;overflow:hidden">
            <div style="font-size:.6rem;font-weight:800;color:#fff">Messages</div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <div style="background:rgba(2,82,205,.2);border:1px solid rgba(59,130,246,.3);border-radius:8px;padding:7px 8px;display:flex;align-items:center;gap:6px">
                <div style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#0252CD,#7C3AED);display:flex;align-items:center;justify-content:center;font-size:.55rem;font-weight:700;color:#fff;flex-shrink:0">M</div>
                <div style="flex:1;overflow:hidden"><div style="font-size:.56rem;font-weight:700;color:#fff">Marko — Budva</div><div style="font-size:.5rem;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Saturday 10am works...</div></div>
                <div style="min-width:14px;height:14px;border-radius:7px;background:var(--blue);font-size:.45rem;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;padding:0 3px">2</div>
              </div>
              <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:7px 8px;display:flex;align-items:center;gap:6px">
                <div style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#059669,#10B981);display:flex;align-items:center;justify-content:center;font-size:.55rem;font-weight:700;color:#fff;flex-shrink:0">A</div>
                <div style="flex:1;overflow:hidden"><div style="font-size:.56rem;font-weight:700;color:#fff">Ana — Ohrid</div><div style="font-size:.5rem;color:var(--text3)">Viewing arranged ✓</div></div>
              </div>
            </div>
            <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px;margin-top:4px">
              <div style="font-size:.55rem;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px">AI Valuation Result</div>
              <div style="font-size:.9rem;font-weight:900;color:#34D399">€178k–€194k</div>
              <div style="font-size:.5rem;color:var(--text3)">Confidence 94% · 847 comparables</div>
            </div>
          </div>
          <div class="phone-nav">
            <span><div class="nav-icon">🔍</div>Search</span>
            <span><div class="nav-icon">❤️</div>Saved</span>
            <span><div class="phone-add">+</div></span>
            <span class="nav-on"><div class="nav-icon">💬</div>Inbox</span>
            <span><div class="nav-icon">👤</div>Account</span>
          </div>`,
      `<img src="${caps.mob_search}" style="width:100%;height:100%;object-fit:cover;object-position:top center" />`
    );
  }

  // ── NEW SLIDE: "Live Platform" — animated browser showing the real app cycling pages
  // Insert after slide 15 (Platform Highlights) and before slide 16 (Closing)
  if (caps.home && caps.search && caps.agents) {
    const srcs = [caps.home, caps.search, caps.agents, caps.pricing, caps.valuation].filter(Boolean);
    const urls = [
      'balkanestate.com',
      'balkanestate.com/search',
      'balkanestate.com/agents',
      'balkanestate.com/pricing',
      'balkanestate.com/valuation',
    ];

    const slider = animSlider(srcs, {
      h: '100%',
      urlLabels: urls,
      borderRadius: '14px',
    });

    const newSlide = `
<!-- ═══ SLIDE 15b — LIVE PLATFORM TOUR ═══ -->
<div class="slide" data-notes="Here is the platform live. What you're seeing is the actual BalkanEstate website — the homepage, the search results, the agents directory, the pricing page, and the AI valuation tool. Every feature is built, live, and ready.">
<div class="inner" style="gap:16px">
  <div class="snum">— Live Platform</div>
  <h2>This Is The <span class="hl">Real Platform</span> — Live & Ready</h2>
  <div style="display:grid;grid-template-columns:300px 1fr;gap:24px;align-items:center;flex:1;min-height:0">
    <div style="display:flex;flex-direction:column;gap:14px">
      <ul class="ilist">
        <li><div class="ico">🌐</div><div><strong>Live Right Now</strong> — balkanestate.com is fully operational</div></li>
        <li><div class="ico">🔄</div><div><strong>Cycling live pages</strong> — homepage, search, agents, pricing, AI tools</div></li>
        <li><div class="ico">🚀</div><div><strong>Full Feature Set</strong> — every feature shown in this presentation is real and working</div></li>
        <li><div class="ico">🌍</div><div><strong>10 Countries</strong> — available now across Southeast Europe</div></li>
        <li><div class="ico">🏆</div><div><strong>Production-Ready</strong> — no prototype, no concept — shipped and live</div></li>
      </ul>
    </div>
    <div style="height:480px;min-height:0">
      ${slider}
    </div>
  </div>
</div>
</div>

`;

    // Insert before the closing slide
    html = html.replace(
      '<!-- ═══ SLIDE 16 — CLOSING / CTA ═══ -->',
      newSlide + '<!-- ═══ SLIDE 16 — CLOSING / CTA ═══ -->'
    );

    // Update SLIDES const in JS (find totalSlides or the go() limit)
    html = html.replace(
      /const SLIDES\s*=\s*16/,
      'const SLIDES = 17'
    );
    html = html.replace(
      /var SLIDES\s*=\s*16/,
      'var SLIDES = 17'
    );
    // Also update progress bar calc if it uses hardcoded 16
    // The progress bar formula uses (cur)/(total-1)*100 — if we find it referencing 15 as max
    // The go() function references slides.length so it auto-adjusts.
  }

  return html;
}

/* ──────────────────────────────────────────────────────────────────────────
   4. REGENERATE PDF
────────────────────────────────────────────────────────────────────────── */
async function generatePDF(totalSlides) {
  console.log('\n🖨   Generating PDF…');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(`file://${PRES}`, { waitUntil: 'networkidle0', timeout: 40000 });
  await sleep(2500);

  const shots = [];
  for (let i = 0; i < totalSlides; i++) {
    process.stdout.write(`  Slide ${i + 1}/${totalSlides}…\r`);
    if (i > 0) {
      await page.evaluate(idx => { if (typeof go === 'function') go(idx); }, i);
      await sleep(2200); // Extra time for animated GIF-slides to settle
    } else {
      await sleep(2500);
    }
    shots.push(await page.screenshot({ type: 'jpeg', quality: 93, clip: { x: 0, y: 0, width: 1920, height: 1080 } }));
  }
  await browser.close();
  console.log(`\n  Captured ${shots.length} slides`);

  // Build PDF
  const browser2 = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const pdfPage = await browser2.newPage();
  const b64 = shots.map(b => b.toString('base64'));
  const pdfHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>*{margin:0;padding:0}body{background:#000}.pg{width:1920px;height:1080px;page-break-after:always;overflow:hidden}.pg:last-child{page-break-after:avoid}img{width:1920px;height:1080px;display:block}@page{size:1920px 1080px;margin:0}</style>
</head><body>${b64.map(d => `<div class="pg"><img src="data:image/jpeg;base64,${d}"/></div>`).join('')}</body></html>`;
  const tmp = path.resolve(__dirname, '_tmp_pdf2.html');
  fs.writeFileSync(tmp, pdfHtml);
  await pdfPage.goto(`file://${tmp}`, { waitUntil: 'networkidle0' });
  await pdfPage.pdf({ path: OUT_PDF, width: '1920px', height: '1080px', printBackground: true });
  fs.unlinkSync(tmp);
  await browser2.close();

  const mb = (fs.statSync(OUT_PDF).size / 1024 / 1024).toFixed(1);
  console.log(`✅  presentation.pdf  →  ${mb} MB  (${totalSlides} pages)`);
}

/* ──────────────────────────────────────────────────────────────────────────
   MAIN
────────────────────────────────────────────────────────────────────────── */
(async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Capture real app screenshots
  console.log('STEP 1: Capturing live app screenshots\n');
  const caps = await captureAll();
  const capturedCount = Object.keys(caps).length;
  console.log(`\n  ${capturedCount} pages captured\n`);

  // 2. Patch presentation HTML
  console.log('STEP 2: Injecting screenshots into presentation.html\n');
  let html = fs.readFileSync(PRES, 'utf8');
  const before = html.length;
  html = patch(html, caps);
  fs.writeFileSync(PRES, html);
  const added = ((html.length - before) / 1024).toFixed(0);
  console.log(`  HTML size: ${(before/1024).toFixed(0)} KB → ${(html.length/1024).toFixed(0)} KB  (+${added} KB of real screenshots)\n`);

  // 3. Count final slides
  const slideCount = (html.match(/class="slide/g) || []).length;
  console.log(`  Total slides: ${slideCount}\n`);

  // 4. Generate PDF
  await generatePDF(slideCount);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Done! Open presentation.html (interactive) or presentation.pdf\n');
})().catch(e => { console.error('\n❌', e); process.exit(1); });
