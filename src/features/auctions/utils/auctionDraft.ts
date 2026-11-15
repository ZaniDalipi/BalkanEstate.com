import type { ListingAuction } from '@/src/shared/types/property.types';
import { localDateTime, todayInputValue } from '@/src/features/open-houses/utils/openHouseDraft';

/**
 * The seller's auction fields → what the API takes. Mirrors the server's
 * rules (backend/src/services/auction/auctionRules.ts) so a mistake shows
 * next to its field before anything is sent; the server checks again.
 */

export interface AuctionFormValues {
  date: string;  // YYYY-MM-DD, local
  time: string;  // HH:MM, local
  mode: 'online' | 'in_person';
  location: string;
  url: string;
  startingPrice: string;
  depositNote: string;
}

export const EMPTY_AUCTION_FORM: AuctionFormValues = {
  date: '', time: '12:00', mode: 'in_person', location: '', url: '', startingPrice: '', depositNote: '',
};

export type AuctionField = 'date' | 'time' | 'location' | 'url' | 'startingPrice';
export interface AuctionError { field: AuctionField; key: string; defaultValue: string }
export type AuctionDraftResult = { ok: true; value: ListingAuction } | { ok: false; error: AuctionError };

const MAX_LEAD_MS = 366 * 24 * 60 * 60 * 1000;
const err = (field: AuctionField, key: string, defaultValue: string): AuctionDraftResult =>
  ({ ok: false, error: { field, key: `property:listingEvents.errors.${key}`, defaultValue } });

const pad = (n: number) => String(n).padStart(2, '0');

/** An existing auction → form values (local date and time). */
export function auctionToForm(a: ListingAuction | null | undefined): AuctionFormValues | null {
  if (!a) return null;
  const d = new Date(a.startsAt);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: todayInputValue(d),
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    mode: a.mode,
    location: a.location ?? '',
    url: a.url ?? '',
    startingPrice: a.startingPrice != null ? String(a.startingPrice) : '',
    depositNote: a.depositNote ?? '',
  };
}

const isHttpUrl = (s: string): boolean => {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * `existingStartsAt`: an auction already saved on the listing may stay as it
 * is once it has begun (re-saving the listing must not fail on it).
 */
export function draftAuction(v: AuctionFormValues, now: Date, existingStartsAt?: string): AuctionDraftResult {
  if (!v.date) return err('date', 'auctionDate', 'Choose the auction date');
  const start = localDateTime(v.date, v.time);
  if (!start) return err('time', 'auctionTime', 'Choose the auction time');
  const unchanged = existingStartsAt != null && Date.parse(existingStartsAt) === start.getTime();
  if (!unchanged && start <= now) return err('date', 'auctionPast', 'The auction must be in the future');
  if (start.getTime() - now.getTime() > MAX_LEAD_MS) return err('date', 'auctionTooFar', 'An auction can be announced up to 12 months ahead');

  const location = v.location.trim();
  const url = v.url.trim();
  if (url && !isHttpUrl(url)) return err('url', 'auctionUrl', 'The link must start with http:// or https://');
  if (v.mode === 'in_person' && !location) return err('location', 'auctionLocation', 'Tell bidders where the auction takes place');
  if (v.mode === 'online' && !url) return err('url', 'auctionUrlRequired', 'Add the link where people can bid online');

  let startingPrice: number | undefined;
  if (v.startingPrice.trim()) {
    const n = Number(v.startingPrice.replace(/[\s.,](?=\d{3}\b)/g, ''));
    if (!Number.isFinite(n) || n <= 0) return err('startingPrice', 'auctionPrice', 'Enter the starting price as a number, or leave it empty');
    startingPrice = Math.round(n);
  }

  return {
    ok: true,
    value: {
      startsAt: start.toISOString(),
      mode: v.mode,
      ...(location ? { location: location.slice(0, 300) } : {}),
      ...(url ? { url: url.slice(0, 500) } : {}),
      ...(startingPrice ? { startingPrice } : {}),
      ...(v.depositNote.trim() ? { depositNote: v.depositNote.trim().slice(0, 500) } : {}),
    },
  };
}
