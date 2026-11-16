/**
 * Pure helpers that read a single-page app's JavaScript for the addresses of
 * the API it loads its listings from — so a React/Vue/Angular site can be
 * imported without a headless browser.
 */

/** Words a listings endpoint's path tends to carry (English and Balkan languages). */
const LISTING_WORD_RE = /(product|propert|listing|estate|apartment|house|home|offer|item|advert|\bads?\b|post|oglas|nekretnin|banes|shtepi|prona|objekt|stan|imot|anunt|catalog)/i;

/** Hosts that are never the site's own data API. */
const NOISE_HOST_RE = /(google|gstatic|facebook|fbcdn|twitter|instagram|linkedin|youtube|tiktok|whatsapp|wa\.me|github|w3\.org|reactjs|vuejs|angular\.io|mozilla|schema\.org|jsdelivr|unpkg|cdnjs|fonts\.|sentry|hotjar|segment|mixpanel|clarity|doubleclick|intercom|mapbox|openstreetmap|tile\.|arcgis|leaflet|cloudinary|imgix|gravatar|stripe|paypal|localhost|127\.0\.0\.1|0\.0\.0\.0|example\.com|tailwindcss|fontawesome|polyfill)/i;

const ASSET_EXT_RE = /\.(?:png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|map|woff2?|ttf|eot|mp4|webm|mp3|pdf)(?:$|\?)/i;

/** Host or path that says "this is a backend": api.foo.com, foo.onrender.com, /api, /v1 … */
const BACKEND_HINT_RE = /(\bapi\b|backend|server|herokuapp|onrender|railway|fly\.dev|azurewebsites|ngrok|amazonaws|\.run\.app|vercel\.app|\/v\d\b|\/rest\b|\/graphql\b|\.netlify\/functions)/i;

const MAX_BASES = 4;
const MAX_PATHS = 8;
const MAX_CANDIDATES = 20;

const ABSOLUTE_URL_RE = /https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?(?:\/[A-Za-z0-9_\-./]*)?/gi;
/** A path inside a string or template literal: "/products", `${API}/products`, '/api/property/list' */
const PATH_IN_STRING_RE = /["'`}](\/[A-Za-z][A-Za-z0-9_\-/]{1,60})(?=["'`?$])/g;

const uniq = <T>(xs: T[]): T[] => [...new Set(xs)];
const trimSlash = (s: string): string => s.replace(/\/+$/, '');

const joinUrl = (base: string, path: string): string => {
  const b = trimSlash(base);
  // `https://x.com/api` + `/api/products` must not become `/api/api/products`.
  const firstSeg = path.split('/')[1];
  if (firstSeg && b.endsWith(`/${firstSeg}`)) return `${b}${path.slice(firstSeg.length + 1)}`;
  return `${b}${path}`;
};

export interface ApiCandidates {
  /** Absolute addresses to GET, most promising first. */
  urls: string[];
}

/**
 * Addresses worth probing for listings, from the app's JavaScript.
 *
 * Absolute URLs that already name listings come first, then each API base
 * combined with each listing-ish path, then the pasted page's own path on each
 * base (apps often mirror their API routes), then the bare bases.
 */
export const extractApiCandidates = (scripts: string[], pageUrl: string): ApiCandidates => {
  const page = new URL(pageUrl);
  const text = scripts.join('\n');

  const absolute = uniq((text.match(ABSOLUTE_URL_RE) ?? []).map(trimSlash)).filter((u) => {
    try {
      const { host, pathname } = new URL(u);
      return !NOISE_HOST_RE.test(host) && !ASSET_EXT_RE.test(pathname);
    } catch { return false; }
  });

  const backendUrls = absolute.filter((u) => BACKEND_HINT_RE.test(u) || new URL(u).host !== page.host);
  const directListingUrls = backendUrls.filter((u) => LISTING_WORD_RE.test(new URL(u).pathname));

  const bases = uniq([
    ...backendUrls
      .filter((u) => BACKEND_HINT_RE.test(u))
      .map((u) => {
        const url = new URL(u);
        // Keep an API prefix like /api or /api/v1, drop everything after it.
        const prefix = /^\/(?:api|rest|backend|v\d)(?:\/v\d)?/i.exec(url.pathname)?.[0] ?? '';
        return `${url.origin}${prefix}`;
      }),
    `${page.origin}/api`,
  ]).slice(0, MAX_BASES);

  const paths = uniq(
    [...text.matchAll(PATH_IN_STRING_RE)]
      .map((m) => trimSlash(m[1]))
      .filter((p) => LISTING_WORD_RE.test(p) && !ASSET_EXT_RE.test(p))
  ).slice(0, MAX_PATHS);

  const pagePath = trimSlash(page.pathname);
  const combos = bases.flatMap((b) => paths.map((p) => joinUrl(b, p)));
  const mirrored = pagePath && pagePath !== '' ? bases.map((b) => joinUrl(b, pagePath)) : [];

  const urls = uniq([...directListingUrls, ...combos, ...mirrored, ...bases])
    .filter((u) => trimSlash(u) !== trimSlash(pageUrl))
    .slice(0, MAX_CANDIDATES);
  return { urls };
};

/** Script files a page loads, plus the lazily loaded route chunks they name (listing pages first). */
export const scriptUrlsFromHtml = (html: string, pageUrl: string): string[] => {
  const found: string[] = [];
  const re = /<(?:script[^>]*\ssrc|link[^>]*rel=["']?modulepreload["']?[^>]*\shref)=["']([^"']+)["']/gi;
  for (const m of html.matchAll(re)) {
    try { found.push(new URL(m[1], pageUrl).toString()); } catch { /* bad URL */ }
  }
  return uniq(found).filter((u) => !NOISE_HOST_RE.test(new URL(u).host));
};

/** Route chunks a bundle imports lazily (`import("./ProductList-a1b2.js")`), listing-named first. */
export const chunkUrlsFromBundle = (js: string, bundleUrl: string): string[] => {
  const re = /["'`(]((?:\.{1,2}\/|\/)?(?:assets\/|static\/js\/|js\/|_next\/static\/chunks\/)?[A-Za-z0-9_\-.]+\.js)["'`)]/g;
  const urls: string[] = [];
  for (const m of js.matchAll(re)) {
    if (!/[-.][A-Za-z0-9_]{6,}\.js$/.test(m[1])) continue; // hashed build files only
    try { urls.push(new URL(m[1], bundleUrl).toString()); } catch { /* bad URL */ }
  }
  const unique = uniq(urls).filter((u) => u !== bundleUrl);
  const named = unique.filter((u) => LISTING_WORD_RE.test(u.split('/').pop() ?? ''));
  return uniq([...named, ...unique]);
};

/** True when the page is an empty app shell that JavaScript fills in. */
export const looksLikeAppShell = (html: string): boolean => {
  const body = html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const hasMount = /<(?:div|main)[^>]*\sid=["'](?:root|app|__next|__nuxt|main-app)["']|<app-root|ng-version=/i.test(html);
  return body.length < 300 || (hasMount && body.length < 2000);
};
