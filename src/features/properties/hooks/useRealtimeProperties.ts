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

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketService, PropertyEvent } from '@/services/socketService';
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

  useEffect(() => {
    if (!enabled || isSubscribed.current) return;

    isSubscribed.current = true;

    // Handle new property created - invalidate all property lists
    const unsubCreated = socketService.onPropertyCreated((data) => {
      console.log('🏠 Real-time: Property created', data.propertyId || data.property?.id);

      // Invalidate all property list queries to show the new listing
      queryClient.invalidateQueries({
        queryKey: propertyKeys.lists(),
        refetchType: 'active',
      });

      // Also invalidate my listings if this is the current user's property
      queryClient.invalidateQueries({
        queryKey: propertyKeys.myListings(),
        refetchType: 'active',
      });

      // Call user callback if provided
      onPropertyCreated?.(data);
    });

    // Handle property updated
    const unsubUpdated = socketService.onPropertyUpdated((data) => {
      console.log('🏠 Real-time: Property updated', data.propertyId);

      // Update the specific property in cache if we have it
      if (data.propertyId && data.property) {
        queryClient.setQueryData(
          propertyKeys.detail(data.propertyId),
          data.property
        );
      }

      // Invalidate lists to reflect updated data
      queryClient.invalidateQueries({
        queryKey: propertyKeys.lists(),
        refetchType: 'active',
      });

      queryClient.invalidateQueries({
        queryKey: propertyKeys.myListings(),
        refetchType: 'active',
      });

      onPropertyUpdated?.(data);
    });

    // Handle property deleted
    const unsubDeleted = socketService.onPropertyDeleted((data) => {
      console.log('🏠 Real-time: Property deleted', data.propertyId);

      // Remove from cache immediately
      if (data.propertyId) {
        queryClient.removeQueries({
          queryKey: propertyKeys.detail(data.propertyId),
        });
      }

      // Invalidate lists to remove the deleted property
      queryClient.invalidateQueries({
        queryKey: propertyKeys.lists(),
        refetchType: 'active',
      });

      queryClient.invalidateQueries({
        queryKey: propertyKeys.myListings(),
        refetchType: 'active',
      });

      queryClient.invalidateQueries({
        queryKey: propertyKeys.favorites(),
        refetchType: 'active',
      });

      onPropertyDeleted?.(data);
    });

    // Handle status changes (sold, available, etc.)
    const unsubStatus = socketService.onPropertyStatusChanged((data) => {
      console.log('🏠 Real-time: Property status changed', data.propertyId, data.status);

      // Update the property in cache
      if (data.propertyId && data.property) {
        queryClient.setQueryData(
          propertyKeys.detail(data.propertyId),
          data.property
        );
      }

      // Invalidate lists
      queryClient.invalidateQueries({
        queryKey: propertyKeys.lists(),
        refetchType: 'active',
      });
    });

    // Handle bulk updates
    const unsubBulk = socketService.onPropertyBulkUpdate((data) => {
      console.log('🏠 Real-time: Bulk property update', data.action, data.count);

      // Invalidate all property queries on bulk operations
      queryClient.invalidateQueries({
        queryKey: propertyKeys.all,
        refetchType: 'active',
      });
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
  }, [enabled, queryClient, onPropertyCreated, onPropertyUpdated, onPropertyDeleted]);

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
