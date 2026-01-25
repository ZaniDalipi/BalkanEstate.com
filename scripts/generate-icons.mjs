import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const iconsDir = join(rootDir, 'public', 'icons');

// Ensure icons directory exists
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Read the SVG file
const svgPath = join(iconsDir, 'icon.svg');
const svgBuffer = readFileSync(svgPath);

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate regular icons
async function generateIcons() {
  console.log('Generating PWA icons...');

  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated: icon-${size}x${size}.png`);
  }

  // Generate maskable icons (with padding for safe zone)
  // Maskable icons need the content in the center 80% of the image
  const maskableSizes = [192, 512];

  for (const size of maskableSizes) {
    const outputPath = join(iconsDir, `icon-maskable-${size}x${size}.png`);

    // Create a larger canvas with the icon centered
    const iconSize = Math.floor(size * 0.8); // Icon at 80% of total size
    const padding = Math.floor((size - iconSize) / 2);

    // Create the icon at smaller size
    const iconBuffer = await sharp(svgBuffer)
      .resize(iconSize, iconSize)
      .png()
      .toBuffer();

    // Composite onto white background with padding
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([{
        input: iconBuffer,
        top: padding,
        left: padding
      }])
      .png()
      .toFile(outputPath);

    console.log(`Generated: icon-maskable-${size}x${size}.png`);
  }

  // Generate Apple touch icon (180x180)
  const appleTouchPath = join(iconsDir, 'apple-touch-icon.png');
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(appleTouchPath);
  console.log('Generated: apple-touch-icon.png');

  // Generate favicon sizes
  const faviconSizes = [16, 32, 48];
  for (const size of faviconSizes) {
    const outputPath = join(iconsDir, `favicon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated: favicon-${size}x${size}.png`);
  }

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
