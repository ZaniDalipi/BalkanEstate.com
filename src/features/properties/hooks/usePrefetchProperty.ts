// usePrefetchProperty Hook - warm the detail cache before navigation
// Loading feel: by the time a card is clicked, its property is usually in cache.

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { propertyKeys, getProperty } from '../api';

/** How long a prefetched property counts as fresh enough to skip a refetch. */
const PREFETCH_STALE_TIME = 30 * 1000;

/**
 * Returns a prefetch function for a property's detail data.
 *
 * Intent-to-navigate signals — pointer entering a card, focusing it with the
 * keyboard, the first touch of a tap — happen a few hundred milliseconds before
 * the click. Fetching in that gap turns the detail view from "spinner, then
 * content" into "content", without any extra request for cards nobody touches.
 *
 * `prefetchQuery` resolves immediately when a fresh entry already exists, so
 * repeated hovers cost nothing, and it never throws into the caller — a failed
 * prefetch just leaves the normal fetch to happen on navigation.
 *
 * Usage:
 * ```tsx
 * const prefetchProperty = usePrefetchProperty();
 * <article onPointerEnter={() => prefetchProperty(property.id)} />
 * ```
 */
export function usePrefetchProperty() {
  const queryClient = useQueryClient();

  return useCallback(
    (propertyId?: string | null) => {
      if (!propertyId) return;

      void queryClient.prefetchQuery({
        queryKey: propertyKeys.detail(propertyId),
        queryFn: () => getProperty(propertyId),
        staleTime: PREFETCH_STALE_TIME,
      });
    },
    [queryClient]
  );
}
