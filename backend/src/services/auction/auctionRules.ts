/**
 * Pure rules for a listing's optional auction. The auction itself is held
 * elsewhere (bank, notary, auction house); we only show when and how.
 */
import type { RuleResult } from '../openHouse/openHouseRules';

export const AUCTION_MAX_LEAD_MS = 366 * 24 * 60 * 60 * 1000;
export const AUCTION_MAX_LENGTH_MS = 14 * 24 * 60 * 60 * 1000;

export interface AuctionDraft {
  startsAt: Date;
  endsAt?: Date;
  mode: 'online' | 'in_person';
  startingPrice?: number;
  location?: string;
  url?: string;
  depositNote?: string;
}

const toDate = (raw: unknown): Date | null => {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

const text = (raw: unknown, max: number): string | undefined | null => {
  if (raw == null || raw === '') return undefined;
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return t ? t.slice(0, max) : undefined;
};

const isHttpUrl = (s: string): boolean => {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

/** Untrusted request input → an auction, or exactly what is wrong. */
export function parseAuction(raw: unknown, now: Date, existingStartsAt?: Date): RuleResult<AuctionDraft> {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Auction details are missing' };
  const input = raw as Record<string, unknown>;

  const startsAt = toDate(input.startsAt);
  if (!startsAt) return { ok: false, error: 'Choose the auction date and time' };
  // Saving a listing again must not fail on its own auction that has since begun.
  const unchanged = existingStartsAt != null && existingStartsAt.getTime() === startsAt.getTime();
  if (!unchanged && startsAt.getTime() <= now.getTime()) return { ok: false, error: 'The auction must be in the future' };
  if (startsAt.getTime() - now.getTime() > AUCTION_MAX_LEAD_MS) {
    return { ok: false, error: 'An auction can be announced up to 12 months ahead' };
  }

  let endsAt: Date | undefined;
  if (input.endsAt != null && input.endsAt !== '') {
    const e = toDate(input.endsAt);
    if (!e) return { ok: false, error: 'The end time is not valid' };
    if (e.getTime() <= startsAt.getTime()) return { ok: false, error: 'The auction must end after it starts' };
    if (e.getTime() - startsAt.getTime() > AUCTION_MAX_LENGTH_MS) return { ok: false, error: 'An auction lasts at most 14 days' };
    endsAt = e;
  }

  if (input.mode !== 'online' && input.mode !== 'in_person') return { ok: false, error: 'Choose online or in person' };
  const mode = input.mode;

  let startingPrice: number | undefined;
  if (input.startingPrice != null && input.startingPrice !== '') {
    const n = Number(input.startingPrice);
    if (!Number.isFinite(n) || n <= 0 || n > 1_000_000_000) return { ok: false, error: 'The starting price must be a positive number' };
    startingPrice = Math.round(n);
  }

  const location = text(input.location, 300);
  const url = text(input.url, 500);
  const depositNote = text(input.depositNote, 500);
  if (location === null || url === null || depositNote === null) return { ok: false, error: 'Auction details must be text' };
  if (url && !isHttpUrl(url)) return { ok: false, error: 'The auction link must start with http:// or https://' };
  if (mode === 'in_person' && !location) return { ok: false, error: 'Tell bidders where the auction takes place' };
  if (mode === 'online' && !url) return { ok: false, error: 'Add the link where people can bid online' };

  return { ok: true, value: { startsAt, endsAt, mode, startingPrice, location, url, depositNote } };
}

/**
 * The listing's auction field from a create/update request:
 * `undefined` = leave as is, `null` = remove it, otherwise a checked auction.
 */
export function parseAuctionField(raw: unknown, now: Date, existingStartsAt?: Date): RuleResult<AuctionDraft | null | undefined> {
  if (raw === undefined) return { ok: true, value: undefined };
  if (raw === null || raw === '') return { ok: true, value: null };
  return parseAuction(raw, now, existingStartsAt);
}
