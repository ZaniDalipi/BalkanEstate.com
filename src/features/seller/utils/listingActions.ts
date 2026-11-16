// Which action buttons a "My listings" card shows, in which order, and why one
// can't be used right now. Pure, so the rules are tested without rendering.

import type { SoftIconName } from '@/src/shared/illustrations';

export type ListingActionId =
  | 'promote' | 'extendPromotion' | 'video' | 'renew'
  | 'moveToAgency' | 'moveToPrivate' | 'markSold' | 'markRented' | 'markAvailable';

/** Colour family of a button; the CTA tones are filled, the rest are tinted. */
export type ListingActionTone = 'promote' | 'extend' | 'indigo' | 'neutral' | 'amber' | 'green' | 'blue';

export interface TextRef {
  key: string;
  defaultValue: string;
  values?: Record<string, number>;
}

/** Why an action can't run yet, and what the user can do about it. */
export interface ListingActionBlock extends TextRef {
  fix?: 'edit';
}

export interface ListingAction {
  id: ListingActionId;
  icon: SoftIconName;
  tone: ListingActionTone;
  label: TextRef;
  hint: TextRef;
  blocked?: ListingActionBlock;
}

export interface RenewalStatus {
  canRenew: boolean;
  hoursRemaining?: number;
  minutesRemaining?: number;
}

export interface ListingActionInput {
  status: string;
  listingType?: string;
  createdAsRole?: string;
  isPromoted?: boolean;
  promotionEndDate?: string | number | Date;
  imageCount: number;
  hasVideo: boolean;
  canReassignToAgency: boolean;
  renewal: RenewalStatus | null;
  now?: number;
}

const NOT_ACTIVE: ListingActionBlock = {
  key: 'seller:myListings.actionBlocked.notActive',
  defaultValue: 'Available once the listing is active.',
};

const NO_IMAGES: ListingActionBlock = {
  key: 'seller:myListings.actionBlocked.noImages',
  defaultValue: 'Add photos to the listing first to create a video.',
  fix: 'edit',
};

const text = (key: string, defaultValue: string, values?: Record<string, number>): TextRef =>
  values ? { key, defaultValue, values } : { key, defaultValue };

/** Active and pending listings are the ones that can be promoted, renewed or closed. */
export const isListingActionable = (status: string): boolean => status === 'active' || status === 'pending';

export const isPromotionLive = (input: Pick<ListingActionInput, 'isPromoted' | 'promotionEndDate' | 'now'>): boolean => {
  if (!input.isPromoted || input.promotionEndDate == null) return false;
  const end = new Date(input.promotionEndDate).getTime();
  return Number.isFinite(end) && end > (input.now ?? Date.now());
};

const promoteAction = (input: ListingActionInput, actionable: boolean): ListingAction => {
  const blocked = actionable ? undefined : NOT_ACTIVE;
  if (isPromotionLive(input)) {
    return {
      id: 'extendPromotion', icon: 'clock', tone: 'extend', blocked,
      label: text('seller:myListings.extendPromotion', 'Extend Promotion'),
      hint: text('seller:myListings.extendPromotion', 'Extend Promotion'),
    };
  }
  return {
    id: 'promote', icon: 'rocket', tone: 'promote', blocked,
    label: text('seller:myListings.promote', 'Promote'),
    hint: text('seller:myListings.promote', 'Promote'),
  };
};

const videoAction = (input: ListingActionInput): ListingAction => ({
  id: 'video', icon: 'video', tone: 'indigo',
  blocked: input.imageCount > 0 ? undefined : NO_IMAGES,
  label: input.hasVideo
    ? text('seller:myListings.video', 'Video')
    : text('seller:myListings.createVideo', 'Create Video'),
  hint: text('account:ui.myListings.createVideoReel', 'Create video reel'),
});

