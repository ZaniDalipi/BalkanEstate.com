import { createHash } from 'crypto';
import sharp from 'sharp';
import {
  MEDIA_WIDTHS,
  MEDIA_MASTER_FILE,
  MEDIA_LQIP_FILE,
  widthVariantFile,
  variantWidthsFor,
} from '../../config/mediaVariants';

/**
 * Turns an upload into the files stored for a photo (see
 * config/mediaVariants.ts). All of it runs here with sharp — R2 only stores.
 *
 * Memory: sharp's operation cache is off (each upload is processed once, so
 * caching only holds RAM), and sizes are made one after another from the
 * ≤1920px master, so one upload holds a single decoded image at a time.
 */
sharp.cache(false);

/** Limits every decode: rejects decompression bombs before sharp allocates. */
export const MAX_INPUT_PIXELS = 50_000_000; // ~50 MP, larger than any phone camera

const WEBP_QUALITY = 78;

export interface GeneratedFile {
  file: string;
  body: Buffer;
  contentType: string;
}

export interface GeneratedPhoto {
  files: GeneratedFile[];
  width: number;
  height: number;
  /** Size of original.jpg. */
  bytes: number;
  totalBytes: number;
  /** sha1 of original.jpg. */
  contentHash: string;
  /** Largest webp width stored (0 for master-only). */
  largestWidth: number;
}

export interface MasterOptions {
  maxWidth?: number;
  maxHeight?: number;
  /**
   * Keep more detail (q90, 4:4:4 chroma) for images shown nearly full-bleed.
   * JPEG's default 4:2:0 halves the colour resolution, which shows up as
   * fringing along hard edges once a picture fills the screen.
   */
  preserveQuality?: boolean;
  quality?: number;
}

/**
 * The stored master: EXIF-rotated, fitted inside the max box (never
 * enlarged), progressive mozjpeg, metadata stripped. Throws on anything that
 * isn't a decodable image.
 */
export const buildMaster = async (
  input: Buffer,
  options: MasterOptions = {}
): Promise<{ buffer: Buffer; width: number; height: number }> => {
  const { maxWidth = 1920, maxHeight = 1920, preserveQuality = false } = options;
  if (!Buffer.isBuffer(input) || input.length === 0) throw new Error('Empty or invalid image buffer');

  const meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  if (!meta.width || !meta.height) throw new Error('File is not a readable image');

  const { data, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' }) // transparent logos would turn black in JPEG
    .jpeg({
      quality: options.quality ?? (preserveQuality ? 90 : 82),
      ...(preserveQuality ? { chromaSubsampling: '4:4:4' } : {}),
      progressive: true,
      mozjpeg: true,
    })
    .toBuffer({ resolveWithObject: true });

  return { buffer: data, width: info.width, height: info.height };
};

/**
 * Every display file for a master. With `masterOnly` (private documents) just
 * the master is returned — those are never resized for display.
 */
export const generatePhotoFiles = async (
  master: { buffer: Buffer; width: number; height: number },
  options: { masterOnly?: boolean; allWidths?: boolean } = {}
): Promise<GeneratedPhoto> => {
  const files: GeneratedFile[] = [{ file: MEDIA_MASTER_FILE, body: master.buffer, contentType: 'image/jpeg' }];
  // allWidths: fixed keys (city photos found by name) can't carry a size cap.
  const widths = options.allWidths ? [...MEDIA_WIDTHS] : variantWidthsFor(master.width);

  if (!options.masterOnly) {
    for (const width of widths) {
      const body = await sharp(master.buffer, { limitInputPixels: MAX_INPUT_PIXELS })
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, effort: 4 })
        .toBuffer();
      files.push({ file: widthVariantFile(width), body, contentType: 'image/webp' });
    }
    const lqip = await sharp(master.buffer, { limitInputPixels: MAX_INPUT_PIXELS })
      .resize({ width: 32 })
      .blur(1.2)
      .webp({ quality: 40 })
      .toBuffer();
    files.push({ file: MEDIA_LQIP_FILE, body: lqip, contentType: 'image/webp' });
  }

  return {
    files,
    width: master.width,
    height: master.height,
    bytes: master.buffer.length,
    totalBytes: files.reduce((sum, f) => sum + f.body.length, 0),
    contentHash: createHash('sha1').update(master.buffer).digest('hex'),
    largestWidth: options.masterOnly ? 0 : widths[widths.length - 1],
  };
};
