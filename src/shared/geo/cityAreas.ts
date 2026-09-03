import { findCityCentre } from './cityCatalog';

/**
 * How far from a selected city the address search looks.
 *
 * The radius is not a rule about where a property may be — a seller drops the
 * pin wherever the property actually is. It decides only which addresses the
 * search offers, so that picking a place from the list narrows the results to
 * that place instead of returning same-named streets from across the Balkans.
 *
 * Two tiers, read from the city list itself rather than a table maintained by
 * hand:
 *
 *   · a municipal centre stands for its whole county or municipality, so its
 *     area reaches the surrounding villages — pick Vlorë and the search covers
 *     Vlorë County;
 *   · a locality (a village, resort or coastal town, tagged `tier: 'locality'`
 *     in `BALKAN_LOCATIONS`) stands only for itself — pick Himarë and the
 *     search covers Himarë, not the whole riviera.
 */

/**
 * Area of a county or municipality seat.
 *
 * Set to reach the farthest village the gazetteer files under a county seat
 * (Lukovë, 67km down the coast from Vlorë), so a seller who picks the seat can
 * always search the places listed beneath it. A geo test pins this down.
 */
export const MUNICIPAL_AREA_RADIUS_KM = 70;

/** Area of a single village, resort or coastal town. */
export const LOCALITY_AREA_RADIUS_KM = 15;

/**
 * The radius, in km, the address search covers for `city`.
 * Falls back to the municipal radius for a city that is not on the list, which
 * is the wider of the two — an unknown place narrows nothing.
 */
export const getCityAreaRadiusKm = (country?: string | null, city?: string | null): number => {
  const entry = findCityCentre(country, city);
  return entry?.tier === 'locality' ? LOCALITY_AREA_RADIUS_KM : MUNICIPAL_AREA_RADIUS_KM;
};
