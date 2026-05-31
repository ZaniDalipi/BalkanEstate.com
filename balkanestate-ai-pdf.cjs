#!/usr/bin/env node
'use strict';
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const HTML = path.resolve(__dirname, 'balkanestate-ai.html');
const OUT  = path.resolve(__dirname, 'balkanestate-ai.pdf');
const TMP  = path.resolve(__dirname, '_ai_tmp.html');
const W = 1440, H = 810;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('Launching browser…');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
           '--force-device-scale-factor=1', '--window-size=1440,810']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1.5 });
  await page.goto(`file://${HTML}`, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for first slide to fully render + animate
  await sleep(1800);

  const total = await page.evaluate(() => window._slideCount || document.querySelectorAll('.slide').length);
  console.log(`Capturing ${total} slides at ${W}×${H}…`);

  const shots = [];

  for (let i = 0; i < total; i++) {
    process.stdout.write(`  Slide ${i + 1}/${total}… `);

    if (i > 0) {
      await page.evaluate(idx => {
        // Call goTo directly
        const slides = Array.from(document.querySelectorAll('.slide'));
        const N = slides.length;

        // Instant switch for PDF capture — no transition needed
        slides.forEach((s, si) => {
          s.style.cssText = '';
          s.classList.remove('is-active', 'is-leaving');
        });
        slides[idx].classList.add('is-active');
        slides[idx].style.cssText = 'visibility:visible;z-index:2;opacity:1;transform:none;transition:none';

        // Update counter
        const cnt = document.getElementById('cnt');
        if (cnt) cnt.textContent = (idx + 1) + ' / ' + N;
        const fill = document.getElementById('progress-fill');
        if (fill) fill.style.width = ((idx + 1) / N * 100) + '%';
        document.querySelectorAll('.dot').forEach((d, di) => d.classList.toggle('on', di === idx));
      }, i);

      // Wait for entrance animations to play
      await sleep(1400);
    } else {
      // First slide already rendered
      await sleep(200);
    }

    const buf = await page.screenshot({
      type: 'jpeg',
      quality: 95,
      clip: { x: 0, y: 0, width: W, height: H }
    });
    shots.push(buf.toString('base64'));
    console.log('✓');
  }

  await browser.close();
  console.log(`\nBuilding PDF from ${shots.length} screenshots…`);

  // Assemble into PDF via a temp HTML page
  const imgPages = shots.map(b64 =>
    `<div class="pg"><img src="data:image/jpeg;base64,${b64}"/></div>`
  ).join('');

  fs.writeFileSync(TMP, `<!DOCTYPE html><html><head><style>
    *{margin:0;padding:0}
    body{background:#000}
    .pg{width:${W}px;height:${H}px;overflow:hidden;page-break-after:always}
    .pg:last-child{page-break-after:avoid}
    img{width:${W}px;height:${H}px;display:block}
    @page{size:${W}px ${H}px;margin:0}
  </style></head><body>${imgPages}</body></html>`);

  const b2 = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const pg2 = await b2.newPage();
  await pg2.goto(`file://${TMP}`, { waitUntil: 'networkidle0' });
  await pg2.pdf({
    path: OUT,
    width:  `${W}px`,
    height: `${H}px`,
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });
  await b2.close();
  fs.unlinkSync(TMP);

  const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅  balkanestate-ai.pdf → ${mb} MB  (${shots.length} pages)`);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
