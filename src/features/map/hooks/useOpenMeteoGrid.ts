/**
 * useOpenMeteoGrid - Fetch weather grid data from Open-Meteo API
 *
 * Completely free, no API key required. Fetches temperature and/or wind
 * data for a grid of points within the given map bounds.
 *
 * @see https://open-meteo.com/en/docs
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export interface WeatherGridPoint {
  lat: number;
  lng: number;
  temperature?: number;   // °C
  windSpeed?: number;     // km/h
  windDirection?: number; // degrees (0=N, 90=E, 180=S, 270=W)
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

type DataType = 'temperature' | 'wind';

const GRID_SIZE = 8; // 8x8 = 64 points per request
const DEBOUNCE_MS = 1200;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min cache

function roundBounds(b: MapBounds): string {
  // Round to 1 decimal for cache key stability
  return `${b.north.toFixed(1)},${b.south.toFixed(1)},${b.east.toFixed(1)},${b.west.toFixed(1)}`;
}

function generateGrid(bounds: MapBounds): { lats: number[]; lngs: number[] } {
  const latStep = (bounds.north - bounds.south) / (GRID_SIZE + 1);
  const lngStep = (bounds.east - bounds.west) / (GRID_SIZE + 1);
  const lats: number[] = [];
  const lngs: number[] = [];

  for (let i = 1; i <= GRID_SIZE; i++) {
    for (let j = 1; j <= GRID_SIZE; j++) {
      lats.push(+(bounds.south + i * latStep).toFixed(4));
      lngs.push(+(bounds.west + j * lngStep).toFixed(4));
    }
  }

  return { lats, lngs };
}

export function useOpenMeteoGrid(bounds: MapBounds | null, dataType: DataType | null) {
  const [data, setData] = useState<WeatherGridPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cacheRef = useRef<Map<string, { data: WeatherGridPoint[]; time: number }>>(new Map());
  const abortRef = useRef<AbortController>(undefined);

  const fetchGrid = useCallback(async (b: MapBounds, type: DataType) => {
    const key = `${roundBounds(b)}_${type}`;
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
      setData(cached.data);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setIsLoading(true);
      setError(null);

      const { lats, lngs } = generateGrid(b);
      const currentParams =
        type === 'temperature'
          ? 'current=temperature_2m'
          : 'current=wind_speed_10m,wind_direction_10m';

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(',')}&longitude=${lngs.join(',')}&${currentParams}&timezone=auto`;

      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);
      const json = await res.json();

      // Open-Meteo returns an array when multiple locations are requested
      const items = Array.isArray(json) ? json : [json];
      const results: WeatherGridPoint[] = [];

      items.forEach((item: any, idx: number) => {
        if (item.current) {
          results.push({
            lat: lats[idx],
            lng: lngs[idx],
            temperature: item.current.temperature_2m,
            windSpeed: item.current.wind_speed_10m,
            windDirection: item.current.wind_direction_10m,
          });
        }
      });

      cacheRef.current.set(key, { data: results, time: Date.now() });
      setData(results);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to fetch weather data');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!bounds || !dataType) {
      setData([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGrid(bounds, dataType), DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [bounds, dataType, fetchGrid]);

  return { data, isLoading, error };
}
