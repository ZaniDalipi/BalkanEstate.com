import jsonTemplate from './listings-template.json?raw';
import xmlTemplate from './listings-template.xml?raw';

/**
 * The feed formats we show agencies: JSON in the schema.org RealEstateListing
 * vocabulary (the most widely used — what Google reads and many real-estate
 * sites and plugins already output), and a plain XML. The files are the single source: the
 * backend test `feed-template.test.ts` imports both through the real
 * importer, so whatever follows them imports completely.
 */
export const FEED_TEMPLATES = {
  json: { label: 'JSON', fileName: 'balkanestate-listings.json', mimeType: 'application/json', text: jsonTemplate },
  xml: { label: 'XML', fileName: 'balkanestate-listings.xml', mimeType: 'application/xml', text: xmlTemplate },
} as const;

export type FeedTemplateFormat = keyof typeof FEED_TEMPLATES;

/** Field names as each template writes them, grouped by how much a listing needs them. */
export const FEED_FIELD_GROUPS: Record<FeedTemplateFormat, Record<'needed' | 'recommended' | 'alsoRead', readonly string[]>> = {
  json: {
    needed: ['identifier', 'name', 'offers.price', 'address.addressLocality', 'image'],
    recommended: ['@type', 'offers.businessFunction', 'numberOfBedrooms', 'numberOfBathroomsTotal', 'floorSize.value', 'geo.latitude', 'geo.longitude', 'address.streetAddress', 'description', 'url'],
    alsoRead: ['address.addressCountry', 'offers.priceCurrency', 'floorLevel', 'yearBuilt', 'amenityFeature', 'datePosted'],
  },
  xml: {
    needed: ['id', 'title', 'price', 'city', 'images'],
    recommended: ['listing_type', 'property_type', 'bedrooms', 'bathrooms', 'area', 'lat', 'lng', 'address', 'description', 'url'],
    alsoRead: ['country', 'currency', 'living_rooms', 'floor', 'total_floors', 'year_built', 'parking', 'furnishing', 'heating', 'condition', 'amenities'],
  },
};
