#!/usr/bin/env node
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const FILE   = path.resolve(__dirname, 'presentation.html');
const OUT    = path.resolve(__dirname, 'presentation.pdf');
const SLIDES = 16;
const sleep  = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log('🚀  Launching browser…');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--force-device-scale-factor=1',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  console.log('📂  Loading presentation…');
  await page.goto(`file://${FILE}`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);

  const shots = [];

  for (let i = 0; i < SLIDES; i++) {
    console.log(`📸  Slide ${i + 1} / ${SLIDES}…`);
    if (i > 0) {
      await page.evaluate((idx) => { if (typeof go === 'function') go(idx); }, i);
      await sleep(1800);
    } else {
      await sleep(1800);
    }
    const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    shots.push(buf);
  }

  await browser.close();

  // --- Build PDF from screenshots ---
  console.log('📄  Building PDF…');
  const browser2 = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const pdfPage = await browser2.newPage();

  const b64 = shots.map((b) => b.toString('base64'));
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000}
.pg{width:1920px;height:1080px;page-break-after:always;overflow:hidden}
.pg:last-child{page-break-after:avoid}
img{display:block;width:1920px;height:1080px}
@page{size:1920px 1080px;margin:0}
</style></head><body>
${b64.map((d) => `<div class="pg"><img src="data:image/png;base64,${d}"/></div>`).join('')}
</body></html>`;

  const tmp = path.resolve(__dirname, '_tmp_slides.html');
  fs.writeFileSync(tmp, html);
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
  console.log(`✅  presentation.pdf created  (${mb} MB)`);
})().catch((e) => { console.error('❌ ', e.message); process.exit(1); });
