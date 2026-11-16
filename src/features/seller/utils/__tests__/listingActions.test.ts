import { describe, it, expect } from 'vitest';
import { buildListingActions, isPromotionLive, listingActionSpan, type ListingActionInput } from '../listingActions';

const NOW = Date.UTC(2026, 10, 15);
const base: ListingActionInput = {
  status: 'active', listingType: 'sale', createdAsRole: 'private_seller',
  imageCount: 3, hasVideo: false, canReassignToAgency: false, renewal: { canRenew: true }, now: NOW,
};
const ids = (input: Partial<ListingActionInput>) => buildListingActions({ ...base, ...input }).map((a) => a.id);
const find = (input: Partial<ListingActionInput>, id: string) => buildListingActions({ ...base, ...input }).find((a) => a.id === id);

describe('buildListingActions', () => {
  it('shows promote, video, renew and mark sold for an active private sale', () => {
    expect(ids({})).toEqual(['promote', 'video', 'renew', 'markSold']);
    expect(buildListingActions(base).every((a) => !a.blocked)).toBe(true);
  });

  it('offers Move to Agency only when the user can act as an agent', () => {
    expect(ids({ canReassignToAgency: true })).toContain('moveToAgency');
    expect(ids({ createdAsRole: 'agent' })).toContain('moveToPrivate');
    expect(ids({ createdAsRole: 'external', canReassignToAgency: true })).not.toContain('moveToAgency');
  });

  it('switches promote to extend while a promotion is running', () => {
    expect(ids({ isPromoted: true, promotionEndDate: NOW + 86_400_000 })[0]).toBe('extendPromotion');
    expect(ids({ isPromoted: true, promotionEndDate: NOW - 1 })[0]).toBe('promote');
  });

  it('marks rentals as rented, and rented ones as available again', () => {
    expect(ids({ listingType: 'rent' })).toContain('markRented');
    const available = find({ status: 'rented', listingType: 'rent' }, 'markAvailable');
    expect(available?.blocked).toBeUndefined();
  });

  it('blocks status actions with a reason when the listing is not active', () => {
    for (const id of ['promote', 'renew', 'markSold']) {
      expect(find({ status: 'draft' }, id)?.blocked?.key).toBe('seller:myListings.actionBlocked.notActive');
    }
  });

  it('leaves out what a sold or rented listing can no longer do', () => {
    expect(ids({ status: 'sold' })).toEqual(['video']);
    expect(ids({ status: 'rented', listingType: 'rent' })).toEqual(['video', 'markAvailable']);
    expect(ids({ status: 'sold', createdAsRole: 'agent' })).toEqual(['video', 'moveToPrivate']);
  });

  it('blocks video without photos and points to the editor', () => {
    const video = find({ imageCount: 0 }, 'video');
    expect(video?.blocked).toMatchObject({ key: 'seller:myListings.actionBlocked.noImages', fix: 'edit' });
  });

  it('shows the renew cooldown as the label and the reason', () => {
    const renew = find({ renewal: { canRenew: false, hoursRemaining: 5, minutesRemaining: 12 } }, 'renew');
    expect(renew?.label.values).toEqual({ hours: 5, minutes: 12 });
    expect(renew?.blocked?.key).toBe('seller:myListings.canRenewIn');
  });
});

describe('isPromotionLive', () => {
  it('ignores missing or invalid end dates', () => {
    expect(isPromotionLive({ isPromoted: true, now: NOW })).toBe(false);
    expect(isPromotionLive({ isPromoted: true, promotionEndDate: 'not a date', now: NOW })).toBe(false);
  });
});

describe('listingActionSpan', () => {
  const spans = (count: number) => Array.from({ length: count }, (_, i) => listingActionSpan(i, count));

  it('gives the main action a full row and pairs the rest', () => {
    expect(spans(5)).toEqual(['full', 'half', 'half', 'half', 'half']);
  });

  it('stretches the last action when the rest do not pair up', () => {
    expect(spans(4)).toEqual(['full', 'half', 'half', 'full']);
    expect(spans(2)).toEqual(['full', 'full']);
  });

  it('never leaves a row half empty', () => {
    for (let count = 1; count <= 8; count += 1) {
      const halves = spans(count).filter((s) => s === 'half').length;
      expect(halves % 2).toBe(0);
    }
  });
});
