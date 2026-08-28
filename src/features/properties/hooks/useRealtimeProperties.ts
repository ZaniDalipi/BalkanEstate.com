/**
 * useRealtimeProperties Hook
 *
 * Provides TRUE real-time property updates via WebSocket + React Query integration.
 * When properties change in the database, the UI updates INSTANTLY.
 *
 * How it works:
 * 1. MongoDB Change Streams detect database changes
 * 2. Backend emits Socket.IO events
 * 3. This hook receives events and invalidates React Query cache
 * 4. React Query refetches data automatically
 * 5. UI updates with new data
 *
 * Usage:
 * ```tsx
 * // In your search page or any component that shows listings
 * useRealtimeProperties();
 *
 * // Now your useProperties() hook will auto-refresh on any change!
 * const { properties } = useProperties();
 * ```
 */

import { useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketService, PropertyEvent } from '@/services/socketService';
import { createBurstCoalescer } from '@/shared/utils/burstCoalescer';
import { propertyKeys } from '../api';

interface UseRealtimePropertiesOptions {
  /** Enable/disable real-time updates (default: true) */
  enabled?: boolean;
  /** Callback when a new property is created */
  onPropertyCreated?: (data: PropertyEvent) => void;
  /** Callback when a property is updated */
  onPropertyUpdated?: (data: PropertyEvent) => void;
  /** Callback when a property is deleted */
  onPropertyDeleted?: (data: PropertyEvent) => void;
}

/**
 * Hook to enable real-time property updates via WebSocket
 *
 * This hook automatically invalidates React Query cache when property changes
 * are detected, causing instant UI updates across the app.
 */
export function useRealtimeProperties(options: UseRealtimePropertiesOptions = {}) {
  const {
    enabled = true,
    onPropertyCreated,
    onPropertyUpdated,
    onPropertyDeleted,
  } = options;

  const queryClient = useQueryClient();
  const isSubscribed = useRef(false);

  /**
   * Listing events are broadcast to every connected client, so an unguarded
   * `invalidateQueries` per event means one refetch per open tab, all at once.
   * The coalescer collapses a burst into a single refresh and jitters it, so a
   * busy period costs the API one spread-out request per client rather than a
   * spike per event. Per-item cache patches below stay immediate — this only
   * governs the list refresh behind them.
   */
  const refreshLists = useMemo(
    () =>
      createBurstCoalescer(() => {
        queryClient.invalidateQueries({ queryKey: propertyKeys.lists(), refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: propertyKeys.myListings(), refetchType: 'active' });
      }),
    [queryClient]
  );

  useEffect(() => () => refreshLists.cancel(), [refreshLists]);

  useEffect(() => {
    if (!enabled || isSubscribed.current) return;

    isSubscribed.current = true;

    // Handle new property created - invalidate all property lists
    const unsubCreated = socketService.onPropertyCreated((data) => {
      // Refresh the lists so the new listing appears (coalesced + jittered)
      refreshLists.schedule();

      // Call user callback if provided
      onPropertyCreated?.(data);
    });

    // Handle property updated
    const unsubUpdated = socketService.onPropertyUpdated((data) => {
      // Log removed

      // Update the specific property in cache if we have it
      if (data.propertyId && data.property) {
        queryClient.setQueryData(
          propertyKeys.detail(data.propertyId),
          data.property
        );
      }

      // The changed item is already patched into the cache above; the list
      // refresh behind it is coalesced.
      refreshLists.schedule();

      onPropertyUpdated?.(data);
    });

    // Handle property deleted
    const unsubDeleted = socketService.onPropertyDeleted((data) => {
      // Log removed

      // Remove from cache immediately
      if (data.propertyId) {
        queryClient.removeQueries({
          queryKey: propertyKeys.detail(data.propertyId),
        });
      }

      // Lists refresh on the coalesced schedule; favourites are per-user and
      // rare enough to invalidate straight away.
      refreshLists.schedule();
      queryClient.invalidateQueries({
        queryKey: propertyKeys.favorites(),
        refetchType: 'active',
      });

      onPropertyDeleted?.(data);
    });

    // Handle status changes (sold, available, etc.)
    const unsubStatus = socketService.onPropertyStatusChanged((data) => {
      // Log removed

      // Update the property in cache
      if (data.propertyId && data.property) {
        queryClient.setQueryData(
          propertyKeys.detail(data.propertyId),
          data.property
        );
      }

      refreshLists.schedule();
    });

    // Handle bulk updates — an import can emit these in rapid succession, which
    // is exactly the case coalescing exists for.
    const unsubBulk = socketService.onPropertyBulkUpdate(() => {
      refreshLists.schedule();
    });

    // Cleanup on unmount
    return () => {
      isSubscribed.current = false;
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubStatus();
      unsubBulk();
    };
  }, [enabled, queryClient, refreshLists, onPropertyCreated, onPropertyUpdated, onPropertyDeleted]);

  return {
    isConnected: socketService.isConnected(),
  };
}

/**
 * Simplified hook that just enables real-time updates
 * Use this in your app's root or search page
 */
export function useEnableRealtimeProperties() {
  useRealtimeProperties({ enabled: true });
}
