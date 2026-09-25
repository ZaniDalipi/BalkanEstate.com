import { PROPERTY_IMAGE_TAGS, type PropertyImageTag } from '@/shared/types/property.types';

export interface GalleryImage {
  url: string;
  tag: PropertyImageTag;
}

/** Icon shown next to each photo category in the gallery filters. */
export const IMAGE_TAG_EMOJI: Record<PropertyImageTag | 'all', string> = {
  all: '📷',
  exterior: '🏠',
  living_room: '🛋️',
  kitchen: '🍳',
  dining_room: '🍽️',
  bedroom: '🛏️',
  kids_room: '🧸',
  bathroom: '🚿',
  wc: '🚽',
  hallway: '🚪',
  office: '💼',
  laundry: '🧺',
  storage: '📦',
  balcony: '🪴',
  terrace: '☀️',
  garden: '🌳',
  pool: '🏊',
  garage: '🚗',
  basement: '🧱',
  attic: '🪜',
  view: '🌅',
  other: '📸',
};

const isImageTag = (tag: unknown): tag is PropertyImageTag =>
  typeof tag === 'string' && (PROPERTY_IMAGE_TAGS as readonly string[]).includes(tag);

/**
 * The listing's photos in display order, each with the tag the seller picked.
 *
 * The cover (`imageUrl`) is normally also `images[0]`, and then it keeps that
 * image's tag. Only a cover that is missing from `images` (older listings) is
 * added up front, as 'exterior'. Unknown tags fall back to 'other'.
 */
export const buildGalleryImages = (
  imageUrl: string | undefined,
  images: ReadonlyArray<{ url: string; tag?: string }> | undefined,
): GalleryImage[] => {
  const list = images ?? [];
  const combined: { url: string; tag?: string }[] =
    imageUrl && !list.some((img) => img.url === imageUrl)
      ? [{ url: imageUrl, tag: 'exterior' }, ...list]
      : [...list];

  const seen = new Set<string>();
  return combined
    .filter((img) => img.url && !seen.has(img.url) && seen.add(img.url))
    .map((img) => ({ url: img.url, tag: isImageTag(img.tag) ? img.tag : 'other' }));
};

/** Photos grouped by tag, keys in the canonical `PROPERTY_IMAGE_TAGS` order. */
export const groupGalleryImagesByTag = (
  images: GalleryImage[],
): Partial<Record<PropertyImageTag, GalleryImage[]>> => {
  const groups: Partial<Record<PropertyImageTag, GalleryImage[]>> = {};
  for (const tag of PROPERTY_IMAGE_TAGS) {
    const matching = images.filter((img) => img.tag === tag);
    if (matching.length) groups[tag] = matching;
  }
  return groups;
};
