import { useCallback, useEffect, useRef, useState } from 'react';
import type { LatLng } from '../utils/travel';

export type VisitorLocation =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'ready'; position: LatLng; accuracyMeters: number }
  | { status: 'denied' }
  | { status: 'unavailable' }
  | { status: 'unsupported' };

const OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 12_000, maximumAge: 5 * 60_000 };

/**
 * Where the visitor is, only once they ask (a tap on "route from my
 * location") — or straight away when they already allowed location for this
 * site, so the distance can show without a second prompt. Stays on the device;
 * the route request rounds it to ~10 m.
 */
export function useVisitorLocation() {
  const [state, setState] = useState<VisitorLocation>(() =>
    typeof navigator !== 'undefined' && 'geolocation' in navigator ? { status: 'idle' } : { status: 'unsupported' },
  );
  // Ignore a late answer after unmount. Set in the effect body (not only at
  // creation) so StrictMode's mount → unmount → mount doesn't leave it false.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unsupported' });
      return;
    }
    setState({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!alive.current) return;
        setState({ status: 'ready', position: { lat: pos.coords.latitude, lng: pos.coords.longitude }, accuracyMeters: pos.coords.accuracy });
      },
      (err) => {
        if (!alive.current) return;
        setState({ status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable' });
      },
      OPTIONS,
    );
  }, []);

  // Already allowed earlier? Then there is no prompt to spring on anyone: locate quietly.
  useEffect(() => {
    const permissions = (navigator as Navigator & { permissions?: Permissions }).permissions;
    if (!permissions?.query) return;
    let cancelled = false;
    permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((p) => {
        if (!cancelled && p.state === 'granted') locate();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locate]);

  return { location: state, locate };
}
