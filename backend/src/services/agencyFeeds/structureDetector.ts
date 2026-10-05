import { FEED_FIELDS, MULTI_VALUE_FIELDS, type FeedField, type FeedMapping, type XmlNode } from './feedTypes';

/**
 * Work out how an unknown XML file lists its properties, so an agency whose
 * export is not in the canonical format gets a ready-made mapping instead of
 * "0 listings".
 *
 * The record element is the element that repeats most under one parent and
 * carries the most data; the field paths are collected from a few of those
 * records, and each feed field is matched to a path by common element names
 * (English and Balkan-language variants). The result is only a suggestion the
 * agency reviews in the mapping editor before it is used.
 */

export interface DetectedStructure {
  recordElement: string;
  /** Records seen in the parsed sample (the reader keeps a bounded copy). */
  sampleCount: number;
  /** Paths found inside a record, relative to it, e.g. `price/@currency`. */
  paths: string[];
  suggestedMapping: FeedMapping;
  /** Feed fields the suggestion could not find. */
  unmatched: FeedField[];
}

const SYNONYMS: Partial<Record<FeedField, string[]>> = {
  externalId: ['id', 'ref', 'reference', 'code', 'listing_id', 'listingid', 'property_id', 'propertyid', 'sifra', 'šifra', 'offer_id', 'unique_id', 'agent_ref', 'refno'],
  status: ['status', 'state', 'active', 'availability'],
  sourceUrl: ['url', 'link', 'permalink', 'web', 'webpage', 'href'],
  title: ['title', 'name', 'headline', 'naslov', 'heading', 'subject', 'caption'],
  description: ['description', 'desc', 'opis', 'body', 'text', 'content', 'details', 'remarks', 'longdescription'],
  listingType: ['transaction', 'transaction_type', 'offer', 'for', 'offer_type', 'offertype', 'deal', 'deal_type', 'listing_type', 'listingtype', 'contract', 'purpose', 'sale_rent', 'ad_type'],
  rentPeriod: ['rent_period', 'price_period', 'period', 'frequency'],
  propertyType: ['property_type', 'propertytype', 'type', 'kind', 'category', 'realty_type', 'estate_type', 'object_type', 'vrsta', 'tip'],
  price: ['price', 'cena', 'cijena', 'cmimi', 'çmimi', 'amount', 'value', 'price_value', 'pret', 'preț', 'τιμή', 'цена'],
  currency: ['currency', 'valuta', 'curr', 'price_currency'],
  country: ['country', 'drzava', 'država', 'state_country', 'country_name'],
  city: ['city', 'town', 'grad', 'municipality', 'place', 'locality', 'qyteti', 'oras', 'град'],
  district: ['district', 'neighbourhood', 'neighborhood', 'area_name', 'quarter', 'naselje', 'kvart', 'suburb', 'zone', 'region'],
  address: ['address', 'street', 'adresa', 'street_address', 'location_address', 'ulica'],
  latitude: ['latitude', 'lat', 'geo_lat', 'gps_lat', 'y'],
  longitude: ['longitude', 'lng', 'lon', 'long', 'geo_lng', 'gps_lng', 'x'],
  area: ['area', 'size', 'surface', 'sqm', 'm2', 'living_area', 'livingarea', 'floor_area', 'kvadratura', 'povrsina', 'površina', 'built_area', 'net_area', 'usable_area'],
  landArea: ['land_area', 'landarea', 'plot', 'plot_size', 'plot_area', 'lot_size', 'land', 'okucnica'],
  bedrooms: ['bedrooms', 'beds', 'bedroom', 'spavace_sobe', 'sobe', 'rooms', 'bedrooms_count'],
  bathrooms: ['bathrooms', 'baths', 'bathroom', 'kupatila', 'kupaonice', 'toilets', 'wc'],
  livingRooms: ['living_rooms', 'livingrooms', 'salons'],
  floor: ['floor', 'floor_number', 'level', 'kat', 'sprat', 'etaz', 'etaž'],
  totalFloors: ['total_floors', 'floors', 'floors_total', 'number_of_floors', 'building_floors'],
  yearBuilt: ['year_built', 'yearbuilt', 'built', 'construction_year', 'year', 'godina_izgradnje'],
  energyRating: ['energy_rating', 'energy_class', 'energyclass', 'energy', 'epc'],
  amenities: ['amenity', 'feature', 'facility', 'extra', 'option'],
  images: ['image', 'photo', 'picture', 'img', 'pic', 'slika', 'foto', 'media'],
  floorplans: ['floorplan', 'floor_plan', 'plan', 'layout'],
  updatedAt: ['updated', 'updated_at', 'modified', 'last_modified', 'date_modified', 'lastupdate', 'date_updated'],
};

const normalizeName = (name: string): string => name.toLowerCase().replace(/[-\s.]/g, '_');

const countDescendants = (node: XmlNode, limit = 200): number => {
  let count = Object.keys(node.attrs).length;
  for (const child of node.children) {
    count += 1 + countDescendants(child, limit);
    if (count >= limit) return limit;
  }
  return count;
};

