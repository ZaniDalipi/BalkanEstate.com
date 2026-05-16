#!/usr/bin/env node
/**
 * Generates iOS PWA splash screen PNGs for all supported Apple device sizes.
 * Each splash screen is a white background with the BalkanEstate logo centred.
 *
 * Usage: node scripts/generate-splash-screens.js
 * Requires: sharp (already in node_modules)
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ICON_PATH = path.join(__dirname, '../public/icons/icon-512x512.png');
const OUTPUT_DIR = path.join(__dirname, '../public/icons/splash');

// All iOS device splash screen sizes (width x height)
const sizes = [
  // iPhone portrait + landscape pairs
  [1320, 2868], [2868, 1320],   // iPhone 16 Pro Max
  [1206, 2622], [2622, 1206],   // iPhone 16 Pro
  [1170, 2532], [2532, 1170],   // iPhone 14 / 13 / 12
  [1242, 2688], [2688, 1242],   // iPhone 11 Pro Max / XS Max
  [828,  1792], [1792, 828],    // iPhone 11 / XR
  [1125, 2436], [2436, 1125],   // iPhone X / XS / 11 Pro
  [1242, 2208], [2208, 1242],   // iPhone 8 Plus / 7 Plus
  [750,  1334], [1334, 750],    // iPhone 8 / 7 / 6s
  // iPad portrait + landscape pairs
  [2048, 2732], [2732, 2048],   // iPad Pro 12.9"
  [1668, 2388], [2388, 1668],   // iPad Pro 11" / Air
  [1536, 2048], [2048, 1536],   // iPad 9th gen / Air 2
];

const BRAND_BLUE = { r: 2, g: 82, b: 205, alpha: 1 };
const ICON_MAX_SIZE = 192; // max icon dimension on splash

async function generateSplash(width, height) {
  const filename = `splash-${width}x${height}.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  // Skip if already generated and fresh
  if (fs.existsSync(outputPath)) {
    const stat = fs.statSync(outputPath);
    if (stat.size > 1000) {
      return; // already generated
    }
  }

  // Determine icon size — no more than 1/4 of shortest dimension
  const shortest = Math.min(width, height);
  const iconSize = Math.min(ICON_MAX_SIZE, Math.floor(shortest / 4));

  // Resize the app icon
  const iconBuffer = await sharp(ICON_PATH)
    .resize(iconSize, iconSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  // Create white splash with icon centred
  const left = Math.floor((width - iconSize) / 2);
  const top = Math.floor((height - iconSize) / 2);

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 255 },
    },
  })
    .composite([{ input: iconBuffer, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(`  ✓ ${filename}`);
}

(async () => {
  if (!fs.existsSync(ICON_PATH)) {
    console.error(`Error: icon not found at ${ICON_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`Generating ${sizes.length} splash screens…`);
  for (const [w, h] of sizes) {
    await generateSplash(w, h);
  }
  console.log('Done.');
})();
