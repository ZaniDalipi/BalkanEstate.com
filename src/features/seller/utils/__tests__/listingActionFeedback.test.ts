import { describe, it, expect } from 'vitest';
import { isRetryable, listingActionErrorText, listingActionSuccessText, readApiFailure } from '../listingActionFeedback';
import { renewalStatusOf } from '../listingActions';

const apiError = (statusCode: number, details: Record<string, unknown> = {}) =>
  Object.assign(new Error('x'), { statusCode, code: details.code ?? null, details });

describe('readApiFailure', () => {
  it('reads status, code and cooldown from an API error', () => {
    const failure = readApiFailure(apiError(429, { code: 'RENEWAL_COOLDOWN', hoursRemaining: 5, minutesRemaining: 12, lastRenewed: '2026-11-15T10:00:00.000Z' }), true);
    expect(failure).toMatchObject({ status: 429, code: 'RENEWAL_COOLDOWN', hoursRemaining: 5, minutesRemaining: 12, lastRenewed: '2026-11-15T10:00:00.000Z', offline: false });
  });

  it('treats a request that never left as offline', () => {
    expect(readApiFailure(new TypeError('Failed to fetch'), true).offline).toBe(true);
    expect(readApiFailure(apiError(500), false).offline).toBe(true);
  });

  it('survives anything thrown', () => {
    expect(readApiFailure(undefined, true)).toMatchObject({ status: null, code: null, offline: false });
    expect(readApiFailure('boom', true)).toMatchObject({ status: null, code: null });
  });
});

describe('listingActionErrorText', () => {
  const textFor = (task: Parameters<typeof listingActionErrorText>[0], error: unknown) =>
    listingActionErrorText(task, readApiFailure(error, true));

  it('explains the renew cooldown with the time left', () => {
    const text = textFor('renew', apiError(429, { code: 'RENEWAL_COOLDOWN', hoursRemaining: 3, minutesRemaining: 7 }));
    expect(text).toMatchObject({ key: 'seller:myListings.canRenewIn', values: { hours: 3, minutes: 7 } });
  });

  it('names the reason the server refused', () => {
    expect(textFor('moveToAgency', apiError(403, { code: 'AGENT_ROLE_REQUIRED' })).key).toBe('seller:myListings.actionError.agentRequired');
    expect(textFor('moveToAgency', apiError(400, { code: 'EXTERNAL_LISTING_NOT_REASSIGNABLE' })).key).toBe('seller:myListings.actionError.external');
    expect(textFor('markRented', apiError(400, { code: 'INVALID_RENTED_UNTIL' })).key).toBe('seller:myListings.actionError.invalidDate');
    expect(textFor('markSold', apiError(404)).key).toBe('seller:myListings.actionError.notFound');
    expect(textFor('renew', apiError(401)).key).toBe('seller:myListings.actionError.session');
  });

  it('falls back to a message about the action that failed', () => {
    expect(textFor('renew', apiError(500)).key).toBe('seller:myListings.actionError.renew');
    expect(textFor('moveToPrivate', apiError(500)).key).toBe('seller:myListings.actionError.move');
    expect(textFor('delete', apiError(500)).key).toBe('seller:myListings.actionError.delete');
  });

  it('puts being offline first', () => {
    expect(textFor('renew', new TypeError('Failed to fetch')).key).toBe('seller:myListings.actionError.offline');
  });
});

describe('isRetryable', () => {
  it('offers a retry only when one can help', () => {
    expect(isRetryable(readApiFailure(apiError(500), true))).toBe(true);
    expect(isRetryable(readApiFailure(new TypeError('Failed to fetch'), true))).toBe(true);
    expect(isRetryable(readApiFailure(apiError(429, { code: 'RENEWAL_COOLDOWN' }), true))).toBe(false);
    expect(isRetryable(readApiFailure(apiError(403), true))).toBe(false);
    expect(isRetryable(readApiFailure(apiError(404), true))).toBe(false);
  });
});

describe('listingActionSuccessText', () => {
  it('confirms what changed, and stays quiet where the card disappears', () => {
    expect(listingActionSuccessText('renew')?.key).toBe('seller:myListings.actionDone.renewed');
    expect(listingActionSuccessText('moveToPrivate')?.key).toBe('seller:myListings.actionDone.movedToPrivate');
    expect(listingActionSuccessText('delete')).toBeNull();
  });
});

describe('renewalStatusOf', () => {
  const NOW = Date.UTC(2026, 10, 16, 12, 0, 0);
  const ago = (minutes: number) => NOW - minutes * 60_000;

  it('lets a listing that was never renewed, or renewed a day ago, renew', () => {
    expect(renewalStatusOf(undefined, NOW)).toEqual({ canRenew: true });
    expect(renewalStatusOf(null, NOW)).toEqual({ canRenew: true });
    expect(renewalStatusOf('not a date', NOW)).toEqual({ canRenew: true });
    expect(renewalStatusOf(ago(24 * 60), NOW)).toEqual({ canRenew: true });
  });

  it('counts down in whole hours and minutes, never "60m"', () => {
    expect(renewalStatusOf(ago(90), NOW)).toEqual({ canRenew: false, hoursRemaining: 22, minutesRemaining: 30 });
    expect(renewalStatusOf(ago(60), NOW)).toEqual({ canRenew: false, hoursRemaining: 23, minutesRemaining: 0 });
    expect(renewalStatusOf(NOW - 30_000, NOW)).toEqual({ canRenew: false, hoursRemaining: 24, minutesRemaining: 0 });
    expect(renewalStatusOf(new Date(ago(23 * 60 + 59)).toISOString(), NOW)).toEqual({ canRenew: false, hoursRemaining: 0, minutesRemaining: 1 });
  });
});
