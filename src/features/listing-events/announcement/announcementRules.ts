/**
 * "You can now add open houses and auctions" — a dialog shown to sellers when
 * they open the app, during one week counted from the first time each of them
 * sees it. Pure, so the rules are unit-tested without rendering.
 */

export const ANNOUNCEMENT_DAYS = 7;
const WEEK_MS = ANNOUNCEMENT_DAYS * 24 * 60 * 60 * 1000;

/** The few user fields that tell whether someone has listings. */
export interface ListingOwner {
  listingsCount?: number;
  subscription?: { activeListingsCount?: number } | null;
}

/** A count from the server, trusted only when it is a real positive number. */
const positive = (n: unknown): boolean => typeof n === 'number' && Number.isFinite(n) && n > 0;

export function hasListings(user: ListingOwner | null | undefined): boolean {
  if (!user) return false;
  return positive(user.listingsCount) || positive(user.subscription?.activeListingsCount);
}

export interface AnnouncementMemory {
  /** When this seller first saw it (ms), or null if never. */
  firstSeenAt: number | null;
  /** They closed it. */
  dismissed: boolean;
}

/** Show it? Only to sellers, not after they close it, and only within their week. */
export function shouldShowAnnouncement(user: ListingOwner | null | undefined, memory: AnnouncementMemory, now: number): boolean {
  if (!hasListings(user) || memory.dismissed) return false;
  // A stored date that is not a number (or lies in the future) is treated as
  // "never seen", so a broken value can never hide or pin the dialog.
  const seen = memory.firstSeenAt;
  if (seen == null || !Number.isFinite(seen) || seen > now) return true;
  return now - seen < WEEK_MS;
}

/** Whole days left in the week (at least 1 while it shows). */
export function daysLeft(firstSeenAt: number | null, now: number): number {
  if (firstSeenAt == null || !Number.isFinite(firstSeenAt) || firstSeenAt > now) return ANNOUNCEMENT_DAYS;
  return Math.max(1, Math.ceil((firstSeenAt + WEEK_MS - now) / (24 * 60 * 60 * 1000)));
}
