import { CANONICAL_MAPPING } from './canonicalFormat';
import { detectStructure } from './structureDetector';
import type { FeedMapping, XmlNode } from './feedTypes';

/**
 * Known property-feed formats, recognised from the document itself, plus the
 * structure detector for everything else. This is what lets the "Auto-detect"
 * format read any XML property feed without a hand-written mapping.
 *
 * Profiles describe the published formats agencies' CRMs commonly export to
 * portals. Fields a format does not carry (Kyero has no title, Trovit no
 * country) are left to `deriveTitle` and the mapping's defaults; nothing is
 * filled in from outside the feed.
 */

export interface FormatProfile {
  id: 'canonical' | 'kyero' | 'trovit';
  label: string;
  matches: (root: XmlNode) => boolean;
  mapping: FeedMapping;
}

const hasChild = (node: XmlNode, name: string): boolean => node.children.some((c) => c.name === name);

const KYERO_MAPPING: FeedMapping = {
  recordElement: 'property',
  fields: {
    externalId: 'id',
    updatedAt: 'date',
    sourceUrl: 'url/*',
    listingType: 'price_freq',
    rentPeriod: 'price_freq',
    price: 'price',
    currency: 'currency',
    propertyType: 'type',
    city: 'town',
    district: 'location_detail',
    country: 'country',
    latitude: 'location/latitude',
    longitude: 'location/longitude',
    bedrooms: 'beds',
    bathrooms: 'baths',
    area: 'surface_area/built',
    landArea: 'surface_area/plot',
    energyRating: 'energy_rating/consumption',
    description: 'desc/*',
    amenities: 'features/feature',
    images: 'images/image/url',
  },
  valueMaps: {
    listingType: { sale: 'sale', month: 'rent', week: 'rent', night: 'rent' },
    rentPeriod: { month: 'monthly', week: 'weekly', night: 'daily' },
  },
  areaUnit: 'm2',
  deriveTitle: true,
};

const TROVIT_MAPPING: FeedMapping = {
  recordElement: 'ad',
  fields: {
    externalId: 'id',
    sourceUrl: 'url',
    title: 'title',
    description: 'content',
    listingType: 'type',
    propertyType: 'property_type',
    price: 'price',
    currency: 'price/@currency',
    rentPeriod: 'price/@period',
    address: 'address',
    city: 'city',
    district: 'city_area',
    country: 'country',
    latitude: 'latitude',
    longitude: 'longitude',
    area: 'floor_area',
    landArea: 'plot_area',
    bedrooms: 'rooms',
    bathrooms: 'bathrooms',
    floor: 'floor_number',
    yearBuilt: 'year',
    images: 'pictures/picture/picture_url',
    updatedAt: 'date',
  },
  areaUnit: 'm2',
  deriveTitle: true,
};

export const FORMAT_PROFILES: FormatProfile[] = [
  {
    id: 'canonical',
    label: 'BalkanEstateAI XML',
    matches: (root) => root.name === 'balkanestate-feed',
    mapping: CANONICAL_MAPPING,
  },
  {
    id: 'kyero',
    label: 'Kyero',
    matches: (root) => hasChild(root, 'kyero') || (root.name === 'root' && hasChild(root, 'property')),
    mapping: KYERO_MAPPING,
  },
  {
    id: 'trovit',
    label: 'Trovit / Mitula',
    matches: (root) => ['trovit', 'mitula', 'nestoria'].includes(root.name) && hasChild(root, 'ad'),
    mapping: TROVIT_MAPPING,
  },
];

export interface ResolvedFormat {
  source: 'profile' | 'detected';
  profileId?: FormatProfile['id'];
  label: string;
  mapping: FeedMapping;
}

/**
 * Pick the mapping for a document whose listings the current mapping did not
 * find. `root` is the parsed document (records the reader did not recognise
 * stay in it, bounded), so its structure is visible here.
 */
export const resolveFormat = (root: XmlNode): ResolvedFormat | null => {
  const profile = FORMAT_PROFILES.find((p) => p.matches(root));
  if (profile) return { source: 'profile', profileId: profile.id, label: profile.label, mapping: profile.mapping };
  const detected = detectStructure(root);
  if (!detected) return null;
  return {
    source: 'detected',
    label: `<${detected.recordElement}>`,
    mapping: { ...detected.suggestedMapping, deriveTitle: true },
  };
};
