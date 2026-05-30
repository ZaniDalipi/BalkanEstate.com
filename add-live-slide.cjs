#!/usr/bin/env node
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:4174';
const PRES = path.resolve(__dirname, 'presentation.html');
const OUT_PDF = path.resolve(__dirname, 'presentation.pdf');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function cap(page, url, w, h, wait) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 500, hasTouch: w < 500 });
  await page.goto(BASE + url, { waitUntil: 'networkidle2', timeout: 20000 });
  await sleep(wait || 4000);
  await page.evaluate(() => {
    document.querySelectorAll('[role="dialog"]').forEach(el => { if (el instanceof HTMLElement) el.style.display='none'; });
  }).catch(()=>{});
  const buf = await page.screenshot({ type: 'jpeg', quality: 90 });
  return 'data:image/jpeg;base64,' + buf.toString('base64');
}

let sid = 0;
function animSlider(srcs, urls) {
  const n = srcs.length, id = `ls${++sid}`, dur = n * 3;
  const kf = srcs.map((_, i) => {
    const a = (i / n * 100).toFixed(1), b = ((i + 0.1) / n * 100).toFixed(1);
    const c = ((i + 0.9) / n * 100).toFixed(1), d = ((i + 1) / n * 100).toFixed(1);
    return `@keyframes ${id}_${i}{0%,${a}%{opacity:0}${b}%,${c}%{opacity:1}${d}%,100%{opacity:0}}`;
  }).join('');

  const layers = srcs.map((src, i) => {
    const delay = (i * 3).toFixed(1);
    const url = urls[i] || 'balkanestate.com';
    return `<div style="position:absolute;inset:0;opacity:0;animation:${id}_${i} ${dur}s ease-in-out ${delay}s infinite;display:flex;flex-direction:column;background:#1a1a1a">
  <div style="background:#2a2a2e;padding:8px 12px;display:flex;align-items:center;gap:8px;flex-shrink:0">
    <div style="display:flex;gap:5px">
      <div style="width:12px;height:12px;border-radius:50%;background:#ff5f57"></div>
      <div style="width:12px;height:12px;border-radius:50%;background:#febc2e"></div>
      <div style="width:12px;height:12px;border-radius:50%;background:#28c840"></div>
    </div>
    <div style="flex:1;background:#3a3a3e;border-radius:6px;padding:4px 10px;font-size:.62rem;color:#999;font-family:monospace">🔒 ${url}</div>
  </div>
  <img src="${src}" style="width:100%;flex:1;object-fit:cover;object-position:top center;display:block"/>
</div>`;
  }).join('');

  return `<div style="position:relative;height:100%;border-radius:14px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.08)">
<style>${kf}</style>
${layers}
</div>`;
}

