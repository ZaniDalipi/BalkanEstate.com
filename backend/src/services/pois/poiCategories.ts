/**
 * Which places a home buyer cares about, and how an OpenMapTiles `poi`
 * feature (class + subclass) maps onto them. Pure.
 *
 * Everything else in the layer (gates, bins, bike racks, hairdressers…) is
 * left out: a zoom-14 city tile carries ~4,000 features, mostly noise.
 */

export const POI_CATEGORIES = [
  'transport', 'education', 'health', 'shopping', 'park',
  'dining', 'culture', 'worship', 'sport', 'services',
] as const;

export type PoiCategory = (typeof POI_CATEGORIES)[number];

/** Looked up by subclass first (more specific), then by class. */
const BY_SUBCLASS: Record<string, PoiCategory> = {
  // transport
  bus_stop: 'transport', bus_station: 'transport', station: 'transport', halt: 'transport',
  tram_stop: 'transport', subway: 'transport', ferry_terminal: 'transport',
  // education
  school: 'education', kindergarten: 'education', college: 'education', university: 'education',
  // health
  hospital: 'health', clinic: 'health', doctors: 'health', dentist: 'health', pharmacy: 'health',
  // shopping
  supermarket: 'shopping', convenience: 'shopping', mall: 'shopping',
  department_store: 'shopping', marketplace: 'shopping', bakery: 'shopping',
  // park
  park: 'park', playground: 'park',
  // dining
  restaurant: 'dining', cafe: 'dining', fast_food: 'dining',
  // culture
  museum: 'culture', gallery: 'culture', theatre: 'culture', cinema: 'culture', library: 'culture',
  attraction: 'culture', monument: 'culture', castle: 'culture', viewpoint: 'culture',
  // sport
  stadium: 'sport', sports_centre: 'sport', swimming_pool: 'sport', fitness_centre: 'sport',
  // services
  bank: 'services', post_office: 'services', police: 'services', townhall: 'services',
};

const BY_CLASS: Record<string, PoiCategory> = {
  place_of_worship: 'worship',
  castle: 'culture',
  museum: 'culture',
  stadium: 'sport',
  college: 'education',
  school: 'education',
  hospital: 'health',
};

const text = (v: unknown): string => (typeof v === 'string' ? v.trim().toLowerCase() : '');

/** The category of a tile feature, or null when it is not a place we show. */
export const poiCategoryOf = (properties: Record<string, unknown>): PoiCategory | null =>
  BY_SUBCLASS[text(properties.subclass)] ?? BY_CLASS[text(properties.class)] ?? null;
