import type * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { applyLabelValue, type MappedListing } from './applyAttribute';
import { isPlausiblePlaceName } from './location';

/**
 * Detail-page layouts that carry no telling class names, so only their
 * shape identifies them. Labels still have to be in the dictionary, and
 * values pass the same range checks, so a stray match does no harm.
 */

const LABEL_TAGS = 'h3, h4, h5, h6, strong, b, dt, th, label, span, div, p, small, em';
const MAX_LABEL = 40;
const MAX_VALUE = 120;

const clean = (s: string): string => s.replace(/\s+/g, ' ').trim();

/**
 * "Label:" elements followed by their value — `<li><h4>Kvadratura:</h4>
 * <span>82m²</span></li>`, `<strong>Bedrooms:</strong> 3`,
 * `<div><span>Grad</span><span>Pula</span></div>` (label / value pairs).
 */
export const extractLabelledPairs = ($: cheerio.CheerioAPI, target: MappedListing): void => {
  $(LABEL_TAGS).each((_, el) => {
    const $el = $(el);
    if ($el.children().length > 1) return;
    const label = clean($el.text());
    if (!label || label.length > MAX_LABEL) return;
    const isColonLabel = /[:：]$/.test(label);
    const next = $el.next();
    let value = next.length ? clean(next.text()) : '';
    // `<strong>Bedrooms:</strong> 3` — the value is the text after the label.
    if (!value && isColonLabel) {
      const parentText = clean($el.parent().text());
      value = parentText.startsWith(label) ? clean(parentText.slice(label.length)) : '';
    }
    if (!value || value.length > MAX_VALUE) return;
    // Without a colon only accept a two-element pair, to keep sentences out.
    if (!isColonLabel && $el.parent().children().length !== 2) return;
    applyLabelValue(target, label.replace(/[:：]$/, ''), value);
  });
};

const MARKER_ICON =
  'i[class*="map-marker"], i[class*="location"], i[class*="map-pin"], i[class*="geo-alt"], ' +
  'span[class*="map-marker"], span[class*="icon-location"], svg[class*="map-marker"], svg[class*="location"], ' +
  'i.material-icons:contains("place"), i.material-icons:contains("location_on")';

const placeTextBeside = ($: cheerio.CheerioAPI, icon: AnyNode): string | undefined => {
  const holder = $(icon).parent();
  if (holder.children().length > 3) return undefined;
  const text = clean(holder.text().replace(/\b(place|location_on)\b/g, ''));
  return text && text.length <= 80 ? text : undefined;
};

/**
 * The place a listing is in, shown beside a map-marker icon —
 * `<p><i class="la la-map-marker"></i>Banjole</p>`. The first one on the page
 * is the listing's own (similar listings come further down); pass `within`
 * to look inside one listing card only. Returns the
 * place as written, e.g. "Banjole" or "Medulin, Istra".
 */
export const placeBesideMarkerIcon = (
  $: cheerio.CheerioAPI,
  within?: cheerio.Cheerio<AnyNode>
): string | undefined => {
  const icons = within ? within.find(MARKER_ICON) : $(MARKER_ICON);
  for (const icon of icons.toArray()) {
    if ($(icon).closest('header, footer, nav, form, [class*="contact"], [class*="footer"], [class*="header"]').length) continue;
    const text = placeTextBeside($, icon);
    if (!text) continue;
    const first = text.split(',')[0].trim();
    if (isPlausiblePlaceName(first)) return text;
  }
  return undefined;
};
