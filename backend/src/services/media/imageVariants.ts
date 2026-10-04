import { createHash } from 'crypto';
import sharp from 'sharp';
import {
  MEDIA_WIDTHS,
  MEDIA_CROP_RATIO,
  MEDIA_MASTER_FILE,
  MEDIA_LQIP_FILE,
  MEDIA_OG_FILE,
  widthVariantFile,
  cropVariantFile,
} from '../../config/mediaVariants';

/**
 * Turns an upload into the fixed set of files stored for a photo (see
 * config/mediaVariants.ts). All of it runs here with sharp — R2 only stores.
 */

/** Limits every decode: rejects decompression bombs before sharp allocates. */
export const MAX_INPUT_PIXELS = 50_000_000; // ~50 MP, larger than any phone camera

const WEBP_QUALITY = 78;
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

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

/** The largest 4:3 box that fits inside the master — crops are cut from it, never enlarged. */
const cropBox = (width: number, height: number, target: number): { w: number; h: number } => {
  const maxCropWidth = Math.floor(Math.min(width, height * MEDIA_CROP_RATIO));
  const w = Math.max(1, Math.min(target, maxCropWidth));
  return { w, h: Math.max(1, Math.round(w / MEDIA_CROP_RATIO)) };
};

/**
 * Every display file for a master. With `masterOnly` (private documents) just
 * the master is returned — those are never resized for display.
 */
export const generatePhotoFiles = async (
  master: { buffer: Buffer; width: number; height: number },
  options: { masterOnly?: boolean } = {}
): Promise<GeneratedPhoto> => {
  const files: GeneratedFile[] = [{ file: MEDIA_MASTER_FILE, body: master.buffer, contentType: 'image/jpeg' }];

  if (!options.masterOnly) {
    const base = sharp(master.buffer, { limitInputPixels: MAX_INPUT_PIXELS });
    const jobs: Array<Promise<GeneratedFile>> = [];

    for (const width of MEDIA_WIDTHS) {
      jobs.push(
        base
          .clone()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer()
          .then((body) => ({ file: widthVariantFile(width), body, contentType: 'image/webp' }))
      );
      const box = cropBox(master.width, master.height, width);
      jobs.push(
        base
          .clone()
          // attention = crop toward the most interesting region (Cloudinary's g_auto)
          .resize(box.w, box.h, { fit: 'cover', position: sharp.strategy.attention })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer()
          .then((body) => ({ file: cropVariantFile(width), body, contentType: 'image/webp' }))
      );
    }

    jobs.push(
      base
        .clone()
        .resize({ width: 32 })
        .blur(1.2)
        .webp({ quality: 40 })
        .toBuffer()
        .then((body) => ({ file: MEDIA_LQIP_FILE, body, contentType: 'image/webp' }))
    );
    jobs.push(
      base
        .clone()
        .resize(OG_WIDTH, OG_HEIGHT, { fit: 'contain', background: '#ffffff' })
        .jpeg({ quality: 82, progressive: true, mozjpeg: true })
        .toBuffer()
        .then((body) => ({ file: MEDIA_OG_FILE, body, contentType: 'image/jpeg' }))
    );

    files.push(...(await Promise.all(jobs)));
  }

  return {
    files,
    width: master.width,
    height: master.height,
    bytes: master.buffer.length,
    totalBytes: files.reduce((sum, f) => sum + f.body.length, 0),
    contentHash: createHash('sha1').update(master.buffer).digest('hex'),
  };
};
