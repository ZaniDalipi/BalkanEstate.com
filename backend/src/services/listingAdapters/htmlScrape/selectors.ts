import type * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

/** Per-card CSS selectors. `css|attr:name` reads an attribute instead of the text. */
export interface SelectorMap {
  /** CSS selector that matches each listing card on the index page. */
  listingItem: string;
  /** Selector resolving to the listing's canonical detail URL. Use `attr:href` syntax. */
  link: string;
  /** Selector for the source-side id; falls back to detail URL. */
  id?: string;
  title?: string;
  price?: string;
  description?: string;
  city?: string;
  /** Location line on the card ("Zagreb, Trešnjevka"); read as the city when `city` is absent. */
  location?: string;
  address?: string;
  beds?: string;
  baths?: string;
  sqft?: string;
  image?: string;
  images?: string;
  propertyType?: string;
  /** Free-form selectors stored in `raw.extras`. */
  extras?: Record<string, string>;
}

const ATTR_PREFIX = 'attr:';

type AnyCheerio = cheerio.Cheerio<AnyNode>;

const resolveSelector = ($el: AnyCheerio, sel: string): string | undefined => {
  if (sel.startsWith(ATTR_PREFIX)) {
    const attr = sel.slice(ATTR_PREFIX.length);
    return ($el.attr(attr) ?? undefined) as string | undefined;
  }
  const text = $el.text().trim();
  return text || undefined;
};

export const pick = ($: cheerio.CheerioAPI, root: AnyCheerio, sel?: string): string | undefined => {
  if (!sel) return undefined;
  const [css, accessor] = sel.includes('|') ? sel.split('|').map((s) => s.trim()) : [sel, undefined];
  const $el = root.find(css).first();
  if (!$el.length) return undefined;
  if (accessor) return resolveSelector($el, accessor);
  return $el.text().trim() || undefined;
};

export const pickAll = ($: cheerio.CheerioAPI, root: AnyCheerio, sel: string): string[] => {
  const out: string[] = [];
  const [css, accessor] = sel.includes('|') ? sel.split('|').map((s) => s.trim()) : [sel, undefined];
  root.find(css).each((_, el) => {
    const v = accessor ? resolveSelector($(el), accessor) : $(el).text().trim();
    if (v) out.push(v);
  });
  return out;
};
