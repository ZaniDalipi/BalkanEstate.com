import { useEffect, useRef, useCallback } from 'react';
import { viewStatsApiClient, EntityType } from '@/src/data/api/ViewStatsApiClient';

interface UseTrackViewOptions {
  entityType: EntityType;
  entityId: string | undefined;
  enabled?: boolean;
}

/**
 * Hook to track page views and duration
 * Automatically tracks view when component mounts and duration when unmounting
 */
export function useTrackView({ entityType, entityId, enabled = true }: UseTrackViewOptions) {
  const viewIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const hasTrackedRef = useRef<boolean>(false);

  const trackView = useCallback(async () => {
    if (!entityId || !enabled || hasTrackedRef.current) return;

    try {
      const response = await viewStatsApiClient.trackView(
        entityType,
        entityId,
        document.referrer
      );
      viewIdRef.current = response.viewId;
      hasTrackedRef.current = true;
      startTimeRef.current = Date.now();
    } catch (error) {
      // Error removed
    }
  }, [entityType, entityId, enabled]);

  const updateDuration = useCallback(async () => {
    if (!viewIdRef.current) return;

    try {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      await viewStatsApiClient.updateViewDuration(viewIdRef.current, duration);
    } catch (error) {
      // Error removed
    }
  }, []);

  useEffect(() => {
    if (entityId && enabled) {
      trackView();
    }

    // Cleanup: update duration when leaving page
    return () => {
      if (viewIdRef.current) {
        // Use sendBeacon for reliable unload tracking
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        const data = JSON.stringify({ duration });
        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/view-stats/${viewIdRef.current}/duration`;

        if (navigator.sendBeacon) {
          const blob = new Blob([data], { type: 'application/json' });
          navigator.sendBeacon(url, blob);
        } else {
          // Fallback for browsers without sendBeacon
          updateDuration();
        }
      }
    };
  }, [entityId, enabled, trackView, updateDuration]);

  return {
    viewId: viewIdRef.current,
    isTracked: hasTrackedRef.current,
  };
}
