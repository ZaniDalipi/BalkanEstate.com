#!/usr/bin/env node
'use strict';
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:4175';
const OUT  = path.resolve(__dirname, '_demo_shots.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function shot(page, url, w, h, wait, extraSetup) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(BASE + url, { waitUntil: 'networkidle2', timeout: 25000 });
  if (extraSetup) await extraSetup(page);
  await sleep(wait);
  // hide any dialogs/overlays
  await page.evaluate(() => {
    document.querySelectorAll('[role="dialog"],[data-radix-popper-content-wrapper]')
      .forEach(el => { if (el instanceof HTMLElement) el.style.display = 'none'; });
  }).catch(() => {});
  const buf = await page.screenshot({ type: 'jpeg', quality: 92, clip: { x:0, y:0, width:w, height:h } });
  return 'data:image/jpeg;base64,' + buf.toString('base64');
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
  });
  const page = await browser.newPage();

  const captures = [
    // [key, url, width, height, wait_ms, label]
    ['home',          '/',                    1280, 760, 4500,  'balkanestateai.com'],
    ['search',        '/search',              1280, 760, 5000,  'balkanestateai.com/search'],
    ['search_map',    '/search',              1280, 760, 6000,  'balkanestateai.com/search — Map View'],
    ['agents',        '/agents',              1280, 760, 4000,  'balkanestateai.com/agents'],
    ['pricing',       '/pricing',             1280, 760, 3500,  'balkanestateai.com/pricing'],
    ['valuation',     '/valuation',           1280, 760, 3500,  'balkanestateai.com/valuation'],
    ['mortgage',      '/mortgage-calculator', 1280, 760, 3500,  'balkanestateai.com/mortgage-calculator'],
  ];

  const results = {};

  for (const [key, url, w, h, wait, label] of captures) {
    process.stdout.write(`  ${label}… `);
    try {
      let extra;
      // For map view — try to click the map tab after load
      if (key === 'search_map') {
        extra = async (pg) => {
          await pg.evaluate(() => {
            // Try clicking map view button
            const btns = [...document.querySelectorAll('button,a,[role="tab"]')];
            const mapBtn = btns.find(b => b.textContent?.toLowerCase().includes('map'));
            if (mapBtn) mapBtn.click();
          }).catch(() => {});
          await sleep(2500);
        };
      }
      results[key] = { src: await shot(page, url, w, h, wait, extra), label };
      console.log('✓');
    } catch(e) {
      console.log('✗', e.message.slice(0, 60));
      results[key] = null;
    }
  }

  await browser.close();

  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`\n✅  _demo_shots.json → ${kb} KB  (${Object.keys(results).length} shots)`);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
