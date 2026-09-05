import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { mediaLogger } from '../utils/logger';

/**
 * Watermark Service - Applies agency logo + BalkanEstate branding to property photos
 *
 * Placement:
 * - Agency logo: bottom-left corner (if available)
 * - BalkanEstate logo: bottom-right corner (always)
 * - Both semi-transparent to avoid obstructing the photo
 */

// Cache the BalkanEstate logo buffer to avoid reading from disk on every upload
let balkanEstateLogoCache: Buffer | null = null;

/**
 * Get the BalkanEstate logo as a PNG buffer.
 * Uses the SVG icon from public/icons/icon.svg, rendered at a fixed size.
 */
const getBalkanEstateLogo = async (): Promise<Buffer> => {
  if (balkanEstateLogoCache) return balkanEstateLogoCache;

  const svgPath = path.resolve(__dirname, '../../../public/icons/BalkanEstateAILogo.svg');

  if (!fs.existsSync(svgPath)) {
    mediaLogger.warn('⚠️  BalkanEstate logo SVG not found at', svgPath);
    throw new Error('BalkanEstate logo not found');
  }

  const svgBuffer = fs.readFileSync(svgPath);
  // Render SVG to a 120x120 PNG for watermarking
  balkanEstateLogoCache = await sharp(svgBuffer)
    .resize(120, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return balkanEstateLogoCache;
};

/**
 * Fetch and prepare an agency logo from a URL for watermarking.
 * Returns a resized PNG buffer, or null if fetch fails.
 */
const fetchAgencyLogo = async (logoUrl: string): Promise<Buffer | null> => {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) {
      mediaLogger.warn(`⚠️  Failed to fetch agency logo: HTTP ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resize to a max of 120x120, preserving aspect ratio
    return await sharp(buffer)
      .resize(120, 120, { fit: 'inside', withoutEnlargement: true, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  } catch (error: any) {
    mediaLogger.warn(`⚠️  Could not fetch agency logo: ${error.message}`);
    return null;
  }
};

/**
 * Create a semi-transparent version of a logo buffer.
 */
const makeTranslucent = async (logoBuffer: Buffer, opacity: number): Promise<Buffer> => {
  const metadata = await sharp(logoBuffer).metadata();
  const width = metadata.width || 120;
  const height = metadata.height || 120;

  // Create an alpha overlay
  const alphaLayer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: opacity },
    },
  })
    .png()
    .toBuffer();

  // Composite the logo with the alpha layer using dest-in to apply transparency
  return await sharp(logoBuffer)
    .composite([{ input: alphaLayer, blend: 'dest-in' }])
    .png()
    .toBuffer();
};

export interface WatermarkOptions {
  agencyLogoUrl?: string; // URL of the agency logo (from our CDN)
}

/**
 * Apply watermark overlays to a property photo buffer.
 *
 * - BalkanEstate logo in bottom-right
 * - Agency logo in bottom-left (if provided)
 * - Both at ~50% opacity
 *
 * Returns the watermarked image buffer (PNG — an intermediate, re-encoded on upload).
 */
export const applyWatermark = async (
  imageBuffer: Buffer,
  options: WatermarkOptions = {}
): Promise<Buffer> => {
  try {
    const imageMetadata = await sharp(imageBuffer).metadata();
    const imgWidth = imageMetadata.width || 1920;
    const imgHeight = imageMetadata.height || 1080;

    // Scale logo size based on image dimensions (roughly 8% of the shorter dimension)
    const logoSize = Math.max(60, Math.min(160, Math.round(Math.min(imgWidth, imgHeight) * 0.08)));
    const padding = Math.round(logoSize * 0.25); // Padding from edges
    const opacity = 0.5;

    const compositeInputs: sharp.OverlayOptions[] = [];

    // 1. BalkanEstate logo - bottom-right
    try {
      let balkanLogo = await getBalkanEstateLogo();
      balkanLogo = await sharp(balkanLogo)
        .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      balkanLogo = await makeTranslucent(balkanLogo, opacity);

      compositeInputs.push({
        input: balkanLogo,
        gravity: 'southeast',
        top: imgHeight - logoSize - padding,
        left: imgWidth - logoSize - padding,
      });
    } catch (err: any) {
      mediaLogger.warn(`⚠️  Skipping BalkanEstate watermark: ${err.message}`);
    }

    // 2. Agency logo - bottom-left
    if (options.agencyLogoUrl) {
      try {
        let agencyLogo = await fetchAgencyLogo(options.agencyLogoUrl);
        if (agencyLogo) {
          agencyLogo = await sharp(agencyLogo)
            .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer();
          agencyLogo = await makeTranslucent(agencyLogo, opacity);

          compositeInputs.push({
            input: agencyLogo,
            top: imgHeight - logoSize - padding,
            left: padding,
          });
        }
      } catch (err: any) {
        mediaLogger.warn(`⚠️  Skipping agency watermark: ${err.message}`);
      }
    }

    if (compositeInputs.length === 0) {
      // No watermarks to apply
      return imageBuffer;
    }

    // Apply all watermarks in a single composite call.
    //
    // PNG, not JPEG: this buffer is an intermediate that `uploadImage` re-encodes
    // straight away, so a lossy step here would only add artifacts the final
    // encode then has to preserve. Low compression effort keeps it cheap — the
    // buffer never leaves memory.
    const watermarked = await sharp(imageBuffer)
      .composite(compositeInputs)
      .png({ compressionLevel: 3 })
      .toBuffer();

    mediaLogger.info(`🔖 Applied ${compositeInputs.length} watermark(s) to property photo`);
    return watermarked;
  } catch (error: any) {
    mediaLogger.error(`❌ Watermark error: ${error.message}`);
    // Return original image if watermarking fails - don't block the upload
    return imageBuffer;
  }
};
