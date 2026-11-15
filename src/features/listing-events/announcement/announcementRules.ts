/**
 * "You can now add open houses and auctions" — shown to sellers on the home
 * screen for one week, counted from the first time each of them sees it.
 * Pure, so the rules are unit-tested without rendering.
 */

export const ANNOUNCEMENT_DAYS = 7;
const WEEK_MS = ANNOUNCEMENT_DAYS * 24 * 60 * 60 * 1000;

/** The few user fields that tell whether someone has listings. */
export interface ListingOwner {
  listingsCount?: number;
  subscription?: { activeListingsCount?: number } | null;
}

export function hasListings(user: ListingOwner | null | undefined): boolean {
  if (!user) return false;
  return (user.listingsCount ?? 0) > 0 || (user.subscription?.activeListingsCount ?? 0) > 0;
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
  return memory.firstSeenAt == null || now - memory.firstSeenAt < WEEK_MS;
}

/** Whole days left in the week (at least 1 while it shows). */
export function daysLeft(firstSeenAt: number | null, now: number): number {
  if (firstSeenAt == null) return ANNOUNCEMENT_DAYS;
  return Math.max(1, Math.ceil((firstSeenAt + WEEK_MS - now) / (24 * 60 * 60 * 1000)));
}
