/**
 * Readable folder names: "{name}_{id}" — the name first so folders sort
 * alphabetically in the R2 dashboard, the id after it so a folder stays
 * unique and findable by id even after the user or listing is renamed.
 *
 * Names are only for people browsing the bucket. Nothing in the app finds a
 * photo by its folder name: deletes and cleanup go by id through MediaAsset.
 *
 * Pure, so it can be unit tested without R2 or Mongo.
 */

const SEGMENT_MAX = 40;

/**
 * Turn any label into a lowercase, accent-free, URL-safe slug.
 * "Ëndrit Hoxha" → "endrit-hoxha"; returns '' when nothing usable is left.
 */
export const slugify = (text: string | undefined | null, maxLen = SEGMENT_MAX): string => {
  if (!text || typeof text !== 'string') return '';
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/g, '');
};

/** Keep an id to characters safe in an object key. */
export const safeId = (id: string | undefined | null): string =>
  typeof id === 'string' ? id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) : '';

/**
 * "{name}_{id}" — the readable, still-unique folder name for an entity.
 * Falls back to just the id when there is no usable name.
 */
export const namedSegment = (
  name: string | undefined | null,
  id: string | undefined | null,
  fallback = 'unknown',
  maxNameLen = SEGMENT_MAX
): string => {
  const cleanId = safeId(id) || fallback;
  const slug = slugify(name, maxNameLen);
  return slug ? `${slug}_${cleanId}` : cleanId;
};
