/** Known source hostnames for Balkan real-estate websites. */
export const KNOWN_SOURCES: readonly string[] = [
  'nekretnine.ba',
  'halooglasi.com',
  'cityexpert.rs',
  '4zida.rs',
  'njuskalo.hr',
  'index.hr',
  'bolha.com',
] as const;

/**
 * Detect the source name for a given URL by matching its hostname against known sources.
 * Returns the matched source name (e.g. 'nekretnine.ba') or null if unrecognised.
 */
export const detectSource = (url: string): string | null => {
  try {
    const { hostname } = new URL(url);
    const normalizedHostname = hostname.replace(/^www\./, '');
    const match = KNOWN_SOURCES.find(
      (source) => normalizedHostname === source || normalizedHostname.endsWith(`.${source}`)
    );
    return match ?? null;
  } catch {
    return null;
  }
};

/**
 * Returns true when the URL pathname looks like a single property detail page
 * rather than a listing index/search results page.
 */
export const looksLikeListingPath = (url: string): boolean => {
  try {
    const { pathname } = new URL(url);
    // Heuristic: detail pages typically contain a numeric ID or a long slug
    return /\/[a-z0-9-]{6,}(\/|\?|$)/i.test(pathname) && !/\/(search|pretraga|iskanje|oglasi|listings?)(\/|$)/i.test(pathname);
  } catch {
    return false;
  }
};
