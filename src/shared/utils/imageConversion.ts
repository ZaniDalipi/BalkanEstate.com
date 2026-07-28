/**
 * Image format normalization for uploads.
 *
 * Some image formats that phones and cameras produce cannot be decoded by
 * browser <canvas> / <img> (which is what `browser-image-compression` and our
 * previews rely on). The most common offender is HEIC/HEIF — the default photo
 * format on modern iPhones. When such a file is fed straight to the compressor
 * or uploaded as-is, the result is a broken/empty image.
 *
 * This module detects those formats and converts them to a widely-supported
 * format (JPEG) *before* compression/preview/upload, so every downstream step
 * receives something every browser and our backend (sharp) can read.
 *
 * `heic2any` is imported dynamically so its (relatively large) WASM decoder is
 * only pulled into the bundle the first time a user actually uploads a HEIC.
 */

import { logger } from './logger';

/**
 * Formats browsers generally CANNOT decode via canvas/<img>, so they must be
 * converted before compression, preview, or upload. Keyed by lowercased
 * extension and matched against MIME type where the browser provides one.
 *
 * Note: iOS Safari frequently reports an EMPTY `file.type` for HEIC/HEIF, so we
 * must also detect by file extension — never rely on MIME type alone.
 */
const HEIC_EXTENSIONS = new Set(['heic', 'heif', 'heics', 'heifs', 'hif']);
const HEIC_MIME_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]);

const getExtension = (filename: string): string => {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : '';
};

/** True when the file is a HEIC/HEIF image (by MIME type or, as a fallback, extension). */
export const isHeicFile = (file: File): boolean => {
  const type = (file.type || '').toLowerCase();
  if (HEIC_MIME_TYPES.has(type)) return true;
  // iOS often reports an empty MIME type for HEIC — fall back to the extension.
  return HEIC_EXTENSIONS.has(getExtension(file.name));
};

/**
 * True when the file is an image format the browser can't render natively and
 * that therefore needs conversion before compression/preview/upload.
 * Currently that means HEIC/HEIF. (JPEG, PNG, WebP, GIF, BMP are all fine.)
 */
export const needsConversion = (file: File): boolean => isHeicFile(file);

/** Swap a filename's extension, e.g. "IMG_0001.HEIC" → "IMG_0001.jpg". */
const withExtension = (filename: string, ext: string): string => {
  const dot = filename.lastIndexOf('.');
  const base = dot >= 0 ? filename.slice(0, dot) : filename;
  return `${base}.${ext}`;
};

/**
 * Convert a single unsupported image (HEIC/HEIF) to a JPEG `File`.
 * Returns the original file unchanged when no conversion is needed, or when
 * conversion fails (so callers can still fall back to their own handling).
 *
 * @param file    The user-selected file.
 * @param quality JPEG quality for the converted output (0–1). Default 0.92 to
 *                preserve quality since our compressor runs afterwards.
 */
export const convertToUploadableImage = async (
  file: File,
  quality = 0.92,
): Promise<File> => {
  if (!needsConversion(file)) return file;

  try {
    // Dynamic import keeps the HEIC decoder out of the main bundle.
    // heic2any ships as UMD; depending on interop the function may be the
    // module's default export or the namespace itself — handle both.
    const mod: any = await import('heic2any');
    const heic2any = mod?.default ?? mod;
    if (typeof heic2any !== 'function') {
      throw new Error('heic2any failed to load');
    }

    const converted = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality,
    });

    // heic2any returns a Blob, or Blob[] for multi-image (sequence) HEICs.
    const blob = Array.isArray(converted) ? converted[0] : converted;

    return new File([blob], withExtension(file.name, 'jpg'), {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch (error) {
    logger.error('HEIC/HEIF conversion failed, using original file', error);
    // Fall back to the original file — the caller decides what to do next.
    return file;
  }
};

/**
 * Convert every unsupported image in a list to an uploadable one, leaving
 * already-supported files untouched. Runs conversions sequentially to avoid
 * spawning many heavy decoders at once on low-powered mobile devices.
 */
export const convertToUploadableImages = async (files: File[]): Promise<File[]> => {
  const out: File[] = [];
  for (const file of files) {
    out.push(await convertToUploadableImage(file));
  }
  return out;
};
