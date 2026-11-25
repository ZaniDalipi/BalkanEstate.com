/**
 * The open photo of a listing's full-screen viewer lives in the URL as
 * `?photo=N` (1-based, counted over every photo of the listing), so each photo
 * has its own shareable link and the browser's Back closes the viewer.
 */
export const PHOTO_PARAM = 'photo';

/** History-state marker: this entry was added by opening the viewer, so closing it steps back. */
export const PHOTO_VIEWER_PUSHED = 'bePhotoViewer';

/** 0-based index of the photo named in `search`, or null when absent or out of range. */
export function parsePhotoParam(search: string, count: number): number | null {
  const raw = new URLSearchParams(search).get(PHOTO_PARAM);
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= count ? n - 1 : null;
}

/** `search` with the photo set to `index` (0-based), or removed when null. Keeps other params. */
export function withPhotoParam(search: string, index: number | null): string {
  const params = new URLSearchParams(search);
  if (index === null) params.delete(PHOTO_PARAM);
  else params.set(PHOTO_PARAM, String(index + 1));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

type GalleryImage = { url: string };

/**
 * Which photos the viewer pages through and where it starts, for the photo at
 * `photoIndex` of `allImages`: the gallery's current category when that photo is
 * in it, otherwise every photo (a shared link knows nothing of the category).
 */
export function resolveViewerImages<T extends GalleryImage>(
  allImages: T[],
  categoryImages: T[],
  photoIndex: number,
): { images: T[]; start: number } {
  const url = allImages[photoIndex]?.url;
  const inCategory = categoryImages.findIndex((img) => img.url === url);
  return inCategory >= 0 ? { images: categoryImages, start: inCategory } : { images: allImages, start: photoIndex };
}