interface Candidate {
  parent: XmlNode;
  name: string;
  count: number;
  score: number;
}

/** Pick the element that repeats under one parent and carries the most data. */
const findRecordCandidate = (root: XmlNode): Candidate | null => {
  const candidates: Candidate[] = [];
  const visit = (node: XmlNode, depth: number) => {
    if (depth > 6) return;
    const groups = new Map<string, XmlNode[]>();
    for (const child of node.children) groups.set(child.name, [...(groups.get(child.name) ?? []), child]);
    for (const [name, nodes] of groups) {
      const richness = countDescendants(nodes[0]);
      if (richness >= 3) candidates.push({ parent: node, name, count: nodes.length, score: nodes.length * richness });
    }
    for (const child of node.children) visit(child, depth + 1);
  };
  visit(root, 0);
  // Listings repeat: a wrapper that occurs once (e.g. <properties>) only wins
  // when the file holds a single listing.
  const repeated = candidates.filter((c) => c.count > 1);
  const pool = repeated.length > 0 ? repeated : candidates;
  return pool.reduce<Candidate | null>((best, c) => (!best || c.score > best.score ? c : best), null);
};

/** Every element and attribute path inside a few records, in first-seen order. */
const collectPaths = (records: XmlNode[]): { paths: string[]; repeated: Set<string> } => {
  const paths: string[] = [];
  const seen = new Set<string>();
  const repeated = new Set<string>();
  const add = (p: string) => {
    if (!seen.has(p) && paths.length < 150) {
      seen.add(p);
      paths.push(p);
    }
  };
  const walk = (node: XmlNode, prefix: string, depth: number) => {
    for (const attr of Object.keys(node.attrs)) add(prefix ? `${prefix}/@${attr}` : `@${attr}`);
    if (depth >= 4) return;
    const counts = new Map<string, number>();
    for (const child of node.children) counts.set(child.name, (counts.get(child.name) ?? 0) + 1);
    for (const child of node.children) {
      const p = prefix ? `${prefix}/${child.name}` : child.name;
      if ((counts.get(child.name) ?? 0) > 1) repeated.add(p);
      if (child.text.trim() || Object.keys(child.attrs).length === 0) add(p);
      walk(child, p, depth + 1);
    }
  };
  for (const record of records.slice(0, 5)) walk(record, '', 0);
  return { paths, repeated };
};

const lastSegment = (path: string): string => normalizeName(path.split('/').pop()!.replace(/^@/, ''));

const suggestPath = (field: FeedField, paths: string[], repeated: Set<string>, taken: Set<string>): string | undefined => {
  const synonyms = (SYNONYMS[field] ?? []).map(normalizeName);
  const candidates = paths.filter((p) => !taken.has(p) && synonyms.includes(lastSegment(p)));
  if (MULTI_VALUE_FIELDS.has(field)) {
    // Repeated media/amenity elements: prefer the repeated element, then a URL attribute on it.
    const repeatedHit = candidates.find((p) => repeated.has(p)) ?? candidates[0];
    if (!repeatedHit) return undefined;
    const urlAttr = paths.find((p) => p.startsWith(`${repeatedHit}/@`) && ['url', 'src', 'href', 'link'].includes(lastSegment(p)));
    const urlChild = paths.find((p) => p.startsWith(`${repeatedHit}/`) && ['url', 'src', 'href', 'link', 'path'].includes(lastSegment(p)));
    return urlAttr ?? urlChild ?? repeatedHit;
  }
  // Prefer synonyms listed earlier, then shallower paths.
  return candidates.sort(
    (a, b) => synonyms.indexOf(lastSegment(a)) - synonyms.indexOf(lastSegment(b)) || a.split('/').length - b.split('/').length
  )[0];
};

export const detectStructure = (header: XmlNode): DetectedStructure | null => {
  const candidate = findRecordCandidate(header);
  if (!candidate) return null;
  const records = candidate.parent.children.filter((c) => c.name === candidate.name);
  const { paths, repeated } = collectPaths(records);
  const fields: Partial<Record<FeedField, string>> = {};
  const taken = new Set<string>();
  const order: FeedField[] = ['externalId', 'images', 'floorplans', 'amenities', ...FEED_FIELDS.filter((f) => !['externalId', 'images', 'floorplans', 'amenities'].includes(f))];
  for (const field of order) {
    const path = suggestPath(field, paths, repeated, taken);
    if (path) {
      fields[field] = path;
      taken.add(path);
    }
  }
  // Currency is very often an attribute of the price element.
  if (!fields.currency && fields.price) {
    const attr = paths.find((p) => p.startsWith(`${fields.price}/@`) && ['currency', 'cur', 'valuta'].includes(lastSegment(p)));
    if (attr) fields.currency = attr;
  }
  return {
    recordElement: candidate.name,
    sampleCount: candidate.count,
    paths,
    suggestedMapping: { recordElement: candidate.name, fields, areaUnit: 'm2' },
    unmatched: FEED_FIELDS.filter((f) => !fields[f]),
  };
};
