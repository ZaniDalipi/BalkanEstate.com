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

const ALL_SYNONYMS = new Set(Object.values(SYNONYMS).flat().map(normalizeName));

/** `OfferId` inside `<Offer>` means `id`: drop the record's own name as a prefix. */
const withoutPrefix = (name: string, recordName: string): string => {
  const prefix = normalizeName(recordName);
  const rest = name.startsWith(prefix) ? name.slice(prefix.length).replace(/^_/, '') : name;
  return rest || name;
};

/** How many of a node's direct children are named like listing fields. */
const fieldLikeChildren = (node: XmlNode): number =>
  new Set(node.children.map((c) => normalizeName(c.name)).filter((n) => ALL_SYNONYMS.has(n) || ALL_SYNONYMS.has(withoutPrefix(n, node.name)))).size;

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
      if (richness >= 3) candidates.push({ parent: node, name, count: nodes.length, score: nodes.length * richness * (1 + fieldLikeChildren(nodes[0])) });
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

const suggestPath = (field: FeedField, paths: string[], repeated: Set<string>, taken: Set<string>, recordName: string): string | undefined => {
  const synonyms = (SYNONYMS[field] ?? []).map(normalizeName);
  const rank = (p: string): number => {
    const exact = synonyms.indexOf(lastSegment(p));
    return exact >= 0 ? exact : synonyms.indexOf(withoutPrefix(lastSegment(p), recordName));
  };
  const candidates = paths.filter((p) => !taken.has(p) && rank(p) >= 0);
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
    (a, b) => rank(a) - rank(b) || a.split('/').length - b.split('/').length
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
    const path = suggestPath(field, paths, repeated, taken, candidate.name);
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

export interface FieldCatalogEntry {
  /** Path relative to a listing, usable directly in a mapping. */
  path: string;
  /** First non-empty value seen, shortened. */
  sample: string;
  /** How many of the sampled listings contain it. */
  seenIn: number;
  /** True when the element repeats inside one listing (photos, features…). */
  repeated: boolean;
}

const SAMPLE_RECORDS = 5;
const MAX_CATALOG = 200;

/**
 * Every element and attribute inside the first few listings, with an example
 * value — what the dashboard shows as "all fields in this file" and offers in
 * the mapping editor.
 */
export const buildFieldCatalog = (records: XmlNode[]): FieldCatalogEntry[] => {
  const entries = new Map<string, FieldCatalogEntry>();
  const sampled = records.slice(0, SAMPLE_RECORDS);
  sampled.forEach((record) => {
    const seenHere = new Set<string>();
    const note = (path: string, value: string, repeated: boolean) => {
      let entry = entries.get(path);
      if (!entry) {
        if (entries.size >= MAX_CATALOG) return;
        entry = { path, sample: '', seenIn: 0, repeated: false };
        entries.set(path, entry);
      }
      const clean = value.replace(/\s+/g, ' ').trim();
      if (!entry.sample && clean) entry.sample = clean.length > 120 ? `${clean.slice(0, 117)}…` : clean;
      entry.repeated = entry.repeated || repeated;
      if (!seenHere.has(path)) {
        seenHere.add(path);
        entry.seenIn += 1;
      }
    };
    const walk = (node: XmlNode, prefix: string, depth: number) => {
      for (const [attr, value] of Object.entries(node.attrs)) note(prefix ? `${prefix}/@${attr}` : `@${attr}`, value, false);
      if (depth >= 5) return;
      const counts = new Map<string, number>();
      for (const child of node.children) counts.set(child.name, (counts.get(child.name) ?? 0) + 1);
      for (const child of node.children) {
        const path = prefix ? `${prefix}/${child.name}` : child.name;
        if (child.text.trim() || child.children.length === 0) note(path, child.text, (counts.get(child.name) ?? 0) > 1);
        walk(child, path, depth + 1);
      }
    };
    walk(record, '', 0);
  });
  return Array.from(entries.values());
};
