/**
 * IndexNow: telling Bing (and Yandex, Seznam, Naver, Yep) that a page changed,
 * so it is recrawled in minutes instead of whenever the crawler next passes.
 * Bing's index also feeds Microsoft Copilot and other AI search tools.
 *
 * The key is public by design: the protocol proves we own the site by
 * serving it at https://balkanestateai.com/{key}.txt (public/{key}.txt in the
 * frontend). Change both together; a test checks they match.
 */

export const INDEXNOW_KEY = '84bf4a228a1ff676dc80f732d96f954d';

/** Shared endpoint: one submission reaches every participating search engine. */
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/** Most URLs the protocol accepts in one submission. */
export const INDEXNOW_MAX_URLS = 10_000;

/**
 * Only production pings: a staging or local server must not announce URLs
 * (they name the production site, but the change did not happen there).
 * INDEXNOW_ENABLED=false switches it off in production too.
 */
export const isIndexNowEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.NODE_ENV === 'production' && env.INDEXNOW_ENABLED !== 'false';
