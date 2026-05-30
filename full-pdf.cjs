#!/usr/bin/env node
/**
 * full-pdf.cjs
 * Captures every interactive state of the presentation as a separate PDF page.
 * Slides with interactions (roles, filters, map layers, map pins, chat, AI tools,
 * languages, agents) each expand into multiple pages so the presenter can click
 * through them like a true animated slideshow.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const PRES = path.resolve(__dirname, 'presentation.html');
const OUT  = path.resolve(__dirname, 'presentation.pdf');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── helpers ───────────────────────────────────────────────────────────────
async function snap(page, label) {
  await sleep(600);
  const buf = await page.screenshot({ type: 'jpeg', quality: 94,
    clip: { x:0, y:0, width:1920, height:1080 } });
  process.stdout.write(`  [${label}]\r`);
  return buf;
}

// Add a glowing "you are here" ring around the next-to-click element before capturing
async function highlight(page, selector) {
  await page.evaluate(sel => {
    document.querySelectorAll('.__hl').forEach(e => {
      e.style.outline = ''; e.style.boxShadow = ''; e.classList.remove('__hl');
    });
    const el = document.querySelector(sel);
    if (el) {
      el.classList.add('__hl');
      el.style.outline = '3px solid rgba(255,149,0,.9)';
      el.style.boxShadow = '0 0 0 6px rgba(255,149,0,.25)';
    }
  }, selector).catch(() => {});
  await sleep(180);
}

async function clearHighlight(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.__hl').forEach(e => {
      e.style.outline = ''; e.style.boxShadow = ''; e.classList.remove('__hl');
    });
  }).catch(() => {});
}

// ─── slide capture plan ────────────────────────────────────────────────────
async function captureSlide(page, idx, shots) {
  // Navigate to the slide
  await page.evaluate(i => { if (typeof go === 'function') go(i); }, idx);
  await sleep(2000); // entrance animation

  const label = `S${idx+1}`;

  switch (idx) {

    // ── Slide 1: Title ──────────────────────────────────────────────────────
    case 0:
      shots.push({ buf: await snap(page, `${label} Title`), note: 'Title slide' });
      break;

    // ── Slide 2: Problem ────────────────────────────────────────────────────
    case 1:
      shots.push({ buf: await snap(page, `${label} Problem`), note: 'The Problem' });
      break;

    // ── Slide 3: Solution / Roles ───────────────────────────────────────────
    case 2: {
      shots.push({ buf: await snap(page, `${label} Roles`), note: 'Roles overview' });
      const roles = ['Buyers', 'Sellers', 'Agents', 'Agencies'];
      for (let r = 0; r < 4; r++) {
        await highlight(page, `#roleGrid .fc:nth-child(${r+1})`);
        shots.push({ buf: await snap(page, `${label} role-highlight-${r}`), note: `Role highlight — ${roles[r]}` });
        await clearHighlight(page);
        await page.evaluate(i => { if (typeof showRole === 'function') showRole(i); }, r);
        await sleep(500);
        shots.push({ buf: await snap(page, `${label} role-${r}`), note: `Role: ${roles[r]}` });
      }
      break;
    }

    // ── Slide 4: Search / Filters ───────────────────────────────────────────
    case 3: {
      shots.push({ buf: await snap(page, `${label} Search`), note: 'Search — initial' });
      const pills = ['For Rent', 'Price ▾', 'Beds ▾', 'Property Type ▾', 'Area (m²) ▾', 'More Filters'];
      for (const label2 of pills) {
        await page.evaluate(txt => {
          const pills = Array.from(document.querySelectorAll('.fpill'));
          const p = pills.find(p => p.textContent.trim() === txt);
          if (p) { p.classList.toggle('fon'); p.dispatchEvent(new MouseEvent('click', { bubbles:true })); }
        }, label2);
        await sleep(400);
        shots.push({ buf: await snap(page, `${label} filter-${label2}`), note: `Filter: ${label2}` });
      }
      break;
    }

    // ── Slide 5: 3D Map ─────────────────────────────────────────────────────
    case 4: {
      shots.push({ buf: await snap(page, `${label} Map-base`), note: 'Map — standard view' });

      // Layer buttons
      const layers = [
        ['satellite', 'Satellite layer'],
        ['heat',      'Heatmap layer'],
        ['tilt3d',    '3D tilt view'],
        ['standard',  'Back to standard'],
      ];
      for (const [type, note] of layers) {
        await page.evaluate(t => {
          const btn = Array.from(document.querySelectorAll('.map-layer-btn'))
            .find(b => b.textContent.toLowerCase().includes(
              t === 'tilt3d' ? '3d' : t === 'heat' ? 'heat' : t === 'satellite' ? 'sat' : 'standard'
            ));
          if (btn && typeof setLayer === 'function') setLayer(t, btn);
        }, type);
        await sleep(700);
        shots.push({ buf: await snap(page, `${label} map-${type}`), note });
      }

      // Draw zone
      await page.evaluate(() => { if (typeof toggleDraw === 'function') toggleDraw(); });
      await sleep(1400);
      shots.push({ buf: await snap(page, `${label} map-draw`), note: 'Map — draw zone active' });

      // Map pins
      const pins = [
        ['budva',     '€185,000', 'Sea View Apartment',  '3 bed · 2 bath · 95 m²',  'Budva, Montenegro',      'Agent Marko', '4.9', '🛏 3  🚿 2  📐 95m²'],
        ['villa',     '€320,000', 'Luxury Sea Villa',     '5 bed · 4 bath · 280 m²', 'Budva Riviera',           'Agent Sofia',  '5.0', '🛏 5  🚿 4  📐 280m²'],
        ['ohrid',     '€92,000',  'Lake View Studio',     '2 bed · 1 bath · 68 m²',  'Ohrid, N. Macedonia',     'Agent Ana',   '4.8', '🛏 2  🚿 1  📐 68m²'],
        ['sofia',     '€145,000', 'Modern City Apt',      '3 bed · 2 bath · 88 m²',  'Sofia, Bulgaria',         'Agent Ivan',  '4.7', '🛏 3  🚿 2  📐 88m²'],
        ['penthouse', '€210,000', 'Rooftop Penthouse',    '4 bed · 3 bath · 140 m²', 'Belgrade, Serbia',        'Agency Prime','4.9', '🛏 4  🚿 3  📐 140m²'],
        ['tirana',    '€68,000',  'City Centre Studio',   '1 bed · 1 bath · 42 m²',  'Tirana, Albania',         'Agent Besa',  '4.8', '🛏 1  🚿 1  📐 42m²'],
        ['zagreb',    '€230,000', 'Family Home',          '4 bed · 2 bath · 165 m²', 'Zagreb, Croatia',         'Agent Luca',  '4.6', '🛏 4  🚿 2  📐 165m²'],
        ['nis',       '€55,000',  'Starter Apartment',    '2 bed · 1 bath · 52 m²',  'Niš, Serbia',             'Agent Petar', '4.5', '🛏 2  🚿 1  📐 52m²'],
      ];
      for (const [id, price, title, subtitle, loc, agent, rating, meta] of pins) {
        await page.evaluate((a, b, c, d, e, f, g, h) => {
          if (typeof openMapCard === 'function') openMapCard(a, b, c, d, e, f, g, h);
        }, id, price, title, subtitle, loc, agent, rating, meta);
        await sleep(500);
        shots.push({ buf: await snap(page, `${label} pin-${id}`), note: `Map pin: ${title}` });
      }
      break;
    }

    // ── Slide 6: Property Detail ─────────────────────────────────────────────
    case 5: {
      shots.push({ buf: await snap(page, `${label} Property`), note: 'Property detail' });
      // Open each feature overlay
      const overlays = [
        ['neighborhood', 'Neighborhood Insights overlay'],
        ['market',       'Market Context overlay'],
        ['viewing',      'Schedule a Viewing overlay'],
      ];
      for (const [type, note] of overlays) {
        await highlight(page, `.fc[onclick*="${type}"]`);
        shots.push({ buf: await snap(page, `${label} fc-hl-${type}`), note: `Highlight: ${note.replace(' overlay','')}` });
        await clearHighlight(page);
        await page.evaluate(t => { if (typeof openOverlay === 'function') openOverlay(t); }, type);
        await sleep(700);
        shots.push({ buf: await snap(page, `${label} ov-${type}`), note });
        // For viewing overlay: also show booking confirmation
        if (type === 'viewing') {
          await page.evaluate(() => { if (typeof confirmBooking === 'function') confirmBooking(); });
          await sleep(1400);
          shots.push({ buf: await snap(page, `${label} ov-booking-confirmed`), note: 'Viewing booking confirmed' });
        }
        await page.evaluate(() => { if (typeof closeOverlay === 'function') closeOverlay(); });
        await sleep(350);
      }
      break;
    }

    // ── Slide 7: Agents ──────────────────────────────────────────────────────
    case 6: {
      shots.push({ buf: await snap(page, `${label} Agents`), note: 'Agents — overview' });
      const agentCards = ['.acard:nth-child(1)', '.acard:nth-child(2)', '.acard:nth-child(3)'];
      const agentNames = ['Agent Marko', 'Agent Sofia', 'Agent Ivan'];
      for (let a = 0; a < agentCards.length; a++) {
        await highlight(page, agentCards[a]);
        shots.push({ buf: await snap(page, `${label} agent-hl-${a}`), note: `Highlight: ${agentNames[a]}` });
        await clearHighlight(page);
        await page.evaluate(sel => {
          const el = document.querySelector(sel);
          if (el && typeof selectAgent === 'function') selectAgent(el);
        }, agentCards[a]);
        await sleep(400);
        shots.push({ buf: await snap(page, `${label} agent-sel-${a}`), note: `Selected: ${agentNames[a]}` });
      }
      break;
    }

    // ── Slide 8: Chat ─────────────────────────────────────────────────────────
    case 7: {
      shots.push({ buf: await snap(page, `${label} Chat`), note: 'Messaging — initial' });
      // Type a message
      await page.evaluate(() => {
        const inp = document.getElementById('chatInput');
        if (inp) inp.value = 'Is the apartment still available for viewing this weekend?';
      });
      await sleep(300);
      shots.push({ buf: await snap(page, `${label} Chat-typed`), note: 'Message typed' });
      // Send
      await page.evaluate(() => { if (typeof sendMsg === 'function') sendMsg(); });
      await sleep(500);
      shots.push({ buf: await snap(page, `${label} Chat-sent`), note: 'Message sent — typing indicator' });
      await sleep(2200);
      shots.push({ buf: await snap(page, `${label} Chat-reply`), note: 'Agent replied' });
      break;
    }

    // ── Slide 9: AI Tools ─────────────────────────────────────────────────────
    case 8: {
      shots.push({ buf: await snap(page, `${label} AI`), note: 'AI Tools — initial' });
      await highlight(page, '.val-btn');
      shots.push({ buf: await snap(page, `${label} AI-hl`), note: 'Highlight: Estimate Value button' });
      await clearHighlight(page);
      await page.evaluate(() => { if (typeof runValuation === 'function') runValuation(); });
      await sleep(2300);
      shots.push({ buf: await snap(page, `${label} AI-result`), note: 'AI valuation result revealed' });
      // Mortgage: move slider
      await page.evaluate(() => {
        const r = document.querySelector('input[oninput*="calcMortgage"]');
        if (r) { r.value = 180000; r.dispatchEvent(new Event('input')); }
      });
      await sleep(400);
      shots.push({ buf: await snap(page, `${label} mortgage`), note: 'Mortgage calc — €180k loan' });
      await page.evaluate(() => {
        const r = document.querySelector('input[oninput*="calcDur"]');
        if (r) { r.value = 30; r.dispatchEvent(new Event('input')); }
      });
      await sleep(400);
      shots.push({ buf: await snap(page, `${label} mortgage-30yr`), note: 'Mortgage calc — 30 years' });
      // AI Neighborhood overlay
      await highlight(page, '.fc[onclick*="ai-neighborhood"]');
      shots.push({ buf: await snap(page, `${label} ai-nb-hl`), note: 'Highlight: AI Neighborhood Insights' });
      await clearHighlight(page);
      await page.evaluate(() => { if (typeof openOverlay === 'function') openOverlay('ai-neighborhood'); });
      await sleep(700);
      shots.push({ buf: await snap(page, `${label} ai-nb-overlay`), note: 'AI Neighborhood Analysis overlay' });
      await page.evaluate(() => { if (typeof closeOverlay === 'function') closeOverlay(); });
      await sleep(350);
      break;
    }

    // ── Slide 10: Dashboard ───────────────────────────────────────────────────
    case 9:
      shots.push({ buf: await snap(page, `${label} Dashboard`), note: 'Seller dashboard' });
      break;

    // ── Slide 11: Mobile ──────────────────────────────────────────────────────
    case 10:
      shots.push({ buf: await snap(page, `${label} Mobile`), note: 'Mobile experience' });
      break;

    // ── Slide 12: Languages ───────────────────────────────────────────────────
    case 11: {
      const langs = [
        ['en', 'Find Your Dream Property',          'Search properties across 10 countries', '🇬🇧 English'],
        ['sq', 'Gjeni Pronën Tuaj të Ëndrrave',      'Kërkoni prona në 10 vende',             '🇦🇱 Albanian'],
        ['sr', 'Pronađite Dom Vaših Snova',           'Pretražite nekretnine u 10 zemalja',   '🇷🇸 Serbian'],
        ['hr', 'Pronađite Dom Svojih Snova',          'Pretražite nekretnine u 10 zemalja',   '🇭🇷 Croatian'],
        ['bs', 'Pronađite Dom Vaših Snova',           'Pretraži nekretnine u 10 zemalja',     '🇧🇦 Bosnian'],
        ['me', 'Pronađite Dom Vaših Snova',           'Pretražite nekretnine u 10 zemalja',   '🇲🇪 Montenegrin'],
        ['mk', 'Најдете го домот на вашите соништа', 'Пребарувајте имоти во 10 земји',       '🇲🇰 Macedonian'],
        ['el', 'Βρείτε το Σπίτι των Ονείρων σας',    'Αναζητήστε ακίνητα σε 10 χώρες',      '🇬🇷 Greek'],
        ['bg', 'Намерете дома на мечтите си',         'Търсете имоти в 10 страни',            '🇧🇬 Bulgarian'],
        ['ro', 'Găsiți Casa Visurilor Voastre',       'Căutați proprietăți în 10 țări',       '🇷🇴 Romanian'],
      ];
      for (const [code, h, sub, langLabel] of langs) {
        await page.evaluate((c, hh, ss) => {
          document.querySelectorAll('.lbtn').forEach(b => b.classList.remove('lon'));
          const btn = Array.from(document.querySelectorAll('.lbtn'))
            .find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${c}'`));
          if (btn) btn.classList.add('lon');
          const hEl = document.getElementById('langH');
          const sEl = document.getElementById('langSub');
          const cEl = document.getElementById('langCode');
          if (hEl) hEl.textContent = hh;
          if (sEl) sEl.textContent = ss;
          if (cEl) cEl.textContent = c.toUpperCase();
        }, code, h, sub);
        await sleep(450);
        shots.push({ buf: await snap(page, `${label} lang-${code}`), note: `Language: ${langLabel}` });
      }
      break;
    }

    // ── Slide 13: Pricing ─────────────────────────────────────────────────────
    case 12:
      shots.push({ buf: await snap(page, `${label} Pricing`), note: 'Pricing plans' });
      break;

    // ── Slide 14: Platform Highlights ─────────────────────────────────────────
    case 13:
      shots.push({ buf: await snap(page, `${label} Platform`), note: 'Platform highlights' });
      break;

    // ── Slide 15: Opportunity ─────────────────────────────────────────────────
    case 14:
      shots.push({ buf: await snap(page, `${label} Opportunity`), note: 'Opportunity & market' });
      break;

    // ── Slide 16: Live Platform ────────────────────────────────────────────────
    case 15: {
      // Capture 6 frames spread across the animation cycle
      shots.push({ buf: await snap(page, `${label} Live-1`), note: 'Live site — homepage' });
      await sleep(3200);
      shots.push({ buf: await snap(page, `${label} Live-2`), note: 'Live site — search' });
      await sleep(3200);
      shots.push({ buf: await snap(page, `${label} Live-3`), note: 'Live site — agents' });
      await sleep(3200);
      shots.push({ buf: await snap(page, `${label} Live-4`), note: 'Live site — pricing' });
      await sleep(3200);
      shots.push({ buf: await snap(page, `${label} Live-5`), note: 'Live site — valuation' });
      break;
    }

    // ── Slide 17: Closing ─────────────────────────────────────────────────────
    default:
      shots.push({ buf: await snap(page, `${label} Closing`), note: 'Closing slide' });
      await sleep(1500); // confetti
      shots.push({ buf: await snap(page, `${label} Closing-confetti`), note: 'Closing — confetti' });
      break;
  }
}

// ─── main ──────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n🎬  Full Interactive PDF Generator');
  console.log('    Every click, every state, every language = its own page\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  console.log('📂  Loading presentation…');
  await page.goto(`file://${PRES}`, { waitUntil: 'networkidle0', timeout: 40000 });
  await sleep(2500);

  // Detect total slides
  const totalSlides = await page.evaluate(() =>
    document.querySelectorAll('.slide').length
  );
  console.log(`    ${totalSlides} slides detected\n`);

  const shots = [];

  for (let i = 0; i < totalSlides; i++) {
    const prevCount = shots.length;
    process.stdout.write(`📸  Slide ${i+1}/${totalSlides}… `);
    await captureSlide(page, i, shots);
    const added = shots.length - prevCount;
    console.log(`→ ${added} page${added !== 1 ? 's' : ''} (total: ${shots.length})`);
  }

  await browser.close();
  console.log(`\n✅  Captured ${shots.length} pages total\n`);

  // ─── Build PDF ────────────────────────────────────────────────────────────
  console.log('📄  Building PDF…');
  const browser2 = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const pdfPage = await browser2.newPage();

  const b64 = shots.map(s => s.buf.toString('base64'));
  // Embed notes as a hidden title attribute on each page div for context
  const pages = shots.map((s, i) => {
    const note = s.note || `Page ${i+1}`;
    return `<div class="pg" title="${note.replace(/"/g,'&quot;')}"><img src="data:image/jpeg;base64,${b64[i]}"/></div>`;
  });

  const pdfHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
*{margin:0;padding:0}
body{background:#000}
.pg{width:1920px;height:1080px;page-break-after:always;overflow:hidden}
.pg:last-child{page-break-after:avoid}
img{width:1920px;height:1080px;display:block}
@page{size:1920px 1080px;margin:0}
</style>
</head><body>${pages.join('')}</body></html>`;

  const tmp = path.resolve(__dirname, '_tmp_full.html');
  fs.writeFileSync(tmp, pdfHtml);
  await pdfPage.goto(`file://${tmp}`, { waitUntil: 'networkidle0' });

  await pdfPage.pdf({
    path: OUT,
    width: '1920px',
    height: '1080px',
    printBackground: true,
  });

  fs.unlinkSync(tmp);
  await browser2.close();

  const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅  presentation.pdf → ${shots.length} pages, ${mb} MB`);
  console.log('\n📋  Page breakdown:');
  shots.forEach((s, i) => console.log(`    ${String(i+1).padStart(3, ' ')}.  ${s.note}`));
  console.log('');
})().catch(e => { console.error('\n❌', e.message, e.stack); process.exit(1); });
