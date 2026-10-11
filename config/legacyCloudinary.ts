/**
 * Listing photos uploaded before R2 can stay on Cloudinary (see
 * docs/MEDIA_STORAGE.md). They are shown through the image proxy like any
 * external photo; this only tells features that need "one of our own
 * photos" (the AI room styler) that such a URL counts.
 */
export const isCloudinaryPhotoUrl = (url: string | undefined): boolean =>
  !!url && /^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\//.test(url);
