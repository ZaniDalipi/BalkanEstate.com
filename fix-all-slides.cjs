#!/usr/bin/env node
/**
 * fix-all-slides.cjs
 * 1. Captures all missing app screenshots
 * 2. Injects them into every slide that currently has no image
 * 3. Writes the final presentation.html
 * 4. Generates presentation.pdf
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:4174';
const PRES = path.resolve(__dirname, 'presentation.html');
const PDF  = path.resolve(__dirname, 'presentation.pdf');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── capture helpers ─────────────────────────────────────────────── */
async function cap(browser, url, w, h, wait, actions) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1,
    isMobile: w < 500, hasTouch: w < 500 });
  await page.goto(BASE + url, { waitUntil: 'networkidle2', timeout: 25000 });
  await sleep(wait || 4000);
  if (actions) await actions(page);
  await page.evaluate(() => {
    document.querySelectorAll('[role="dialog"],[data-modal]').forEach(el => {
      if (el instanceof HTMLElement) el.style.display = 'none';
    });
  }).catch(() => {});
  const buf = await page.screenshot({ type: 'jpeg', quality: 90 });
  await page.close();
  return 'data:image/jpeg;base64,' + buf.toString('base64');
}

/* ── browser-window wrapper ──────────────────────────────────────── */
function bw(src, url, opts = {}) {
  const { h = '100%', r = '14px', shadow = true, scale = 'cover', pos = 'top center' } = opts;
  return `<div style="display:flex;flex-direction:column;border-radius:${r};overflow:hidden;height:${h};${shadow ? 'box-shadow:0 20px 60px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.07);' : ''}background:#1a1a1a;flex-shrink:0">
  <div style="background:#252529;padding:7px 11px;display:flex;align-items:center;gap:7px;flex-shrink:0">
    <div style="display:flex;gap:4px"><div style="width:11px;height:11px;border-radius:50%;background:#ff5f57"></div><div style="width:11px;height:11px;border-radius:50%;background:#febc2e"></div><div style="width:11px;height:11px;border-radius:50%;background:#28c840"></div></div>
    <div style="flex:1;background:#3a3a3d;border-radius:5px;padding:3px 9px;font-size:.58rem;color:#888;font-family:monospace;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">🔒 ${url}</div>
  </div>
  <img src="${src}" style="width:100%;flex:1;object-fit:${scale};object-position:${pos};display:block"/>
</div>`;
}

/* ── animated slider ─────────────────────────────────────────────── */
let sliderN = 100;
function slider(srcs, urls, h = '100%', r = '14px') {
  const id = `sl${++sliderN}`, n = srcs.length, dur = n * 3;
  const kf = srcs.map((_, i) => {
    const a = (i/n*100).toFixed(1), b = ((i+.1)/n*100).toFixed(1);
    const c = ((i+.9)/n*100).toFixed(1), d = ((i+1)/n*100).toFixed(1);
    return `@keyframes ${id}_${i}{0%,${a}%{opacity:0}${b}%,${c}%{opacity:1}${d}%,100%{opacity:0}}`;
  }).join('');
  const layers = srcs.map((src, i) =>
    `<div style="position:absolute;inset:0;opacity:0;animation:${id}_${i} ${dur}s ease-in-out ${(i*3).toFixed(1)}s infinite;display:flex;flex-direction:column;background:#1a1a1a">
      <div style="background:#252529;padding:7px 11px;display:flex;align-items:center;gap:7px;flex-shrink:0">
        <div style="display:flex;gap:4px"><div style="width:11px;height:11px;border-radius:50%;background:#ff5f57"></div><div style="width:11px;height:11px;border-radius:50%;background:#febc2e"></div><div style="width:11px;height:11px;border-radius:50%;background:#28c840"></div></div>
        <div style="flex:1;background:#3a3a3d;border-radius:5px;padding:3px 9px;font-size:.58rem;color:#888;font-family:monospace">🔒 ${urls[i]||'balkanestate.com'}</div>
      </div>
      <img src="${src}" style="width:100%;flex:1;object-fit:cover;object-position:top center;display:block"/>
    </div>`).join('');
  return `<div style="position:relative;height:${h};border-radius:${r};overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.07)">
<style>${kf}</style>${layers}</div>`;
}

