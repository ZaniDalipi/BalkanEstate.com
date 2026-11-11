import type * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { selectListingPhotos } from './listingPhotos';

/**
 * The photos of the listing a detail page shows. A page also carries the
 * site's logo, language flags, map markers, the agent's portrait and photos
 * of "similar listings"; images in those parts of the page are skipped.
 */

/** Class names containing `word` as a whole word: "agent", "agent-card", "sw_win_map" — not "management". */
const classWord = (word: string): string =>
  [`[class~="${word}" i]`, `[class*="${word}-" i]`, `[class*="-${word}" i]`, `[class*="${word}_" i]`, `[class*="_${word}" i]`].join(', ');

const NOT_THIS_LISTING = [
  'footer', 'nav', 'aside', 'form', 'body > header', '#masthead', '.site-header', '#header',
  '[class*="similar" i]', '[class*="related" i]', '[class*="recommend" i]', '[class*="other-listing" i]',
  '[class*="more-listing" i]', '[class*="slicn" i]', '[class*="te-ngjashme" i]',
  '[id*="similar" i]', '[id*="related" i]',
  classWord('agent'), classWord('agency'), classWord('author'), classWord('logo'),
  classWord('sidebar'), classWord('flag'), classWord('flags'), classWord('language'), classWord('lang'),
  classWord('map'), classWord('maps'), classWord('marker'), classWord('advert'), classWord('ads'), classWord('cookie'),
].join(', ');

const LAZY_ATTRS = ['data-full', 'data-full-image', 'data-src', 'data-lazy-src', 'data-original', 'data-lazy', 'data-image', 'data-image-url', 'src'];

const resolve = (base: string, href: string): string => {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
};

/** The largest entry of a srcset ("a.jpg 480w, b.jpg 1200w" → b.jpg). */
const largestInSrcset = (srcset: string | undefined): string | undefined => {
  if (!srcset) return undefined;
  let best: { url: string; width: number } | undefined;
  for (const part of srcset.split(',')) {
    const [url, w] = part.trim().split(/\s+/);
    const width = parseInt((w ?? '0').replace(/\D/g, ''), 10) || 0;
    if (url && (!best || width > best.width)) best = { url, width };
  }
  return best?.url;
};

const urlsOf = ($: cheerio.CheerioAPI, el: AnyNode): string[] => {
  const $el = $(el);
  const out: string[] = [];
  const tag = (el as { tagName?: string }).tagName?.toLowerCase();
  if (tag === 'a') {
    const href = $el.attr('href') ?? $el.attr('data-fancybox-href');
    if (href) out.push(href);
    return out;
  }
  const attr = LAZY_ATTRS.map((a) => $el.attr(a)).find(Boolean);
  if (attr) out.push(attr);
  const set = largestInSrcset($el.attr('srcset') ?? $el.attr('data-srcset'));
  if (set) out.push(set);
  const bg = $el.attr('style')?.match(/url\(['"]?([^'")]+)['"]?\)/i)?.[1];
  if (bg) out.push(bg);
  return out;
};

const CANDIDATES = [
  'img', 'picture source',
  '[data-full]', '[data-full-image]', '[data-image]', '[data-image-url]', '[data-gallery-image]', '[data-photo]',
  '[data-fancybox]', '[data-lightbox]', '.swiper-slide', '.slick-slide', '.gallery-item',
  'a[href$=".jpg" i], a[href$=".jpeg" i], a[href$=".png" i], a[href$=".webp" i]',
].join(', ');

/** Image URLs written in the page's scripts — gallery data some sites only keep there. */
const urlsInScripts = ($: cheerio.CheerioAPI): string[] => {
  const out: string[] = [];
  $('script:not([src])').each((_, el) => {
    const code = $(el).contents().text();
    for (const m of code.matchAll(/["'](https?:\/\/[^"'\s]+\.(?:jpe?g|png|webp))["']/gi)) out.push(m[1]);
  });
  return out;
};

/** The listing's photos on a detail page, in page order, at most as many as a listing may have. */
export const photosOnPage = ($: cheerio.CheerioAPI, baseUrl: string): string[] => {
  const found: string[] = [];
  $(CANDIDATES).each((_, el) => {
    // Only containers below <body>: body classes describe the whole page ("wp-custom-logo").
    if ($(el).parentsUntil('body').addBack().filter(NOT_THIS_LISTING).length) return;
    for (const u of urlsOf($, el)) found.push(resolve(baseUrl, u));
  });
  const photos = selectListingPhotos(found);
  // Some galleries are built by script from data only the script holds.
  return photos.length >= 3 ? photos : selectListingPhotos([...found, ...urlsInScripts($)]);
};
