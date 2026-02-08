/**
 * useRainViewer - Hook to fetch real-time precipitation radar tile paths
 *
 * Uses the RainViewer API (free, no API key required) to get the latest
 * global precipitation radar data. Tiles auto-refresh every 10 minutes.
 *
 * @see https://www.rainviewer.com/api.html
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const RAINVIEWER_API = 'https://api.rainviewer.com/public/weather-maps.json';
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

interface RainViewerFrame {
  time: number;
  path: string;
}

interface RainViewerResponse {
  version: string;
  generated: number;
  host: string;
  radar: {
    past: RainViewerFrame[];
    nowcast: RainViewerFrame[];
  };
}

/**
 * Build a RainViewer XYZ tile URL from a frame path.
 * Color scheme 2 = universal, smooth=1 for anti-aliasing, snow=1 for snow overlay.
 */
export function buildRainViewerTileUrl(framePath: string): string {
  return `https://tilecache.rainviewer.com${framePath}/256/{z}/{x}/{y}/2/1_1.png`;
}

export function useRainViewer(enabled: boolean) {
  const [framePath, setFramePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLatestFrame = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(RAINVIEWER_API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: RainViewerResponse = await res.json();

      const past = data.radar?.past;
      if (past && past.length > 0) {
        // Use the most recent actual radar frame
        setFramePath(past[past.length - 1].path);
      } else {
        throw new Error('No radar frames available');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load precipitation data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Clean up when disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    fetchLatestFrame();
    intervalRef.current = setInterval(fetchLatestFrame, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, fetchLatestFrame]);

  const tileUrl = framePath ? buildRainViewerTileUrl(framePath) : null;

  return { tileUrl, framePath, isLoading, error };
}
