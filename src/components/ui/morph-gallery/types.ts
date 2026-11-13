export type MorphItem = {
  /** Full-size image. Must be served with CORS headers to be morphed. */
  src: string;
  /** Thumbnail for the strip. Falls back to `src`, which is wasteful. */
  thumb?: string;
  alt?: string;
};

/** Every visible or spoken string, so callers can pass translations. English by default. */
export type MorphGalleryLabels = {
  region: string;
  previous: string;
  next: string;
  /** e.g. "Show image 3" */
  showImage: (n: number) => string;
  /** e.g. "3 of 6" */
  position: (n: number, total: number) => string;
};

export const DEFAULT_MORPH_LABELS: MorphGalleryLabels = {
  region: 'Image gallery',
  previous: 'Previous image',
  next: 'Next image',
  showImage: (n) => `Show image ${n}`,
  position: (n, total) => `${n} of ${total}`,
};
