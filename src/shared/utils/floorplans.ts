import type { FloorplanLevel, FloorplanSpot } from '@/shared/types/property.types';

/**
 * A listing's floor plans, in order. Listings from before multi-floor support
 * only have `floorplanUrl`; that is read as a single, unlabelled floor.
 */
export function getFloorPlans(property: { floorplans?: FloorplanLevel[]; floorplanUrl?: string }): FloorplanLevel[] {
  const floors = (property.floorplans || []).filter((f) => f && f.url);
  if (floors.length > 0) return floors;
  return property.floorplanUrl ? [{ url: property.floorplanUrl }] : [];
}

/** Which floor a photo spot is on (spots saved before floors existed are on the first). */
export function spotFloor(spot: FloorplanSpot | undefined): number {
  return spot?.floor ?? 0;
}
