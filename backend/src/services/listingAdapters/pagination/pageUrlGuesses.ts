/**
 * URL patterns sites use for "page N" of a listings index, used when the page
 * shows no next link (infinite scroll, "Load more" buttons, JS pagination) but
 * the server still answers `?page=2` & co. The adapter tries each guess for
 * page 2 and keeps the first one that returns listings it hasn't seen yet.
 */

export type PageUrlPattern =
  | { kind: 'query'; param: string; base: 1 | 0 }
  | { kind: 'offset'; param: string; perPage: number }
  | { kind: 'path'; segment: string };

const PAGE_PARAMS = ['page', 'p', 'pg', 'paged', 'strana', 'stranica', 'str', 'pagina', 'seite', 'faqe', 'pageNumber', 'currentPage'];
const OFFSET_PARAMS = ['offset', 'start', 'from', 'skip'];

/** Build the URL of page `page` (1-based) under `pattern`. */
export const pageUrlFor = (indexUrl: string, pattern: PageUrlPattern, page: number): string => {
  const u = new URL(indexUrl);
  if (pattern.kind === 'query') {
    u.searchParams.set(pattern.param, String(pattern.base === 1 ? page : page - 1));
    return u.toString();
  }
  if (pattern.kind === 'offset') {
    u.searchParams.set(pattern.param, String((page - 1) * pattern.perPage));
    return u.toString();
  }
  // Path style: /nekretnine/ → /nekretnine/page/2/ (replacing an existing /page/N).
  const re = new RegExp(`/${pattern.segment}/\\d+/?$`, 'i');
  const path = u.pathname.replace(re, '').replace(/\/$/, '');
  u.pathname = page === 1 ? `${path}/` : `${path}/${pattern.segment}/${page}/`;
  return u.toString();
};

/**
 * Candidate patterns, most likely first, capped at `max`. A param the URL
 * already carries (e.g. `?page=1`) goes first; `perPage` is how many listings
 * page 1 showed (needed for offset-style paging).
 */
export const pageUrlPatterns = (indexUrl: string, perPage: number, max = 10): PageUrlPattern[] => {
  let present: string[] = [];
  try {
    present = Array.from(new URL(indexUrl).searchParams.keys());
  } catch {
    return [];
  }
  const q = (param: string): PageUrlPattern => ({ kind: 'query', param, base: 1 });
  const off = (param: string): PageUrlPattern[] => (perPage > 0 ? [{ kind: 'offset', param, perPage }] : []);
  const path = (segment: string): PageUrlPattern => ({ kind: 'path', segment });
  const ranked: PageUrlPattern[] = [
    q('page'), path('page'), q('p'), q('paged'), q('strana'), q('stranica'), q('str'),
    ...off('offset'), q('pg'), ...off('start'), q('pagina'), q('seite'), q('faqe'), path('strana'),
    ...off('from'), q('pageNumber'), q('currentPage'), path('stranica'), path('p'), ...off('skip'),
  ];
  const already = PAGE_PARAMS.concat(OFFSET_PARAMS).filter((k) => present.includes(k));
  const first = ranked.filter((p) => p.kind !== 'path' && already.includes(p.param));
  const rest = ranked.filter((p) => !first.includes(p));
  return [...first, ...rest].slice(0, Math.max(max, first.length));
};