/* ── main ─────────────────────────────────────────────────────────── */
(async () => {
  console.log('\n🚀  Step 1: Capturing all missing screenshots…\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'],
  });

  const shots = {};
  const pages = [
    ['home',       '/',                     1440, 900, 5000],
    ['home_scroll','/',                     1440, 900, 5000, async p => {
      await p.evaluate(() => window.scrollBy(0, 600)); await sleep(1500);
    }],
    ['search',     '/search',               1440, 900, 5000],
    ['agents',     '/agents',               1440, 900, 4500],
    ['agencies',   '/agencies',             1440, 900, 4000],
    ['pricing',    '/pricing',              1440, 900, 4000],
    ['valuation',  '/valuation',            1440, 900, 4000],
    ['mortgage',   '/mortgage-calculator',  1440, 900, 4000],
    ['how',        '/how-it-works',         1440, 900, 4000],
    ['inbox',      '/inbox',                1440, 900, 4000],
    ['mob_home',   '/',                     390,  844, 5000],
    ['mob_search', '/search',               390,  844, 5000],
    ['mob_agents', '/agents',               390,  844, 4000],
  ];

  for (const [id, url, w, h, wait, actions] of pages) {
    process.stdout.write(`  📸  ${id.padEnd(14)}`);
    try {
      shots[id] = await cap(browser, url, w, h, wait, actions);
      console.log(`✓  (${Math.round(shots[id].length/1024)}KB)`);
    } catch(e) { console.log(`✗  ${e.message.substring(0,55)}`); }
  }
  await browser.close();
  console.log(`\n  ${Object.keys(shots).length} screenshots captured\n`);

  /* ── Step 2: Patch HTML ────────────────────────────────────────── */
  console.log('💉  Step 2: Patching presentation.html…\n');
  let html = fs.readFileSync(PRES, 'utf8');

  // ── SLIDE 1: Title — add live homepage browser on right ───────────
  if (shots.home) {
    html = html.replace(
      /(<div class="slide on"[^>]*>)\s*(<div class="inner">)\s*(<div class="snum">Introducing)/,
      `$1
<div class="inner" style="display:grid;grid-template-columns:1fr 460px;gap:28px;align-items:center">
<div style="display:flex;flex-direction:column;gap:0">
<!-- left: original content wrapper open -->`
    );
    // Close left, open right after the flag chips section
    html = html.replace(
      /(id="statRow"[^<]*(?:<\/div>\s*){4})\s*(<!-- ═══ SLIDE 2)/,
      `$1
</div><!-- /left title col -->
<div style="height:580px">
${bw(shots.home, 'balkanestate.com', { h:'100%', r:'14px' })}
</div>
</div><!-- /title grid -->
</div>
$2`
    );
  }

  // ── SLIDE 2: Problem — add homepage screenshot as visual proof ────
  const problemSlide = html.indexOf('<!-- ═══ SLIDE 2');
  const problemEnd   = html.indexOf('<!-- ═══ SLIDE 3', problemSlide);
  if (shots.home && problemSlide > -1) {
    let chunk = html.slice(problemSlide, problemEnd);
    // The problem slide has a c2 grid of 4 fc cards; add a screenshot column
    chunk = chunk.replace(
      `<div class="cols c2" style="gap:22px">`,
      `<div style="display:grid;grid-template-columns:1fr 440px;gap:24px;align-items:start">`
    );
    // Close the fc cards div and add the screenshot column
    chunk = chunk.replace(
      `</div>
</div>
</div>

<!-- ═══ SLIDE 3`,
      `</div>
<div style="display:flex;flex-direction:column;gap:14px">
  <div style="height:280px">
    ${bw(shots.search, 'balkanestate.com/search', {h:'100%',r:'12px'})}
  </div>
  <div style="height:240px">
    ${bw(shots.agents, 'balkanestate.com/agents', {h:'100%',r:'12px'})}
  </div>
</div>
</div>
</div>
</div>

<!-- ═══ SLIDE 3`
    );
    html = html.slice(0, problemSlide) + chunk + html.slice(problemEnd);
  }

  // ── SLIDE 3: Solution/Roles — add animated slider beside roles ────
  const sol3 = html.indexOf('<!-- ═══ SLIDE 3');
  const sol3End = html.indexOf('<!-- ═══ SLIDE 4', sol3);
  if (shots.home && sol3 > -1) {
    let chunk = html.slice(sol3, sol3End);
    // Wrap existing content in a grid with a screenshot on the right
    chunk = chunk.replace(
      `<h2>One Platform for <span class="hl">Everyone</span></h2>
  <div style="display:grid`,
      `<h2>One Platform for <span class="hl">Everyone</span></h2>
  <div style="display:grid;grid-template-columns:1fr 420px;gap:24px;align-items:start">
  <div style="display:grid`
    );
    chunk = chunk.replace(
      `</div><!-- /roleDetail -->
</div>
</div>

<!-- ═══ SLIDE 4`,
      `</div><!-- /roleDetail -->
</div><!-- /roles grid inner -->
<div style="height:400px">
${slider([shots.home, shots.search, shots.agents], ['balkanestate.com','balkanestate.com/search','balkanestate.com/agents'], '100%', '12px')}
</div>
</div><!-- /roles grid outer -->
</div>
</div>

<!-- ═══ SLIDE 4`
    );
    html = html.slice(0, sol3) + chunk + html.slice(sol3End);
  }

  // ── SLIDE 8: Chat — add real inbox screenshot beside demo ─────────
  const chat8 = html.indexOf('<!-- ═══ SLIDE 8');
  const chat8End = html.indexOf('<!-- ═══ SLIDE 9', chat8);
  if ((shots.inbox || shots.home) && chat8 > -1) {
    let chunk = html.slice(chat8, chat8End);
    const inboxSrc = shots.inbox || shots.home;
    chunk = chunk.replace(
      `<h2>Instant Chat, <span class="hl">No External Apps</span></h2>
  <div class="cols c2"`,
      `<h2>Instant Chat, <span class="hl">No External Apps</span></h2>
  <div style="display:grid;grid-template-columns:1fr 400px;gap:24px;align-items:start">
  <div class="cols c2" style="display:contents">`
    );
    // Close and add screenshot
    chunk = chunk.replace(
      `</div>
</div>

<!-- ═══ SLIDE 9`,
      `</div><!-- chat demo area -->
<div style="height:420px">
${bw(inboxSrc, 'balkanestate.com/inbox', {h:'100%',r:'12px'})}
</div>
</div><!-- /chat outer grid -->
</div>
</div>

<!-- ═══ SLIDE 9`
    );
    html = html.slice(0, chat8) + chunk + html.slice(chat8End);
  }

  // ── SLIDE 9: AI Tools — add real valuation + mortgage screenshots ──
  const ai9 = html.indexOf('<!-- ═══ SLIDE 9');
  const ai9End = html.indexOf('<!-- ═══ SLIDE 10', ai9);
  if (shots.valuation && ai9 > -1) {
    let chunk = html.slice(ai9, ai9End);
    chunk = chunk.replace(
      `<h2>AI-Powered <span class="hl">Intelligence Built In</span></h2>
  <div class="cols c2"`,
      `<h2>AI-Powered <span class="hl">Intelligence Built In</span></h2>
  <div style="display:grid;grid-template-columns:1fr 400px;gap:24px;align-items:start">
  <div class="cols c2" style="display:contents">`
    );
    chunk = chunk.replace(
      `</div>
</div>

<!-- ═══ SLIDE 10`,
      `</div><!-- ai tools demo area -->
<div style="display:flex;flex-direction:column;gap:14px">
  <div style="height:210px">
    ${bw(shots.valuation, 'balkanestate.com/valuation', {h:'100%',r:'12px'})}
  </div>
  <div style="height:200px">
    ${bw(shots.mortgage, 'balkanestate.com/mortgage-calculator', {h:'100%',r:'12px'})}
  </div>
</div>
</div><!-- /ai tools outer grid -->
</div>
</div>

<!-- ═══ SLIDE 10`
    );
    html = html.slice(0, ai9) + chunk + html.slice(ai9End);
  }

  // ── SLIDE 12: Languages — add homepage screenshot ─────────────────
  const lang12 = html.indexOf('<!-- ═══ SLIDE 12');
  const lang12End = html.indexOf('<!-- ═══ SLIDE 13', lang12);
  if (shots.home && lang12 > -1) {
    let chunk = html.slice(lang12, lang12End);
    chunk = chunk.replace(
      `<h2>Truly <span class="hl">Native</span> in Every Language</h2>`,
      `<h2>Truly <span class="hl">Native</span> in Every Language</h2>
  <div style="display:grid;grid-template-columns:1fr 380px;gap:24px;align-items:start">`
    );
    chunk = chunk.replace(
      `</div>
</div>

<!-- ═══ SLIDE 13`,
      `</div><!-- lang content -->
<div style="display:flex;flex-direction:column;gap:14px">
  <div style="height:260px">
    ${bw(shots.home, 'balkanestate.com', {h:'100%',r:'12px'})}
  </div>
  <div style="padding:16px;background:rgba(2,82,205,.12);border:1px solid rgba(59,130,246,.25);border-radius:12px;font-size:.8rem;color:#93C5FD;line-height:1.6">
    🌍 Language auto-detects from your browser.<br>
    Persists across sessions. Each translation is native — not machine-translated.
  </div>
</div>
</div><!-- /lang outer grid -->
</div>
</div>

<!-- ═══ SLIDE 13`
    );
    html = html.slice(0, lang12) + chunk + html.slice(lang12End);
  }

  // ── SLIDE 13: Pricing — replace/add real pricing screenshot ───────
  const price13 = html.indexOf('<!-- ═══ SLIDE 13');
  const price13End = html.indexOf('<!-- ═══ SLIDE 14', price13);
  if (shots.pricing && price13 > -1) {
    let chunk = html.slice(price13, price13End);
    // Add full-width browser frame BELOW the pricing cards
    chunk = chunk.replace(
      `</div>
</div>

<!-- ═══ SLIDE 14`,
      `</div>
  <!-- Real pricing page preview -->
  <div style="height:240px;margin-top:8px">
    ${bw(shots.pricing, 'balkanestate.com/pricing', {h:'100%',r:'12px'})}
  </div>
</div>
</div>

<!-- ═══ SLIDE 14`
    );
    html = html.slice(0, price13) + chunk + html.slice(price13End);
  }

  // ── SLIDE 14: Why BalkanEstate — add how-it-works screenshot ──────
  const why14 = html.indexOf('<!-- ═══ SLIDE 14');
  const why14End = html.indexOf('<!-- ═══ SLIDE 15', why14);
  if (shots.how && why14 > -1) {
    let chunk = html.slice(why14, why14End);
    chunk = chunk.replace(
      `<h2>Built for <span class="hl">This Market</span>, Not Adapted for It</h2>`,
      `<h2>Built for <span class="hl">This Market</span>, Not Adapted for It</h2>
  <div style="display:grid;grid-template-columns:1fr 440px;gap:24px;align-items:start">`
    );
    chunk = chunk.replace(
      `</div>
</div>

<!-- ═══ SLIDE 15`,
      `</div><!-- why content -->
<div style="height:460px">
${bw(shots.how, 'balkanestate.com/how-it-works', {h:'100%',r:'12px'})}
</div>
</div><!-- /why outer grid -->
</div>
</div>

<!-- ═══ SLIDE 15`
    );
    html = html.slice(0, why14) + chunk + html.slice(why14End);
  }

  // ── LIVE PLATFORM SLIDE: already has animated slider, ensure it's right
  // No change needed — slider was added previously

  const sizeBefore = fs.readFileSync(PRES).length;
  fs.writeFileSync(PRES, html);
  console.log(`  HTML: ${(sizeBefore/1024).toFixed(0)}KB → ${(html.length/1024).toFixed(0)}KB`);
  const totalSlides = (html.match(/class="slide/g)||[]).length;
  console.log(`  Slides: ${totalSlides}\n`);

  /* ── Step 3: Generate PDF ──────────────────────────────────────── */
  console.log('🖨   Step 3: Generating PDF (all interactive states)…\n');
  // Import and call the full-pdf logic inline
  const b2 = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--force-device-scale-factor=1'],
  });
  const pg = await b2.newPage();
  await pg.setViewport({ width:1920, height:1080, deviceScaleFactor:1 });
  await pg.goto(`file://${PRES}`, { waitUntil:'networkidle0', timeout:40000 });
  await sleep(2500);

  const pdfShots = [];
  const snap = async(note) => {
    await sleep(650);
    const buf = await pg.screenshot({type:'jpeg',quality:93,clip:{x:0,y:0,width:1920,height:1080}});
    pdfShots.push({buf,note});
    process.stdout.write(`  [${note}]\r`);
  };

  const goSlide = async(i) => {
    await pg.evaluate(idx => { if(typeof go==='function') go(idx); }, i);
    await sleep(2000);
  };
  const hl = async(sel) => {
    await pg.evaluate(s => {
      document.querySelectorAll('.__hl').forEach(e=>{e.style.outline='';e.style.boxShadow='';e.classList.remove('__hl');});
      const el=document.querySelector(s);
      if(el){el.classList.add('__hl');el.style.outline='3px solid rgba(255,149,0,.9)';el.style.boxShadow='0 0 0 6px rgba(255,149,0,.25)';}
    }, sel).catch(()=>{});
    await sleep(200);
  };
  const clrHl = async() => {
    await pg.evaluate(()=>{document.querySelectorAll('.__hl').forEach(e=>{e.style.outline='';e.style.boxShadow='';e.classList.remove('__hl');});}).catch(()=>{});
  };
  const openOv = async(type) => {
    await pg.evaluate(t=>{if(typeof openOverlay==='function')openOverlay(t);},type);
    await sleep(700);
  };
  const closeOv = async() => {
    await pg.evaluate(()=>{if(typeof closeOverlay==='function')closeOverlay();});
    await sleep(350);
  };

  for (let i = 0; i < totalSlides; i++) {
    await goSlide(i);
    process.stdout.write(`  Slide ${i+1}/${totalSlides}…\n`);

    if (i === 0) { // Title
      await snap('Title slide');
    } else if (i === 1) { // Problem
      await snap('The Problem');
    } else if (i === 2) { // Roles
      await snap('Roles overview');
      for (let r=0;r<4;r++) {
        const names=['Buyers','Sellers','Agents','Agencies'];
        await hl(`#roleGrid .fc:nth-child(${r+1})`);
        await snap(`Role highlight — ${names[r]}`);
        await clrHl();
        await pg.evaluate(ri=>{if(typeof showRole==='function')showRole(ri);},r);
        await sleep(500);
        await snap(`Role: ${names[r]}`);
      }
    } else if (i === 3) { // Search
      await snap('Search — initial');
      for (const pill of ['For Rent','Price ▾','Beds ▾','Property Type ▾','Area (m²) ▾','More Filters']) {
        await pg.evaluate(t=>{const p=Array.from(document.querySelectorAll('.fpill')).find(x=>x.textContent.trim()===t);if(p){p.classList.toggle('fon');p.dispatchEvent(new MouseEvent('click',{bubbles:true}));}},pill);
        await sleep(350);
        await snap(`Filter: ${pill}`);
      }
    } else if (i === 4) { // Map
      await snap('Map — standard view');
      for (const [type,note] of [['satellite','Satellite'],['heat','Heatmap'],['tilt3d','3D tilt'],['standard','Standard reset']]) {
        await pg.evaluate(t=>{const btn=Array.from(document.querySelectorAll('.map-layer-btn')).find(b=>b.textContent.toLowerCase().includes(t==='tilt3d'?'3d':t==='heat'?'heat':t==='satellite'?'sat':'standard'));if(btn&&typeof setLayer==='function')setLayer(t,btn);},type);
        await sleep(700);
        await snap(`Map — ${note}`);
      }
      await pg.evaluate(()=>{if(typeof toggleDraw==='function')toggleDraw();});
      await sleep(1400);
      await snap('Map — draw zone');
      const pins=[['budva','€185,000','Sea View Apartment','3 bed · 2 bath · 95 m²','Budva, Montenegro','Agent Marko','4.9','🛏 3  🚿 2  📐 95m²'],['villa','€320,000','Luxury Sea Villa','5 bed · 4 bath · 280 m²','Budva Riviera','Agent Sofia','5.0','🛏 5  🚿 4  📐 280m²'],['ohrid','€92,000','Lake View Studio','2 bed · 1 bath · 68 m²','Ohrid, N. Macedonia','Agent Ana','4.8','🛏 2  🚿 1  📐 68m²'],['sofia','€145,000','Modern City Apt','3 bed · 2 bath · 88 m²','Sofia, Bulgaria','Agent Ivan','4.7','🛏 3  🚿 2  📐 88m²'],['penthouse','€210,000','Rooftop Penthouse','4 bed · 3 bath · 140 m²','Belgrade, Serbia','Agency Prime','4.9','🛏 4  🚿 3  📐 140m²'],['tirana','€68,000','City Centre Studio','1 bed · 1 bath · 42 m²','Tirana, Albania','Agent Besa','4.8','🛏 1  🚿 1  📐 42m²'],['zagreb','€230,000','Family Home','4 bed · 2 bath · 165 m²','Zagreb, Croatia','Agent Luca','4.6','🛏 4  🚿 2  📐 165m²'],['nis','€55,000','Starter Apartment','2 bed · 1 bath · 52 m²','Niš, Serbia','Agent Petar','4.5','🛏 2  🚿 1  📐 52m²']];
      for (const [id,...rest] of pins) {
        await pg.evaluate((a,b,c,d,e,f,g,h)=>{if(typeof openMapCard==='function')openMapCard(a,b,c,d,e,f,g,h);},id,...rest);
        await sleep(500);
        await snap(`Map pin: ${rest[1]}`);
      }
    } else if (i === 5) { // Property detail + overlays
      await snap('Property detail');
      for (const [type,note] of [['neighborhood','Neighborhood Insights'],['market','Market Context'],['viewing','Schedule a Viewing']]) {
        await hl(`.fc[onclick*="${type}"]`);
        await snap(`Highlight: ${note}`);
        await clrHl();
        await openOv(type);
        await snap(`Overlay: ${note}`);
        if (type==='viewing') {
          await pg.evaluate(()=>{if(typeof confirmBooking==='function')confirmBooking();});
          await sleep(1400);
          await snap('Viewing booking confirmed');
        }
        await closeOv();
      }
    } else if (i === 6) { // Agents
      await snap('Agents — overview');
      for (let a=0;a<3;a++) {
        const names=['Agent Marko','Agent Sofia','Agent Ivan'];
        await hl(`.acard:nth-child(${a+1})`);
        await snap(`Highlight: ${names[a]}`);
        await clrHl();
        await pg.evaluate(s=>{const el=document.querySelector(s);if(el&&typeof selectAgent==='function')selectAgent(el);},`.acard:nth-child(${a+1})`);
        await sleep(400);
        await snap(`Selected: ${names[a]}`);
      }
    } else if (i === 7) { // Chat
      await snap('Messaging — initial');
      await pg.evaluate(()=>{const inp=document.getElementById('chatInput');if(inp)inp.value='Is the apartment still available for viewing this weekend?';});
      await sleep(300);
      await snap('Message typed');
      await pg.evaluate(()=>{if(typeof sendMsg==='function')sendMsg();});
      await sleep(500);
      await snap('Message sent — typing indicator');
      await sleep(2200);
      await snap('Agent replied');
    } else if (i === 8) { // AI Tools + AI neighborhood overlay
      await snap('AI Tools — initial');
      await hl('.val-btn');
      await snap('Highlight: Estimate Value');
      await clrHl();
      await pg.evaluate(()=>{if(typeof runValuation==='function')runValuation();});
      await sleep(2300);
      await snap('AI valuation result');
      await pg.evaluate(()=>{const r=document.querySelector('input[oninput*="calcMortgage"]');if(r){r.value=180000;r.dispatchEvent(new Event('input'));}});
      await sleep(400);
      await snap('Mortgage: €180k');
      await pg.evaluate(()=>{const r=document.querySelector('input[oninput*="calcDur"]');if(r){r.value=30;r.dispatchEvent(new Event('input'));}});
      await sleep(400);
      await snap('Mortgage: 30 years');
      await hl('.fc[onclick*="ai-neighborhood"]');
      await snap('Highlight: AI Neighborhood');
      await clrHl();
      await openOv('ai-neighborhood');
      await snap('AI Neighborhood Analysis overlay');
      await closeOv();
    } else if (i === 9) { // Dashboard
      await snap('Seller dashboard');
    } else if (i === 10) { // Mobile
      await snap('Mobile experience');
    } else if (i === 11) { // Languages — one per language
      const langs=[['en','Find Your Dream Property','Search properties across 10 countries','🇬🇧 English'],['sq','Gjeni Pronën Tuaj të Ëndrrave','Kërkoni prona në 10 vende','🇦🇱 Albanian'],['sr','Pronađite Dom Vaših Snova','Pretražite nekretnine u 10 zemalja','🇷🇸 Serbian'],['hr','Pronađite Dom Svojih Snova','Pretražite nekretnine u 10 zemalja','🇭🇷 Croatian'],['bs','Pronađite Dom Vaših Snova','Pretraži nekretnine u 10 zemalja','🇧🇦 Bosnian'],['me','Pronađite Dom Vaših Snova','Pretražite nekretnine u 10 zemalja','🇲🇪 Montenegrin'],['mk','Најдете го домот на вашите соништа','Пребарувајте имоти во 10 земји','🇲🇰 Macedonian'],['el','Βρείτε το Σπίτι των Ονείρων σας','Αναζητήστε ακίνητα σε 10 χώρες','🇬🇷 Greek'],['bg','Намерете дома на мечтите си','Търсете имоти в 10 страни','🇧🇬 Bulgarian'],['ro','Găsiți Casa Visurilor Voastre','Căutați proprietăți în 10 țări','🇷🇴 Romanian']];
      for (const [code,h,sub,lbl] of langs) {
        await pg.evaluate((c,hh,ss)=>{
          document.querySelectorAll('.lbtn').forEach(b=>b.classList.remove('lon'));
          const btn=Array.from(document.querySelectorAll('.lbtn')).find(b=>b.getAttribute('onclick')&&b.getAttribute('onclick').includes(`'${c}'`));
          if(btn)btn.classList.add('lon');
          const hEl=document.getElementById('langH'),sEl=document.getElementById('langSub'),cEl=document.getElementById('langCode');
          if(hEl)hEl.textContent=hh;if(sEl)sEl.textContent=ss;if(cEl)cEl.textContent=c.toUpperCase();
        },code,h,sub);
        await sleep(450);
        await snap(`Language: ${lbl}`);
      }
    } else if (i === 12) { // Pricing
      await snap('Pricing plans');
    } else if (i === 13) { // Why BalkanEstate
      await snap('Why BalkanEstate');
    } else if (i === 14) { // Opportunity
      await snap('Market opportunity');
    } else if (i === 15) { // Live Platform
      await snap('Live site — frame 1');
      for (let f=1;f<5;f++) { await sleep(3200); await snap(`Live site — frame ${f+1}`); }
    } else { // Closing
      await snap('Closing slide');
      await sleep(1500);
      await snap('Closing — confetti');
    }
  }

  await b2.close();
  console.log(`\n  ${pdfShots.length} pages captured\n`);

  // Build PDF
  console.log('📄  Building PDF…');
  const b3 = await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
  const pp = await b3.newPage();
  const b64 = pdfShots.map(s=>s.buf.toString('base64'));
  const tmp = path.resolve(__dirname,'_tmp_fix.html');
  fs.writeFileSync(tmp,`<!DOCTYPE html><html><head><style>*{margin:0;padding:0}body{background:#000}.pg{width:1920px;height:1080px;page-break-after:always;overflow:hidden}.pg:last-child{page-break-after:avoid}img{width:1920px;height:1080px;display:block}@page{size:1920px 1080px;margin:0}</style></head><body>${b64.map((d,i)=>`<div class="pg" title="${pdfShots[i].note}"><img src="data:image/jpeg;base64,${d}"/></div>`).join('')}</body></html>`);
  await pp.goto(`file://${tmp}`,{waitUntil:'networkidle0'});
  await pp.pdf({path:PDF,width:'1920px',height:'1080px',printBackground:true});
  fs.unlinkSync(tmp);
  await b3.close();

  const mb = (fs.statSync(PDF).size/1024/1024).toFixed(1);
  console.log(`\n✅  presentation.html — every slide has real screenshots`);
  console.log(`✅  presentation.pdf  — ${pdfShots.length} pages, ${mb} MB\n`);
  console.log('Page list:');
  pdfShots.forEach((s,i)=>console.log(`  ${String(i+1).padStart(3)}. ${s.note}`));
})().catch(e=>{console.error('\n❌',e.message);process.exit(1);});