(async () => {
  console.log('Capturing pages…');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
  const page = await browser.newPage();

  const pages = [
    ['/', 1440, 900, 4500, 'balkanestate.com'],
    ['/search', 1440, 900, 5000, 'balkanestate.com/search'],
    ['/agents', 1440, 900, 4000, 'balkanestate.com/agents'],
    ['/pricing', 1440, 900, 3500, 'balkanestate.com/pricing'],
    ['/valuation', 1440, 900, 3500, 'balkanestate.com/valuation'],
    ['/mortgage-calculator', 1440, 900, 3500, 'balkanestate.com/mortgage-calculator'],
  ];

  const srcs = [], urls = [];
  for (const [url, w, h, wait, label] of pages) {
    process.stdout.write(`  ${label}… `);
    try {
      srcs.push(await cap(page, url, w, h, wait));
      urls.push(label);
      console.log('✓');
    } catch(e) { console.log('✗'); }
  }

  await browser.close();
  console.log(`Captured ${srcs.length} pages`);

  const slider = animSlider(srcs, urls);

  const newSlide = `
<!-- ═══ LIVE PLATFORM SLIDE ═══ -->
<div class="slide" data-notes="What you're seeing right now is the actual, live BalkanEstate.com platform — not a mockup, not a prototype. The homepage, search results, agent directory, pricing, and AI valuation tool — all cycling through in real time. This is built, operational, and serving users across ten countries today.">
<div class="inner" style="gap:16px">
  <div class="snum">— The Real Thing</div>
  <h2>This Is <span class="hl">BalkanEstate.com</span> — Live Right Now</h2>
  <div style="display:grid;grid-template-columns:280px 1fr;gap:24px;align-items:center;flex:1;min-height:0">
    <ul class="ilist">
      <li><div class="ico">🌐</div><div><strong>Fully Live</strong> — balkanestate.com is live and operational</div></li>
      <li><div class="ico">🔄</div><div><strong>Cycling through</strong> — home, search, agents, pricing, AI tools</div></li>
      <li><div class="ico">🚀</div><div><strong>Production Ready</strong> — every feature is real and working today</div></li>
      <li><div class="ico">🌍</div><div><strong>10 Countries</strong> — Southeast Europe, all native languages</div></li>
      <li><div class="ico">📱</div><div><strong>Works Everywhere</strong> — desktop, tablet, mobile — no download needed</div></li>
    </ul>
    <div style="height:500px">
      ${slider}
    </div>
  </div>
</div>
</div>

`;

  let html = fs.readFileSync(PRES, 'utf8');

  if (html.includes('<!-- ═══ LIVE PLATFORM SLIDE ═══ -->')) {
    console.log('Live slide already exists, skipping insertion');
  } else {
    html = html.replace('<!-- ═══ SLIDE 16 — CLOSING ═══ -->', newSlide + '<!-- ═══ SLIDE 16 — CLOSING ═══ -->');
    fs.writeFileSync(PRES, html);
    console.log('✓ Live Platform slide inserted');
  }

  const slideCount = (html.match(/class="slide/g) || []).length;
  console.log(`Total slides: ${slideCount}`);

  // Regenerate PDF
  console.log('\nGenerating PDF…');
  const b2 = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--force-device-scale-factor=1'] });
  const pg = await b2.newPage();
  await pg.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await pg.goto(`file://${PRES}`, { waitUntil: 'networkidle0', timeout: 40000 });
  await sleep(2500);

  const shots = [];
  for (let i = 0; i < slideCount; i++) {
    process.stdout.write(`  Slide ${i+1}/${slideCount}\r`);
    if (i > 0) { await pg.evaluate(idx => { if(typeof go==='function') go(idx); }, i); }
    await sleep(2500);
    shots.push(await pg.screenshot({ type: 'jpeg', quality: 93, clip: { x:0, y:0, width:1920, height:1080 } }));
  }
  await b2.close();
  console.log(`\n  ${shots.length} screenshots taken`);

  const b3 = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
  const pp = await b3.newPage();
  const b64 = shots.map(b => b.toString('base64'));
  const tmp = path.resolve(__dirname, '_tmp3.html');
  fs.writeFileSync(tmp, `<!DOCTYPE html><html><head><style>*{margin:0;padding:0}body{background:#000}.pg{width:1920px;height:1080px;page-break-after:always;overflow:hidden}.pg:last-child{page-break-after:avoid}img{width:1920px;height:1080px;display:block}@page{size:1920px 1080px;margin:0}</style></head><body>${b64.map(d=>`<div class="pg"><img src="data:image/jpeg;base64,${d}"/></div>`).join('')}</body></html>`);
  await pp.goto(`file://${tmp}`, { waitUntil: 'networkidle0' });
  await pp.pdf({ path: OUT_PDF, width: '1920px', height: '1080px', printBackground: true });
  fs.unlinkSync(tmp);
  await b3.close();

  const mb = (fs.statSync(OUT_PDF).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅  presentation.pdf → ${mb} MB  (${slideCount} pages)`);
  console.log('✅  presentation.html → updated with live platform slide');
})().catch(e => { console.error('❌', e.message); process.exit(1); });