const renewAction = (input: ListingActionInput, actionable: boolean): ListingAction => {
  const hint = text('account:ui.myListings.renewListingToAppearAt', 'Renew listing to appear at top');
  const base = { id: 'renew' as const, icon: 'refresh' as const, tone: 'neutral' as const, hint };
  if (!actionable) return { ...base, label: text('seller:myListings.renew', 'Renew'), blocked: NOT_ACTIVE };
  if (input.renewal && input.renewal.canRenew === false) {
    const values = { hours: input.renewal.hoursRemaining ?? 0, minutes: input.renewal.minutesRemaining ?? 0 };
    return {
      ...base,
      label: text('seller:myListings.renewCountdown', '{{hours}}h {{minutes}}m', values),
      blocked: text('seller:myListings.canRenewIn', 'Can renew in {{hours}}h {{minutes}}m', values),
    };
  }
  return { ...base, label: text('seller:myListings.renew', 'Renew') };
};

const reassignAction = (input: ListingActionInput): ListingAction | null => {
  if (input.createdAsRole === 'external') return null;
  if (input.createdAsRole === 'agent') {
    return {
      id: 'moveToPrivate', icon: 'home', tone: 'amber',
      label: text('seller:myListings.moveToPrivate', 'Move to Private'),
      hint: text('seller:myListings.moveToPrivateHint', 'Move this listing to your private seller profile'),
    };
  }
  if (!input.canReassignToAgency) return null;
  return {
    id: 'moveToAgency', icon: 'building', tone: 'amber',
    label: text('seller:myListings.moveToAgency', 'Move to Agency'),
    hint: text('seller:myListings.moveToAgencyHint', 'Move this listing to your agency'),
  };
};

const closeAction = (input: ListingActionInput, actionable: boolean): ListingAction => {
  if (input.status === 'rented') {
    const label = text('rental:status.markAsAvailable', 'Mark as Available');
    return { id: 'markAvailable', icon: 'check', tone: 'blue', label, hint: label };
  }
  const blocked = actionable ? undefined : NOT_ACTIVE;
  if (input.listingType === 'rent') {
    const label = text('rental:status.markAsRented', 'Mark as Rented');
    return { id: 'markRented', icon: 'key', tone: 'green', label, hint: label, blocked };
  }
  const label = text('rental:status.markAsSold', 'Mark as Sold');
  return { id: 'markSold', icon: 'tag', tone: 'green', label, hint: label, blocked };
};

/** The card's actions, in display order. */
export const buildListingActions = (input: ListingActionInput): ListingAction[] => {
  const actionable = isListingActionable(input.status);
  const actions: Array<ListingAction | null> = [
    promoteAction(input, actionable),
    videoAction(input),
    renewAction(input, actionable),
    reassignAction(input),
    closeAction(input, actionable),
  ];
  return actions.filter((a): a is ListingAction => a !== null);
};

/**
 * Width of an action on a narrow (two-column) card, so no row is left half
 * empty: the first action — the main one — gets a full row, and when the rest
 * don't pair up, the last one fills its row too.
 */
export const listingActionSpan = (index: number, count: number): 'full' | 'half' => {
  if (count <= 1 || index === 0) return 'full';
  const isLast = index === count - 1;
  const restIsOdd = (count - 1) % 2 === 1;
  return isLast && restIsOdd ? 'full' : 'half';
};

export const RENEW_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Whether a listing last renewed at `lastRenewed` can be renewed at `now`, and
 * the time left if not. Same arithmetic as the server (whole minutes, rounded
 * up), so the countdown on the button matches the server's answer.
 */
export const renewalStatusOf = (lastRenewed: Date | number | string | null | undefined, now: number): RenewalStatus => {
  if (lastRenewed === null || lastRenewed === undefined || lastRenewed === '') return { canRenew: true };
  const last = new Date(lastRenewed).getTime();
  if (!Number.isFinite(last)) return { canRenew: true };
  const remaining = last + RENEW_COOLDOWN_MS - now;
  if (remaining <= 0) return { canRenew: true };
  const totalMinutes = Math.ceil(remaining / 60_000);
  return { canRenew: false, hoursRemaining: Math.floor(totalMinutes / 60), minutesRemaining: totalMinutes % 60 };
};
