import { pageUrlFor, pageUrlPatterns, type PageUrlPattern } from './pageUrlGuesses';

export interface LoadedPage<T> {
  items: T[];
  /** The page's own "next" link, when it shows one. */
  nextUrl?: string;
}

export interface WalkPagesOptions<T> {
  /** URL of the first page — also the base the page-URL patterns are built on. */
  firstUrl: string;
  /** Fixed pattern (e.g. a configured `?page=N` param); skips link-following and guessing. */
  pattern?: PageUrlPattern;
  firstPageNo?: number;
  maxPages: number;
  limit?: number;
  /** Epoch ms after which no further page is fetched. */
  deadline?: number;
  load: (url: string, pageNo: number) => Promise<LoadedPage<T>>;
  /** Stable identity of an item, used to tell new items from repeats. */
  keyOf: (item: T) => string;
  onPage?: (itemsSoFar: number) => void;
  /** Guess the page-URL pattern when page 1 has no next link. Default true. */
  guessPattern?: boolean;
}

const isPastDeadline = (deadline?: number) => deadline !== undefined && Date.now() > deadline;

/**
 * When the first page shows no next link, try the common page-URL patterns
 * for page 2 and keep the first that brings items not seen on page 1.
 */
const guessSecondPage = async <T>(
  opts: WalkPagesOptions<T>,
  perPage: number,
  seen: Set<string>
): Promise<{ pattern: PageUrlPattern; url: string; page: LoadedPage<T> } | null> => {
  for (const pattern of pageUrlPatterns(opts.firstUrl, perPage)) {
    if (isPastDeadline(opts.deadline)) return null;
    const url = pageUrlFor(opts.firstUrl, pattern, 2);
    if (url === opts.firstUrl) continue;
    try {
      const page = await opts.load(url, 2);
      if (page.items.some((it) => !seen.has(opts.keyOf(it)))) return { pattern, url, page };
    } catch {
      // This guess isn't a valid page on the site — try the next one.
    }
  }
  return null;
};

/**
 * Walk every page of a paginated listing source and return all items in
 * page order, de-duplicated. Next page = configured pattern → the page's own
 * next link → (after page 1 only) a guessed pattern. Stops on the last page
 * (no next page, or a page with nothing new), on a loop, at `limit`,
 * `maxPages` or the deadline.
 */
export const walkPages = async <T>(opts: WalkPagesOptions<T>): Promise<T[]> => {
  const all: T[] = [];
  const seen = new Set<string>();
  const visited = new Set<string>();
  let pattern = opts.pattern;
  let pageNo = opts.firstPageNo ?? 1;
  let url: string | undefined = pattern ? pageUrlFor(opts.firstUrl, pattern, pageNo) : opts.firstUrl;
  let prefetched: { url: string; page: LoadedPage<T> } | null = null;

  for (let i = 0; i < opts.maxPages && url; i++) {
    if (visited.has(url) || isPastDeadline(opts.deadline)) break;
    visited.add(url);

    let page: LoadedPage<T>;
    if (prefetched?.url === url) {
      page = prefetched.page;
    } else if (i === 0) {
      page = await opts.load(url, pageNo); // the first page failing is a real error
    } else {
      try {
        page = await opts.load(url, pageNo);
      } catch {
        break; // many APIs answer 400/404 past the last page
      }
    }
    prefetched = null;

    const fresh = page.items.filter((it) => {
      const key = opts.keyOf(it);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    all.push(...fresh);
    opts.onPage?.(all.length);
    if (opts.limit && all.length >= opts.limit) break;
    if (fresh.length === 0) break;

    let next = pattern ? pageUrlFor(opts.firstUrl, pattern, pageNo + 1) : page.nextUrl;
    if (!next && i === 0 && opts.guessPattern !== false) {
      const guess = await guessSecondPage(opts, fresh.length, seen);
      if (guess) {
        pattern = guess.pattern;
        next = guess.url;
        prefetched = { url: guess.url, page: guess.page };
      }
    }
    url = next;
    pageNo++;
  }

  return opts.limit ? all.slice(0, opts.limit) : all;
};
