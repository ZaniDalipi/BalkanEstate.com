import { useCallback, useState } from 'react';
import { readHomePlace, writeHomePlace, type HomePlace } from './homePlace';
import { isValidLatLng } from './spotlightUtils';

export type LocateResult = { ok: true } | { ok: false; reason: 'denied' | 'unavailable' };

/** "My place", remembered on this device, plus a way to set it from the current position. */
export function useHomePlace() {
  const [home, setHomeState] = useState<HomePlace | null>(readHomePlace);
  const [isLocating, setIsLocating] = useState(false);

  const setHome = useCallback((place: HomePlace | null) => {
    setHomeState(place);
    writeHomePlace(place);
  }, []);

  const locateMe = useCallback((label: string): Promise<LocateResult> => {
    if (!('geolocation' in navigator)) return Promise.resolve({ ok: false, reason: 'unavailable' });
    setIsLocating(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setIsLocating(false);
          const place = { lat: coords.latitude, lng: coords.longitude };
          if (!isValidLatLng(place)) return resolve({ ok: false, reason: 'unavailable' });
          setHome({ ...place, label, source: 'gps' });
          resolve({ ok: true });
        },
        (err) => {
          setIsLocating(false);
          resolve({ ok: false, reason: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable' });
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
      );
    });
  }, [setHome]);

  return { home, setHome, locateMe, isLocating };
}
