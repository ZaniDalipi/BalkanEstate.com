import { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/shared/hooks/useSocket';

export interface ListingIngestProgressEvent {
  sourceId: string;
  fetched: number;
  processed: number;
  imported: number;
  updated: number;
  failed: number;
  deferred?: number;
  currentItem?: {
    id: string;
    title?: string;
    url?: string;
  };
  monthlyUsage?: {
    monthlyAllowance: number;
    remaining: number;
  };
  timestamp: string;
}

export interface ProcessedItem {
  id: string;
  title?: string;
  url?: string;
  status: 'imported' | 'updated' | 'deferred' | 'failed';
}

export interface ListingIngestProgressState {
  current: ListingIngestProgressEvent | null;
  /** Recent items in chronological order (newest last). Capped at 50. */
  recentItems: ProcessedItem[];
}

export const useListingIngestProgress = (sourceId?: string): ListingIngestProgressState => {
  const [current, setCurrent] = useState<ListingIngestProgressEvent | null>(null);
  const [recentItems, setRecentItems] = useState<ProcessedItem[]>([]);
  const previousCounts = useRef({ imported: 0, updated: 0, deferred: 0, failed: 0 });
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !sourceId) {
      // Reset on disable
      setCurrent(null);
      setRecentItems([]);
      previousCounts.current = { imported: 0, updated: 0, deferred: 0, failed: 0 };
      return;
    }

    const handleProgress = (event: ListingIngestProgressEvent) => {
      if (event.sourceId !== sourceId) return;

      // Determine the status of the latest item by comparing counters
      const prev = previousCounts.current;
      let status: ProcessedItem['status'] | null = null;
      if (event.imported > prev.imported) status = 'imported';
      else if (event.updated > prev.updated) status = 'updated';
      else if ((event.deferred ?? 0) > prev.deferred) status = 'deferred';
      else if (event.failed > prev.failed) status = 'failed';

      if (status && event.currentItem) {
        setRecentItems((items) => {
          const next = [
            ...items,
            {
              id: event.currentItem!.id,
              title: event.currentItem!.title,
              url: event.currentItem!.url,
              status,
            } as ProcessedItem,
          ];
          return next.length > 50 ? next.slice(-50) : next;
        });
      }

      previousCounts.current = {
        imported: event.imported,
        updated: event.updated,
        deferred: event.deferred ?? 0,
        failed: event.failed,
      };
      setCurrent(event);
    };

    socket.on('listing:ingestProgress', handleProgress);
    return () => {
      socket.off('listing:ingestProgress', handleProgress);
    };
  }, [socket, sourceId]);

  return { current, recentItems };
};
