/**
 * Client-side checks for unit gallery uploads, mirroring the backend limits
 * (developmentDashboardRoutes → galleryImages, unitAdminService →
 * MAX_UNIT_GALLERY). The server re-checks everything.
 */
export const GALLERY_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const GALLERY_MAX_BYTES = 10 * 1024 * 1024;
/** Files per upload request. */
export const GALLERY_MAX_PER_UPLOAD = 10;
/** Images a unit gallery can hold. */
export const GALLERY_MAX_TOTAL = 30;

export type GalleryFileProblem = 'type' | 'size' | 'batch' | 'full';

/** The first problem with uploading `files` to a gallery that already holds `existing` images, or null. */
export const checkGalleryFiles = (files: File[], existing: number): GalleryFileProblem | null => {
  if (existing + files.length > GALLERY_MAX_TOTAL) return 'full';
  if (files.length > GALLERY_MAX_PER_UPLOAD) return 'batch';
  if (files.some((f) => !GALLERY_TYPES.includes(f.type))) return 'type';
  if (files.some((f) => f.size > GALLERY_MAX_BYTES)) return 'size';
  return null;
};
