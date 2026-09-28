/**
 * Choose a news article's cover without storing anything new on Cloudinary.
 *
 * Order:
 *  1. A City Gallery photo for a city the article names (title first, then
 *     excerpt) — already on Cloudinary, so it costs nothing extra.
 *  2. The article's own og:image URL, kept as a link. It is fetched once, when
 *     the article is saved, and shown through our resizing image proxy.
 *  3. A City Gallery photo from the article's country.
 *  4. Nothing — the card falls back to its gradient.
 *
 * Pure: the caller loads the gallery and the og:image.
 */

export interface GalleryCity {
  city: string;
  country: string;
  imageUrl: string;
}

export interface NewsCoverInput {
  title: string;
  excerpt?: string;
  country?: string;
  /** Page URL, used to resolve a relative og:image. */
  articleUrl: string;
  ogImage?: string | null;
}

export type NewsCoverSource = 'city-gallery' | 'article' | 'country-gallery';

export interface NewsCover {
  url: string;
  source: NewsCoverSource;
}

/** Lowercase, accent-free, punctuation-collapsed: "Prishtinë, Kosovo" → "prishtine kosovo". */
export const normalizeText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Country key that treats "Bosnia and Herzegovina" and "Bosnia & Herzegovina" as one. */
export const countryKey = (country: string): string => normalizeText(country).replace(/\band\b/g, '').replace(/\s+/g, ' ').trim();

const MAX_URL_LENGTH = 2048;

/** An absolute https URL, or null. Relative og:image paths resolve against the article. */
export const usableImageUrl = (raw: string | null | undefined, base?: string): string | null => {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed.length > MAX_URL_LENGTH || trimmed.startsWith('data:')) return null;
  try {
    const url = base ? new URL(trimmed, base) : new URL(trimmed);
    if (url.protocol === 'http:') url.protocol = 'https:';
    if (url.protocol !== 'https:') return null;
    // SVG covers are skipped: the proxy refuses them (they can carry script).
    if (/\.svg$/i.test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
};

/**
 * The gallery city named in `text`, matched on whole words. Longer names win,
 * so "Novi Sad" is chosen over a shorter name contained in the same text.
 *
 * When the article's country is known, only that country's cities count:
 * several city names are ordinary English words ("Split", "Bar"), and an
 * article about Serbia saying "a split market" must not get a Croatian photo.
 */
export const findGalleryCity = (text: string, cities: GalleryCity[], country?: string): GalleryCity | null => {
  const haystack = ` ${normalizeText(text)} `;
  const wantedCountry = country ? countryKey(country) : '';
  const candidates = cities
    .filter((c) => !wantedCountry || countryKey(c.country) === wantedCountry)
    .map((c) => ({ city: c, needle: normalizeText(c.city) }))
    .filter((c) => c.needle.length >= 3) // 1–2 letters would match noise
    .sort((a, b) => b.needle.length - a.needle.length);

  for (const { city, needle } of candidates) {
    if (haystack.includes(` ${needle} `) && usableImageUrl(city.imageUrl)) return city;
  }
  return null;
};

export const pickNewsCover = (input: NewsCoverInput, gallery: GalleryCity[]): NewsCover | null => {
  const inTitle = findGalleryCity(input.title, gallery, input.country);
  const named = inTitle || (input.excerpt ? findGalleryCity(input.excerpt, gallery, input.country) : null);
  if (named) return { url: usableImageUrl(named.imageUrl)!, source: 'city-gallery' };

  const og = usableImageUrl(input.ogImage, input.articleUrl);
  if (og) return { url: og, source: 'article' };

  if (input.country) {
    const country = countryKey(input.country);
    const sameCountry = gallery.find((c) => countryKey(c.country) === country && usableImageUrl(c.imageUrl));
    if (sameCountry) return { url: usableImageUrl(sameCountry.imageUrl)!, source: 'country-gallery' };
  }

  return null;
};
