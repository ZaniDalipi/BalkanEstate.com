import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Property } from '@/types';
import { useMyListingMutations } from '../useMyListingMutations';

const api = vi.hoisted(() => ({
  renewProperty: vi.fn(),
  markPropertyAsSold: vi.fn(),
  markPropertyAsRented: vi.fn(),
  markPropertyAsAvailable: vi.fn(),
  reassignPropertyRole: vi.fn(),
  deleteProperty: vi.fn(),
}));
vi.mock('@/services/apiService', () => api);
const dispatch = vi.hoisted(() => vi.fn());
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ state: { currentUser: { subscription: { tier: 'free', agentCount: 0 } } }, dispatch }),
}));

const serverError = (statusCode: number, details: Record<string, unknown> = {}) =>
  Object.assign(new Error('x'), { statusCode, code: details.code ?? null, details });

const listing = (extra: Partial<Property> = {}) =>
  ({ id: 'a', status: 'active', listingType: 'sale', createdAsRole: 'private_seller', ...extra }) as Property;

const setup = (initial: Property[] = [listing()]) => {
  let listings = initial;
  let counts = { all: 1, sale: 1, rent: 0, private_seller: 1, agent: 0 };
  const refetch = vi.fn();
  const hook = renderHook(() =>
    useMyListingMutations({
      listings,
      setListings: (updater) => { listings = updater(listings); },
      setCounts: (updater) => { counts = updater(counts); },
      refetch,
    })
  );
  return { hook, refetch, get listings() { return listings; }, get counts() { return counts; } };
};

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  dispatch.mockReset();
});

describe('useMyListingMutations', () => {
  it('renews only after the server confirms, with the server time', async () => {
    api.renewProperty.mockResolvedValue({ success: true, lastRenewed: '2026-11-16T10:00:00.000Z' });
    const ctx = setup();
    await act(async () => { await ctx.hook.result.current.renew('a'); });
    expect(ctx.listings[0].lastRenewed).toBe(Date.parse('2026-11-16T10:00:00.000Z'));
    expect(ctx.hook.result.current.feedback.a).toMatchObject({ kind: 'success' });
  });

  it('leaves the listing untouched and says why when renewing fails', async () => {
    api.renewProperty.mockRejectedValue(serverError(500));
    const ctx = setup([listing({ lastRenewed: 1 })]);
    await act(async () => { await ctx.hook.result.current.renew('a'); });
    expect(ctx.listings[0].lastRenewed).toBe(1);
    expect(ctx.hook.result.current.feedback.a).toMatchObject({ kind: 'error', text: { key: 'seller:myListings.actionError.renew' } });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('starts the countdown from the renewal the server remembers', async () => {
    api.renewProperty.mockRejectedValue(serverError(429, { code: 'RENEWAL_COOLDOWN', hoursRemaining: 20, minutesRemaining: 0, lastRenewed: '2026-11-16T08:00:00.000Z' }));
    const ctx = setup();
    await act(async () => { await ctx.hook.result.current.renew('a'); });
    expect(ctx.listings[0].lastRenewed).toBe(Date.parse('2026-11-16T08:00:00.000Z'));
    expect(ctx.hook.result.current.feedback.a.retry).toBeUndefined();
  });

  it('moves a listing to the agency once the server has moved it', async () => {
    api.reassignPropertyRole.mockResolvedValue({ property: listing({ id: 'server-form-id', createdAsRole: 'agent' as Property['createdAsRole'] }), updatedSubscription: { agentCount: 1 } });
    const ctx = setup();
    await act(async () => { await ctx.hook.result.current.reassign('a', 'agent'); });
    expect(api.reassignPropertyRole).toHaveBeenCalledWith('a', 'agent');
    expect(ctx.listings[0]).toMatchObject({ id: 'a', createdAsRole: 'agent' });
    expect(ctx.refetch).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({ type: 'UPDATE_USER', payload: { subscription: { tier: 'free', agentCount: 1 } } });
    expect(ctx.hook.result.current.feedback.a.text.key).toBe('seller:myListings.actionDone.movedToAgency');
  });

  it('keeps the listing private and explains when the move is refused', async () => {
    api.reassignPropertyRole.mockRejectedValue(serverError(403, { code: 'AGENT_ROLE_REQUIRED' }));
    const ctx = setup();
    await act(async () => { await ctx.hook.result.current.reassign('a', 'agent'); });
    expect(ctx.listings[0].createdAsRole).toBe('private_seller');
    expect(ctx.hook.result.current.feedback.a.text.key).toBe('seller:myListings.actionError.agentRequired');
  });

  it('marks sold, rented and available from the server answer', async () => {
    api.markPropertyAsSold.mockResolvedValue({});
    api.markPropertyAsRented.mockResolvedValue({});
    api.markPropertyAsAvailable.mockResolvedValue({});
    const ctx = setup();
    await act(async () => { await ctx.hook.result.current.markRented('a', '2027-03-01'); });
    expect(api.markPropertyAsRented).toHaveBeenCalledWith('a', '2027-03-01');
    expect(ctx.listings[0]).toMatchObject({ status: 'rented', rentedUntil: new Date('2027-03-01').getTime() });
    await act(async () => { await ctx.hook.result.current.markAvailable('a'); });
    expect(ctx.listings[0]).toMatchObject({ status: 'active', rentedUntil: undefined });
    await act(async () => { await ctx.hook.result.current.markSold('a'); });
    expect(ctx.listings[0].status).toBe('sold');
  });

  it('removes a listing and its counts only after the server deleted it', async () => {
    api.deleteProperty.mockRejectedValueOnce(serverError(500)).mockResolvedValueOnce({});
    const ctx = setup();
    await act(async () => { await ctx.hook.result.current.remove('a'); });
    expect(ctx.listings).toHaveLength(1);
    expect(ctx.hook.result.current.feedback.a.text.key).toBe('seller:myListings.actionError.delete');

    await act(async () => { await ctx.hook.result.current.remove('a'); });
    expect(ctx.listings).toHaveLength(0);
    expect(ctx.counts).toMatchObject({ all: 0, sale: 0, private_seller: 0 });
  });
});
