// What to tell the seller after a listing action: the reason it failed, in
// words they can act on, or a short confirmation that it worked. Pure, so each
// server answer is tested without a server.

import type { ListingActionId, TextRef } from './listingActions';

/** Everything a listing card can be busy doing. */
export type ListingTaskId = ListingActionId | 'delete';

export interface ApiFailure {
  status: number | null;
  code: string | null;
  offline: boolean;
  hoursRemaining?: number;
  minutesRemaining?: number;
  /** When the server last saw this listing renewed (cooldown answers). */
  lastRenewed?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const num = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

/** Normalise whatever the API client threw into the few facts the messages need. */
export const readApiFailure = (error: unknown, online = typeof navigator === 'undefined' ? true : navigator.onLine): ApiFailure => {
  const err = isRecord(error) ? error : {};
  const details = isRecord(err.details) ? err.details : {};
  const status = num(err.statusCode) ?? null;
  const code = typeof err.code === 'string' ? err.code : typeof details.code === 'string' ? details.code : null;
  // fetch() rejects with a TypeError when the request never reached the server.
  const neverSent = status === null && error instanceof TypeError;
  return {
    status,
    code,
    offline: online === false || neverSent,
    hoursRemaining: num(details.hoursRemaining),
    minutesRemaining: num(details.minutesRemaining),
    lastRenewed: typeof details.lastRenewed === 'string' ? details.lastRenewed : undefined,
  };
};

const text = (key: string, defaultValue: string, values?: Record<string, number>): TextRef =>
  values ? { key: `seller:myListings.${key}`, defaultValue, values } : { key: `seller:myListings.${key}`, defaultValue };

const FALLBACK_ERRORS: Record<ListingTaskId, TextRef> = {
  promote: text('actionError.generic', "That didn't work. Please try again."),
  extendPromotion: text('actionError.generic', "That didn't work. Please try again."),
  video: text('actionError.generic', "That didn't work. Please try again."),
  renew: text('actionError.renew', "The listing wasn't renewed. Please try again."),
  moveToAgency: text('actionError.move', "The listing wasn't moved. Please try again."),
  moveToPrivate: text('actionError.move', "The listing wasn't moved. Please try again."),
  markSold: text('actionError.status', "The listing wasn't updated. Please try again."),
  markRented: text('actionError.status', "The listing wasn't updated. Please try again."),
  markAvailable: text('actionError.status', "The listing wasn't updated. Please try again."),
  delete: text('actionError.delete', "The listing wasn't deleted. Please try again."),
};

/** Why the action failed, most specific reason first. */
export const listingActionErrorText = (task: ListingTaskId, failure: ApiFailure): TextRef => {
  if (failure.offline) return text('actionError.offline', "You're offline. Check your connection and try again.");
  if (failure.code === 'RENEWAL_COOLDOWN') {
    return text('canRenewIn', 'Can renew in {{hours}}h {{minutes}}m', {
      hours: failure.hoursRemaining ?? 0,
      minutes: failure.minutesRemaining ?? 0,
    });
  }
  if (failure.code === 'AGENT_ROLE_REQUIRED') return text('actionError.agentRequired', 'Only registered agents can move a listing to an agency.');
  if (failure.code === 'EXTERNAL_LISTING_NOT_REASSIGNABLE') return text('actionError.external', "Imported listings can't be moved.");
  if (failure.code === 'INVALID_RENTED_UNTIL') return text('actionError.invalidDate', 'Choose a valid date.');
  if (failure.status === 401) return text('actionError.session', 'Your session has expired. Please sign in again.');
  if (failure.status === 403) return text('actionError.forbidden', "You can't change this listing.");
  if (failure.status === 404) return text('actionError.notFound', 'This listing no longer exists.');
  if (failure.status === 429) return text('actionError.rateLimited', 'Too many attempts. Please wait a moment and try again.');
  return FALLBACK_ERRORS[task];
};

/** Retrying can't help when the server refused on principle. */
export const isRetryable = (failure: ApiFailure): boolean => {
  if (failure.offline) return true;
  if (failure.code === 'RENEWAL_COOLDOWN' || failure.code === 'AGENT_ROLE_REQUIRED' || failure.code === 'EXTERNAL_LISTING_NOT_REASSIGNABLE') return false;
  return failure.status === null || failure.status >= 500 || failure.status === 429;
};

const SUCCESS: Partial<Record<ListingTaskId, TextRef>> = {
  renew: text('actionDone.renewed', 'Renewed. Your listing is back at the top.'),
  moveToAgency: text('actionDone.movedToAgency', 'Moved to your agency.'),
  moveToPrivate: text('actionDone.movedToPrivate', 'Moved to your private profile.'),
  markSold: text('actionDone.sold', 'Marked as sold.'),
  markRented: text('actionDone.rented', 'Marked as rented.'),
  markAvailable: text('actionDone.available', 'Marked as available again.'),
};

/** Confirmation shown on the card; null for actions that need none (the card is gone, or a dialog opened). */
export const listingActionSuccessText = (task: ListingTaskId): TextRef | null => SUCCESS[task] ?? null;
