/**
 * Shared builder for the per-page part of the HTML shell.
 *
 * Used at build time by scripts/prerender.mjs (static pages) and at request
 * time by the Cloudflare Pages Functions in /functions (listings, articles,
 * agent and agency profiles), so both emit the same tags in the same way.
 *
 * index.html marks two regions:
 *
 *   <!--page-head:start--> … <!--page-head:end-->   title, description, robots,
 *                                                     canonical, hreflang, OG,
 *                                                     Twitter, per-page JSON-LD
 *   <!--page-body:start--> … <!--page-body:end-->   crawlable page content
 *                                                     inside #root
 *
 * Every tag in the head region carries data-rh="true" so react-helmet-async
 * treats it as its own and replaces it once the SPA renders the page — the
 * browser never ends up with two canonicals or two robots tags.
 *
 * The body region is replaced by React on mount (createRoot), so it is what
 * crawlers and no-JS visitors read; humans see the app.
 *
 * Canonical URL scheme: every page lives under a language prefix
 * (/en/search, /sq/search). Unprefixed URLs are redirected by the SPA and must
 * never be declared canonical.
 */

export const SITE_URL = 'https://balkanestateai.com';
export const SITE_NAME = 'BalkanEstateAI';
export const DEFAULT_LANG = 'en';
export const LANGUAGES = ['en', 'sq', 'sr', 'bg', 'hr', 'bs', 'mk', 'me', 'ro', 'el'];
export const OG_LOCALE_MAP = {
  en: 'en_US', sq: 'sq_AL', sr: 'sr_RS', bg: 'bg_BG',
  hr: 'hr_HR', bs: 'bs_BA', mk: 'mk_MK', me: 'sr_ME',
  ro: 'ro_RO', el: 'el_GR',
};
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

/**
 * hreflang / <html lang> value for each URL language. "me" is the site's
 * prefix for Montenegrin but not a language code (it is the country code);
 * the valid tag is sr-ME.
 */
export const HREFLANG = Object.fromEntries(LANGUAGES.map((l) => [l, l === 'me' ? 'sr-ME' : l]));

export const HEAD_START = '<!--page-head:start-->';
export const HEAD_END = '<!--page-head:end-->';
export const BODY_START = '<!--page-body:start-->';
export const BODY_END = '<!--page-body:end-->';

/** Robots values used across the site. */
export const ROBOTS_INDEX = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
export const ROBOTS_NOINDEX = 'noindex, follow';

/** @param {unknown} value */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** JSON for a <script type="application/ld+json"> block, safe against `</script>`. */
export function jsonLdScript(data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/ld+json" data-rh="true">${json}</script>`;
}

/**
 * Absolute URL of an app path in a language. `path` is the language-less app
 * path ("/", "/search", "/property/abc"), optionally with a query string.
 * @param {string} lang
 * @param {string} path
 */
export function pageUrl(lang, path) {
  const clean = !path || path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}/${lang}${clean}`;
}

/**
 * hreflang alternates for a path in every supported language, plus x-default
 * pointing at the English page.
 * @param {string} path
 */
export function alternateLinks(path) {
  const links = LANGUAGES.map(
    (lang) => `<link rel="alternate" hreflang="${HREFLANG[lang]}" href="${escapeHtml(pageUrl(lang, path))}" data-rh="true" />`,
  );
  links.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(pageUrl(DEFAULT_LANG, path))}" data-rh="true" />`);
  return links.join('\n    ');
}

/**
 * @typedef {object} PageHead
 * @property {string} lang
 * @property {string} title          Full title, including the site name.
 * @property {string} description
 * @property {string} [path]         Language-less app path. Omit for no canonical/hreflang.
 * @property {string} [robots]
 * @property {string} [image]
 * @property {string} [imageAlt]
 * @property {boolean} [imageSized]  True only when the image is known to be 1200×630.
 * @property {string} [ogType]
 * @property {boolean} [alternates]  Emit hreflang links (default: true when path is set).
 * @property {string} [canonicalLang] Language of the canonical URL when it differs
 *                                   from `lang` (content that exists in one language only).
 * @property {string[]} [extraMeta]  Additional, already-escaped tags.
 * @property {object[]} [jsonLd]
 */

