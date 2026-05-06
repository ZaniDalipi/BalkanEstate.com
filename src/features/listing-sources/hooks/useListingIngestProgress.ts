import { useEffect, useState } from 'react';
import { useSocket } from '@/shared/hooks/useSocket';

export interface ListingIngestProgressEvent {
  sourceId: string;
  fetched: number;
  processed: number;
  imported: number;
  updated: number;
  failed: number;
  currentItem?: {
    id: string;
    title?: string;
    url?: string;
  };
  timestamp: string;
}

export const useListingIngestProgress = (sourceId?: string) => {
  const [progress, setProgress] = useState<ListingIngestProgressEvent | null>(null);
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !sourceId) return;

    const handleProgress = (event: ListingIngestProgressEvent) => {
      if (event.sourceId === sourceId) {
        setProgress(event);
      }
    };

    socket.on('listing:ingestProgress', handleProgress);

    return () => {
      socket.off('listing:ingestProgress', handleProgress);
    };
  }, [socket, sourceId]);

  return progress;
};
