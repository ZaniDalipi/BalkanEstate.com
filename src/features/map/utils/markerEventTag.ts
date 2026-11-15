import { toIntlLocale } from '@/src/shared/utils/intlLocale';
import { nextListingEvent } from '@/src/features/listing-events/utils/listingEvents';
import type { EventSource } from '@/src/features/listing-events/types';

export interface MarkerEventTag {
  kind: 'openHouse' | 'auction';
  /** Short text on the pin: "Open Sat", "Auction today". */
  text: string;
  /** Longer text for the pin's tooltip and screen readers. */
  title: string;
}

export interface MarkerEventLabels {
  openHouse: string;
  auction: string;
  today: string;
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** The tag a map pin carries when its listing has an open house or auction coming up. */
export function markerEventTag(p: EventSource, now: Date, lang: string, labels: MarkerEventLabels): MarkerEventTag | null {
  const e = nextListingEvent(p, now);
  if (!e) return null;
  const start = new Date(e.startsAt);
  const locale = toIntlLocale(lang);
  const day = sameDay(start, now) || start < now
    ? labels.today
    : new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(start);
  const name = e.kind === 'openHouse' ? labels.openHouse : labels.auction;
  const full = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(start);
  return { kind: e.kind, text: `${name} ${day}`, title: `${name} · ${full}` };
}

const TAG_COLORS = { openHouse: '#059669', auction: '#d97706' } as const;

/** Add the tag inside a price pill (plain DOM, like the pill itself). */
export function appendMarkerEventTag(pill: HTMLElement, tag: MarkerEventTag): void {
  const span = document.createElement('span');
  span.className = 'marker-event-tag';
  span.textContent = tag.text;
  span.style.cssText = `margin-left:4px;padding:0 4px;border-radius:999px;background:${TAG_COLORS[tag.kind]};color:#fff;font-size:9px;font-weight:700;`;
  pill.appendChild(span);
  pill.title = tag.title;
  pill.setAttribute('aria-label', `${pill.textContent ?? ''}`.trim());
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

/** The same tag as an HTML string, for map libraries that take markup (Leaflet). */
export function markerEventTagHtml(tag: MarkerEventTag): string {
  return `<span class="marker-event-tag" title="${escapeHtml(tag.title)}" style="position:absolute;left:50%;top:-14px;transform:translateX(-50%);white-space:nowrap;padding:0 5px;border-radius:999px;background:${TAG_COLORS[tag.kind]};color:#fff;font:700 9px/14px Inter,system-ui,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.25);pointer-events:none;">${escapeHtml(tag.text)}</span>`;
}
