// The changes a seller makes from "My listings": renew, sold / rented /
// available, move between private and agency, delete.
//
// None of them is optimistic. The card shows a spinner, and the list changes
// only once the server has confirmed - so what the seller sees is always what
// is stored. A failure is shown on the card with its reason; before, the card
// flipped at once and silently flipped back when the server said no.

import { useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import * as api from '@/services/apiService';
import type { Property, PropertyStatus, UserRole } from '@/types';
import type { MyListingsCounts } from '@/src/features/properties/api';
import { useListingTasks } from './useListingTasks';

type ListingRole = 'agent' | 'private_seller';

interface MyListingMutationsArgs {
  listings: Property[];
  setListings: (updater: (listings: Property[]) => Property[]) => void;
  setCounts: (updater: (counts: MyListingsCounts) => MyListingsCounts) => void;
  /** Re-reads the list from the server (tab counts, filtered-out listings). */
  refetch: () => void;
}

const announceStatusChange = (detail?: Record<string, unknown>) => {
  if (detail) window.dispatchEvent(new CustomEvent('property-status-update', { detail }));
  window.dispatchEvent(new CustomEvent('property-status-changed'));
};

export function useMyListingMutations({ listings, setListings, setCounts, refetch }: MyListingMutationsArgs) {
  const { state, dispatch } = useAppContext();
  const { pending, feedback, run, dismiss } = useListingTasks();
  const subscription = state.currentUser?.subscription;

  const patch = useCallback(
    (id: string, change: Partial<Property>) => setListings((prev) => prev.map((p) => (p.id === id ? { ...p, ...change } : p))),
    [setListings]
  );

  const applySubscription = useCallback(
    (updated?: Record<string, unknown> | null) => {
      if (!updated) return;
      dispatch({ type: 'UPDATE_USER', payload: { subscription: { ...subscription, ...updated } as NonNullable<typeof subscription> } });
    },
    [dispatch, subscription]
  );

  const renew = useCallback(
    (id: string) =>
      run(id, 'renew', async () => {
        const result = await api.renewProperty(id);
        const renewedAt = result.lastRenewed ? new Date(result.lastRenewed).getTime() : Date.now();
        patch(id, { lastRenewed: Number.isFinite(renewedAt) ? renewedAt : Date.now() });
        dispatch({ type: 'RENEW_PROPERTY', payload: id });
      }, {
        // The server knows a renewal this screen didn't: start the countdown from it.
        onFailure: (failure) => {
          if (failure.code !== 'RENEWAL_COOLDOWN' || !failure.lastRenewed) return;
          const last = new Date(failure.lastRenewed).getTime();
          if (Number.isFinite(last)) patch(id, { lastRenewed: last });
        },
      }),
    [run, patch, dispatch]
  );

  const markSold = useCallback(
    (id: string) =>
      run(id, 'markSold', async () => {
        await api.markPropertyAsSold(id);
        patch(id, { status: 'sold' as PropertyStatus });
        dispatch({ type: 'MARK_PROPERTY_SOLD', payload: id });
        announceStatusChange();
      }),
    [run, patch, dispatch]
  );

  const markRented = useCallback(
    (id: string, rentedUntilDate?: string) =>
      run(id, 'markRented', async () => {
        await api.markPropertyAsRented(id, rentedUntilDate || undefined);
        const rentedAt = Date.now();
        const rentedUntil = rentedUntilDate ? new Date(rentedUntilDate).getTime() : undefined;
        patch(id, { status: 'rented' as PropertyStatus, rentedAt, rentedUntil });
        dispatch({ type: 'MARK_PROPERTY_RENTED', payload: { id, rentedAt, rentedUntil } });
        announceStatusChange({ id, status: 'rented', rentedAt, rentedUntil });
      }),
    [run, patch, dispatch]
  );

  const markAvailable = useCallback(
    (id: string) =>
      run(id, 'markAvailable', async () => {
        await api.markPropertyAsAvailable(id);
        patch(id, { status: 'active' as PropertyStatus, rentedAt: undefined, rentedUntil: undefined });
        dispatch({ type: 'MARK_PROPERTY_AVAILABLE', payload: id });
        announceStatusChange({ id, status: 'active', rentedAt: undefined, rentedUntil: undefined });
      }),
    [run, patch, dispatch]
  );

  const reassign = useCallback(
    (id: string, targetRole: ListingRole) =>
      run(id, targetRole === 'agent' ? 'moveToAgency' : 'moveToPrivate', async () => {
        const result = await api.reassignPropertyRole(id, targetRole);
        // Keep the id this list knows the card by, whatever form the response uses.
        setListings((prev) => prev.map((p) => (p.id === id ? { ...result.property, id, createdAsRole: targetRole as UserRole } : p)));
        applySubscription(result.updatedSubscription);
        announceStatusChange();
        refetch();
      }),
    [run, setListings, applySubscription, refetch]
  );

  const remove = useCallback(
    (id: string) =>
      run(id, 'delete', async () => {
        const deleted = listings.find((p) => p.id === id);
        const result = await api.deleteProperty(id);
        setListings((prev) => prev.filter((p) => p.id !== id));
        if (deleted) {
          const isRent = deleted.listingType === 'rent';
          setCounts((prev) => ({
            all: Math.max(0, prev.all - 1),
            sale: Math.max(0, prev.sale - (isRent ? 0 : 1)),
            rent: Math.max(0, prev.rent - (isRent ? 1 : 0)),
            private_seller: Math.max(0, prev.private_seller - (deleted.createdAsRole === 'private_seller' ? 1 : 0)),
            agent: Math.max(0, prev.agent - (deleted.createdAsRole === 'agent' ? 1 : 0)),
          }));
        }
        dispatch({ type: 'DELETE_PROPERTY', payload: id });
        window.dispatchEvent(new CustomEvent('property-deleted', { detail: { id } }));
        announceStatusChange();
        applySubscription(result.updatedSubscription);
      }),
    [run, listings, setListings, setCounts, dispatch, applySubscription]
  );

  return { pending, feedback, dismiss, renew, markSold, markRented, markAvailable, reassign, remove };
}