/** @param {PageHead} page */
export function buildHead(page) {
  const {
    lang,
    title,
    description,
    path,
    robots = ROBOTS_INDEX,
    image = DEFAULT_IMAGE,
    imageAlt = title,
    imageSized = image === DEFAULT_IMAGE,
    ogType = 'website',
    alternates = true,
    canonicalLang = lang,
    extraMeta = [],
    jsonLd = [],
  } = page;
  const canonical = path ? pageUrl(canonicalLang, path) : null;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const img = escapeHtml(image);
  const alt = escapeHtml(imageAlt);

  const tags = [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" data-rh="true" />`,
    `<meta name="robots" content="${escapeHtml(robots)}" data-rh="true" />`,
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}" data-rh="true" />` : '',
    canonical && alternates ? alternateLinks(path) : '',
    `<meta property="og:type" content="${escapeHtml(ogType)}" data-rh="true" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" data-rh="true" />`,
    `<meta property="og:title" content="${t}" data-rh="true" />`,
    `<meta property="og:description" content="${d}" data-rh="true" />`,
    canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}" data-rh="true" />` : '',
    `<meta property="og:image" content="${img}" data-rh="true" />`,
    imageSized ? `<meta property="og:image:width" content="1200" data-rh="true" />` : '',
    imageSized ? `<meta property="og:image:height" content="630" data-rh="true" />` : '',
    `<meta property="og:image:alt" content="${alt}" data-rh="true" />`,
    `<meta property="og:locale" content="${OG_LOCALE_MAP[lang] || 'en_US'}" data-rh="true" />`,
    `<meta name="twitter:card" content="${imageSized ? 'summary_large_image' : 'summary'}" data-rh="true" />`,
    `<meta name="twitter:title" content="${t}" data-rh="true" />`,
    `<meta name="twitter:description" content="${d}" data-rh="true" />`,
    `<meta name="twitter:image" content="${img}" data-rh="true" />`,
    `<meta name="twitter:image:alt" content="${alt}" data-rh="true" />`,
    ...extraMeta,
    ...jsonLd.map(jsonLdScript),
  ];
  return tags.filter(Boolean).join('\n    ');
}

/**
 * Put a page's head tags and body content into the shell.
 * @param {string} shell  The built index.html.
 * @param {{ lang: string, head: string, body?: string }} page
 */
export function renderPage(shell, { lang, head, body = '' }) {
  const headStart = shell.indexOf(HEAD_START);
  const headEnd = shell.indexOf(HEAD_END);
  const bodyStart = shell.indexOf(BODY_START);
  const bodyEnd = shell.indexOf(BODY_END);
  if (headStart < 0 || headEnd < headStart || bodyStart < 0 || bodyEnd < bodyStart) {
    throw new Error('HTML shell is missing the page-head / page-body markers');
  }
  const html =
    shell.slice(0, headStart + HEAD_START.length) +
    `\n    ${head}\n    ` +
    shell.slice(headEnd, bodyStart + BODY_START.length) +
    body +
    shell.slice(bodyEnd);
  return html.replace(/<html lang="[^"]*"/, `<html lang="${escapeHtml(HREFLANG[lang] || lang)}"`);
}

/** Shell markers present? Used to validate the template at build time. */
export function hasShellMarkers(shell) {
  return [HEAD_START, HEAD_END, BODY_START, BODY_END].every((m) => shell.includes(m));
}

/**
 * Plain text from a user-written description: tags stripped, whitespace
 * collapsed. Output still needs escapeHtml before going into HTML.
 * @param {unknown} text
 */
export function plainText(text) {
  return String(text ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cut text at a word boundary.
 * @param {string} text
 * @param {number} max
 */
export function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trim()}…`;
}
