#!/usr/bin/env node
/**
 * Capture real BalkanEstate.com app screenshots and embed them
 * into the presentation HTML as base64 data URIs.
 * Then regenerate presentation.pdf.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:4174';
const PRES = path.resolve(__dirname, 'presentation.html');
const OUT_PDF = path.resolve(__dirname, 'presentation.pdf');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Pages to capture and their config
const CAPTURES = [
  { id: 'cap_home',    url: '/',                    label: 'Homepage',          w: 1440, h: 900,  wait: 4000, scrollY: 0 },
  { id: 'cap_search',  url: '/search',              label: 'Search',            w: 1440, h: 900,  wait: 4000 },
  { id: 'cap_agents',  url: '/agents',              label: 'Agents',            w: 1440, h: 900,  wait: 4000 },
  { id: 'cap_pricing', url: '/pricing',             label: 'Pricing',           w: 1440, h: 900,  wait: 3000 },
  { id: 'cap_valuation', url: '/valuation',         label: 'AI Valuation',      w: 1440, h: 900,  wait: 3000 },
  { id: 'cap_mortgage', url: '/mortgage-calculator',label: 'Mortgage Calc',     w: 1440, h: 900,  wait: 3000 },
  { id: 'cap_how',     url: '/how-it-works',        label: 'How It Works',      w: 1440, h: 900,  wait: 3000 },
  { id: 'cap_agencies', url: '/agencies',           label: 'Agencies',          w: 1440, h: 900,  wait: 3000 },
  // Mobile viewport
  { id: 'cap_mob_home', url: '/',                   label: 'Mobile Home',       w: 390,  h: 844,  wait: 4000 },
  { id: 'cap_mob_search', url: '/search',           label: 'Mobile Search',     w: 390,  h: 844,  wait: 4000 },
];

async function captureAll(browser) {
  const results = {};

  for (const cap of CAPTURES) {
    console.log(`📸  Capturing ${cap.label}…`);
    const page = await browser.newPage();
    await page.setViewport({ width: cap.w, height: cap.h, deviceScaleFactor: 1.5,
      isMobile: cap.w < 500, hasTouch: cap.w < 500 });

    try {
      await page.goto(BASE + cap.url, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(cap.wait || 3000);

      // Dismiss any modals
      await page.evaluate(() => {
        document.querySelectorAll('[data-modal], .modal, [role="dialog"]').forEach(el => {
          if (el instanceof HTMLElement) el.style.display = 'none';
        });
        // Close cookie banners
        const btns = Array.from(document.querySelectorAll('button'));
        const accept = btns.find(b => /accept|ok|agree/i.test(b.textContent || ''));
        if (accept) accept.click();
      });
      await sleep(500);

      const buf = await page.screenshot({ type: 'jpeg', quality: 88 });
      results[cap.id] = buf.toString('base64');
      console.log(`   ✓ ${cap.label} (${(buf.length/1024).toFixed(0)} KB)`);
    } catch (e) {
      console.log(`   ⚠  ${cap.label} failed: ${e.message}`);
    }
    await page.close();
  }

  return results;
}

// Build the multi-frame "animated" GIF-like CSS animation HTML snippet
// Shows 3 frames cycling: home → search → property card
function buildAnimSlider(frames) {
  // frames: array of base64 jpeg strings
  const dur = frames.length * 2.5; // seconds total
  const pct = 100 / frames.length;
  const keyframes = frames.map((_, i) => {
    const start = (i * pct).toFixed(1);
    const end = ((i + 1) * pct - 0.1).toFixed(1);
    return `${start}%,${end}% { opacity:${i === 0 ? 1 : 0}; }`;
  });
  // Build per-image keyframes
  const kfBlocks = frames.map((_, i) => {
    const delay = (i * 2.5).toFixed(1);
    return `@keyframes slide${i} {
      0%,${((i / frames.length) * 100).toFixed(0)}% { opacity: 0; }
      ${((i / frames.length) * 100 + 1).toFixed(0)}%,${(((i + 1) / frames.length) * 100 - 1).toFixed(0)}% { opacity: 1; }
      ${(((i + 1) / frames.length) * 100).toFixed(0)}%,100% { opacity: 0; }
    }`;
  });
  const imgs = frames.map((b64, i) => {
    const delay = (i * 2.5).toFixed(1);
    return `<img src="data:image/jpeg;base64,${b64}" style="
      position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:12px;
      opacity:0;animation:slide${i} ${dur}s ease-in-out ${delay}s infinite;" />`;
  }).join('\n');

  return `<div style="position:relative;width:100%;height:100%;overflow:hidden;border-radius:12px;">
  <style>${kfBlocks.join('\n')}</style>
  ${imgs}
  </div>`;
}

// Inject a real screenshot as background of a given element
function injectBg(html, selector_comment, b64, label) {
  // We'll use placeholder markers in the HTML
  return html.replace(
    new RegExp(`/\\* INJECT:${label} \\*/`),
    `background-image:url("data:image/jpeg;base64,${b64}");background-size:cover;background-position:center top;`
  );
}

async function main() {
  console.log('🚀  Starting BalkanEstate screenshot capture…\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const caps = await captureAll(browser);
  await browser.close();

  const captured = Object.keys(caps).length;
  console.log(`\n✅  Captured ${captured}/${CAPTURES.length} screenshots\n`);

  // --- Update presentation.html with real screenshots ---
  console.log('💉  Injecting screenshots into presentation.html…');

  let html = fs.readFileSync(PRES, 'utf8');
  const origLen = html.length;

  // Helper: replace a placeholder comment marker with a style attribute value
  function embed(label, b64, type = 'jpeg') {
    const marker = `/* SCREENSHOT:${label} */`;
    if (html.includes(marker)) {
      html = html.replace(marker, `url("data:image/${type};base64,${b64}")`);
      console.log(`   ✓  Injected ${label}`);
    }
  }

  // Check which markers exist and which caps we have
  CAPTURES.forEach(cap => {
    if (caps[cap.id]) embed(cap.id, caps[cap.id]);
  });

  // If we have home, search, agents — build the animated slider for relevant slides
  const sliderFrames = [caps.cap_home, caps.cap_search, caps.cap_agents].filter(Boolean);
  if (sliderFrames.length > 0) {
    const sliderHTML = buildAnimSlider(sliderFrames);
    const marker = '<!-- SCREENSHOT_SLIDER -->';
    if (html.includes(marker)) {
      html = html.replace(marker, sliderHTML);
      console.log('   ✓  Injected animated slider');
    }
  }

  // Write updated presentation
  fs.writeFileSync(PRES, html);
  console.log(`   HTML: ${origLen} → ${html.length} chars (+${((html.length-origLen)/1024).toFixed(0)} KB of screenshot data)\n`);

  // --- Regenerate PDF ---
  console.log('🖨   Regenerating presentation.pdf…');
  const browser2 = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1'],
  });

  const page = await browser2.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(`file://${PRES}`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2000);

  const SLIDES = 16;
  const shots = [];

  for (let i = 0; i < SLIDES; i++) {
    process.stdout.write(`📄  Slide ${i+1}/${SLIDES}…\r`);
    if (i > 0) {
      await page.evaluate(idx => { if (typeof go === 'function') go(idx); }, i);
      await sleep(1800);
    } else {
      await sleep(2000);
    }
    shots.push(await page.screenshot({ type: 'jpeg', quality: 92, clip: { x:0, y:0, width:1920, height:1080 } }));
  }
  await browser2.close();

  console.log('\n📦  Building PDF…');
  const browser3 = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const pdfPage = await browser3.newPage();
  const b64shots = shots.map(b => b.toString('base64'));
  const pdfHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>*{margin:0;padding:0}body{background:#000}.pg{width:1920px;height:1080px;page-break-after:always;overflow:hidden}.pg:last-child{page-break-after:avoid}img{width:1920px;height:1080px;display:block}@page{size:1920px 1080px;margin:0}</style>
</head><body>${b64shots.map(d=>`<div class="pg"><img src="data:image/jpeg;base64,${d}"/></div>`).join('')}</body></html>`;

  const tmp = path.resolve(__dirname, '_tmp_pdf.html');
  fs.writeFileSync(tmp, pdfHtml);
  await pdfPage.goto(`file://${tmp}`, { waitUntil: 'networkidle0' });
  await pdfPage.pdf({ path: OUT_PDF, width: '1920px', height: '1080px', printBackground: true });
  fs.unlinkSync(tmp);
  await browser3.close();

  const mb = (fs.statSync(OUT_PDF).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅  presentation.pdf  →  ${mb} MB`);
  console.log(`✅  presentation.html →  updated with real screenshots`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
