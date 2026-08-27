/**
 * Where the property page's map hands the visitor over to.
 *
 * The property map ends in a "Full Map" button. Which full map that is depends
 * on the listing the visitor is looking at: a luxury villa belongs to the
 * curated villas map, a rental to the rentals map, everything else to the buy
 * map. Before this module the button always went to the buy map (or the
 * rentals map for rentals) with the same neutral label, so a visitor on a
 * luxury villa was dropped into a search that no longer contained it.
 *
 * The mapping lives here — not in the component — so that the destination the
 * button *navigates* to and the destination it is *labelled* with can never
 * drift apart: both read the same frozen record.
 *
 * Everything entering this module is treated as untrusted. `propertyType` and
 * `listingType` arrive from an API response (and, for previews, from a
 * half-filled listing form), so they are normalised rather than trusted to be
 * one of the domain literals; anything unrecognised falls back to the neutral
 * buy map instead of throwing or producing an undefined view.
 */

import { validateCoordinates, sanitizeText } from '@/shared/utils/validation';

/** The three markets a property page can send a visitor back to. */
export type MapMarket = 'villas' | 'rent' | 'sale' | 'unknown';

/** Routes (pre-localisation) that render a searchable map. */
export type MapDestinationPath = '/villas' | '/rent' | '/search';

export interface MapDestination {
  /** Which market the property belongs to — drives label, colour and route. */
  market: MapMarket;
  /**
   * Route to navigate to. A path rather than an `AppView`: navigating through
   * the router leaves the address bar and the back button pointing at the map
   * the visitor is actually looking at.
   */
  path: MapDestinationPath;
  /** i18n key for the desktop button label. */
  labelKey: string;
  /** English default, used when a locale has not been translated yet. */
  labelFallback: string;
  /** i18n key for the compact (mobile) button label. */
  shortLabelKey: string;
  shortLabelFallback: string;
  /**
   * Tailwind classes for the button's accent. Matched to the colours the rest
   * of the app already uses for these markets: gold for luxury villas (the
   * villa marker palette), blue for rentals and emerald for sale — the same
   * pairing as the listing-type card in `PropertyInfo`.
   */
  accentClassName: string;
}

const NEUTRAL_LABEL_KEY = 'property:cinematicMap.controls.exploreMap';
const NEUTRAL_SHORT_KEY = 'property:cinematicMap.controls.mapShort';

/**
 * Every destination the button can have. Frozen: a destination is a constant
 * of the design, never something a caller patches at runtime.
 */
export const MAP_DESTINATIONS: Readonly<Record<MapMarket, MapDestination>> = Object.freeze({
  villas: Object.freeze({
    market: 'villas',
    path: '/villas',
    labelKey: 'property:cinematicMap.controls.exploreVillasMap',
    labelFallback: 'Villas Map',
    shortLabelKey: 'property:cinematicMap.controls.villasMapShort',
    shortLabelFallback: 'Villas',
    accentClassName: 'border-amber-400/60 hover:border-amber-300 text-amber-100',
  }),
  rent: Object.freeze({
    market: 'rent',
    path: '/rent',
    labelKey: 'property:cinematicMap.controls.exploreRentalsMap',
    labelFallback: 'Rentals Map',
    shortLabelKey: 'property:cinematicMap.controls.rentalsMapShort',
    shortLabelFallback: 'Rent',
    accentClassName: 'border-blue-400/60 hover:border-blue-300 text-blue-50',
  }),
  sale: Object.freeze({
    market: 'sale',
    path: '/search',
    labelKey: 'property:cinematicMap.controls.exploreSaleMap',
    labelFallback: 'For-Sale Map',
    shortLabelKey: 'property:cinematicMap.controls.saleMapShort',
    shortLabelFallback: 'Buy',
    accentClassName: 'border-emerald-400/60 hover:border-emerald-300 text-emerald-50',
  }),
  unknown: Object.freeze({
    market: 'unknown',
    path: '/search',
    labelKey: NEUTRAL_LABEL_KEY,
    labelFallback: 'Full Map',
    shortLabelKey: NEUTRAL_SHORT_KEY,
    shortLabelFallback: 'Map',
    accentClassName: 'border-slate-700/50 hover:border-slate-500 text-white',
  }),
} as const);

/** Lower-cases and trims a value that is only *expected* to be a string. */
const normaliseToken = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

/** The property fields the destination is derived from. */
export interface MapDestinationInput {
  propertyType?: unknown;
  listingType?: unknown;
}

/**
 * Resolve the map a property should send the visitor to.
 *
 * Luxury villas win over the listing type on purpose: they are a curated
 * market of their own that carries both rentals and sales (see
 * `useVillaSearch`), so a villa for sale still belongs on the villas map.
 */
export const resolveMapDestination = (input: MapDestinationInput): MapDestination => {
  if (normaliseToken(input.propertyType) === 'luxury-villa') {
    return MAP_DESTINATIONS.villas;
  }

  switch (normaliseToken(input.listingType)) {
    case 'rent':
      return MAP_DESTINATIONS.rent;
    case 'sale':
      return MAP_DESTINATIONS.sale;
    default:
      // No listing type on the record (or an unrecognised one): the buy map is
      // the app's default listing surface, but the button stays neutrally
      // labelled rather than claiming a market we cannot vouch for.
      return MAP_DESTINATIONS.unknown;
  }
};

/**
 * The coordinate the destination map should fly to.
 *
 * Longest address we will carry into the map state. The label is rendered as
 * text, never as HTML, but an unbounded string from an API response has no
 * business sitting in persisted UI state either.
 */
const MAX_FOCUS_ADDRESS_LENGTH = 120;

export interface MapFocusTarget {
  lat: number;
  lng: number;
  address: string;
}

export interface MapFocusInput {
  lat?: unknown;
  lng?: unknown;
  address?: unknown;
  city?: unknown;
  country?: unknown;
}

/**
 * Build the `focusMapOnProperty` payload, or `null` when the property has no
 * usable position.
 *
 * Returning `null` instead of a partial payload is what keeps a listing with a
 * missing or corrupt coordinate from flying the destination map to (0, 0) or
 * to `NaN` — the caller navigates without a focus target instead.
 */
export const buildMapFocusTarget = (input: MapFocusInput): MapFocusTarget | null => {
  const lat = typeof input.lat === 'number' ? input.lat : Number.NaN;
  const lng = typeof input.lng === 'number' ? input.lng : Number.NaN;

  if (!validateCoordinates(lat, lng).isValid) {
    return null;
  }

  // The street address when there is one, otherwise the city/country pair —
  // the same fallback the map card itself uses for its heading, so the label
  // that flies onto the destination map matches the one the visitor just left.
  const address = normaliseAddressPart(input.address);
  const fallback = [input.city, input.country]
    .map(normaliseAddressPart)
    .filter((part) => part.length > 0)
    .join(', ');

  return {
    lat,
    lng,
    address: (address || fallback).slice(0, MAX_FOCUS_ADDRESS_LENGTH),
  };
};

const normaliseAddressPart = (value: unknown): string =>
  typeof value === 'string' ? sanitizeText(value) : '';
