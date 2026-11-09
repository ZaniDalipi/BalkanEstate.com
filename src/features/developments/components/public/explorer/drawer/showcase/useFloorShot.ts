import { useMemo } from 'react';
import { usePublicViews } from '../../../../../hooks/useScenes';
import type { PublicUnit } from '../../../../../types';
import { pickFloorShot } from './floorShot';
import { floorShotState, type FloorShotState } from './floorShotState';

interface FloorShotOptions {
  enabled?: boolean;
  /** Whether the apartment's floor has a published picture (`DevelopmentFloor.hasViews`); undefined: not known. */
  hasPicture?: boolean;
}

/**
 * The apartment's floor picture (the plan the developer drew its homes on),
 * shared with the explorer's cache. A floor known to have no picture is never
 * asked for; one known to have it is waited for (and offered again when it
 * could not load). The details never show an error in place of what else there is.
 */
export function useFloorShot(slug: string, unit: Pick<PublicUnit, 'id' | 'floorId'> | undefined, { enabled = true, hasPicture }: FloorShotOptions = {}): FloorShotState {
  const floorId = enabled && hasPicture !== false ? unit?.floorId : undefined;
  const { views, isLoading, error, refetch } = usePublicViews(slug, 'floor', floorId);
  const unitId = unit?.id;
  const shot = useMemo(() => (unitId && floorId ? pickFloorShot(views, unitId) : null), [views, unitId, floorId]);
  return floorShotState({ shot, loading: isLoading, failed: !!error, expected: !!floorId && hasPicture === true, retry: () => void refetch() });
}
