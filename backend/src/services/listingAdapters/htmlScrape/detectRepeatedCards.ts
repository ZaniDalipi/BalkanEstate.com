import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

/**
 * Structural fallback for sites whose detail links don't look like listings
 * (`/product/65f…`, `/#/view/9`): a listings page repeats one card layout many
 * times, and each card has a link plus a price or a property spec.
 */

const MIN_CARDS = 3;
const MIN_SHARE = 0.6;
const MAX_CARDS = 500;
/** The group may not match far more elements than it was counted from. */
const MAX_SELECTOR_SPREAD = 2;

const CARD_TAGS = new Set(['div', 'article', 'li', 'section']);
const SAFE_CLASS = /^[A-Za-z_][\w-]*$/;
const PRICE_RE = /\d[\d\s.,]*\s*(?:€|EUR|USD|\$|£|RSD|BAM|HRK|RON|BGN|MKD|ALL|din|kn|lek|лв|лева)|(?:€|EUR|USD|\$|£)\s*\d/i;
const SPEC_RE = /\b(?:\d+\s*(?:m2|m²|sqm|kv|bed|beds|rooms?|soba|sob[ae]|dhoma)|apartment|apartman|stan|house|kuca|kuća|shtepi|shtëpi|vila|villa|land|plot|parcel|banesë|banese)\b/i;

type Card = cheerio.Cheerio<AnyNode>;

const tagOf = (el: AnyNode): string => (el as { tagName?: string }).tagName?.toLowerCase() ?? '';

const hasInternalLink = ($: cheerio.CheerioAPI, $card: Card, pageUrl: string): boolean => {
  const origin = new URL(pageUrl).origin;
  return $card.find('a[href]').toArray().some((a) => {
    const href = $(a).attr('href') ?? '';
    if (!href || /^(#|javascript:|mailto:|tel:)/i.test(href)) return false;
    try { return new URL(href, pageUrl).origin === origin; } catch { return false; }
  });
};

const looksLikeListing = ($card: Card): boolean => {
  const text = $card.text().replace(/\s+/g, ' ');
  return PRICE_RE.test(text) || SPEC_RE.test(text);
};

/** `div.card.card--big`, using only class names CSS can take as they are. */
const selectorFor = (tag: string, classes: string[]): string | null => {
  const safe = classes.filter((c) => SAFE_CLASS.test(c));
  return safe.length ? `${tag}.${safe.join('.')}` : null;
};

export interface RepeatedCards {
  selector: string;
  count: number;
}

/** The card selector of the most-repeated listing-like block on the page, or null. */
export const detectRepeatedCards = (html: string, pageUrl: string): RepeatedCards | null => {
  const $ = cheerio.load(html);
  $('script, style, noscript, nav, header, footer').remove();

  let best: RepeatedCards | null = null;
  $('body *').each((_, parent) => {
    const groups = new Map<string, AnyNode[]>();
    $(parent).children().each((__, child) => {
      const tag = tagOf(child);
      if (!CARD_TAGS.has(tag)) return;
      const classes = ($(child).attr('class') ?? '').split(/\s+/).filter(Boolean).sort();
      const key = `${tag}|${classes.join(' ')}`;
      groups.set(key, [...(groups.get(key) ?? []), child]);
    });

    for (const [key, cards] of groups) {
      if (cards.length < MIN_CARDS || cards.length > MAX_CARDS) continue;
      if (best && cards.length <= best.count) continue;
      const qualifying = cards.filter((c) => hasInternalLink($, $(c), pageUrl) && looksLikeListing($(c)));
      if (qualifying.length < MIN_CARDS || qualifying.length / cards.length < MIN_SHARE) continue;

      const [tag, classText] = key.split('|');
      const selector = selectorFor(tag, classText.split(' ').filter(Boolean));
      if (!selector || $(selector).length > cards.length * MAX_SELECTOR_SPREAD) continue;
      best = { selector, count: qualifying.length };
    }
  });
  return best;
};
