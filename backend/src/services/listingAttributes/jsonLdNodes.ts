/**
 * Picks the schema.org JSON-LD nodes that describe the listing itself.
 *
 * A detail page usually carries several blocks: the agency
 * (RealEstateAgent / Organization, with the agency's own address and logo),
 * the website, breadcrumbs and the listing. Reading them in page order gave
 * listings the agency's name, city and logo. Only listing-like nodes are kept,
 * most specific first, and nodes nested under `mainEntity`, `itemOffered`,
 * `about` or `@graph` are reached too.
 */

type Node = Record<string, unknown>;

/** Most specific first: a RealEstateListing beats the Product or Place on the same page. */
const LISTING_TYPES = [
  'RealEstateListing', 'Apartment', 'House', 'SingleFamilyResidence', 'Residence', 'Room',
  'Accommodation', 'ApartmentComplex', 'GatedResidenceCommunity', 'LandmarksOrHistoricalBuildings',
  'Product', 'Offer', 'Place',
];

const NESTED_KEYS = ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemOffered', 'about', 'offers'];

const typesOf = (node: Node): string[] => {
  const t = node['@type'];
  if (typeof t === 'string') return [t];
  return Array.isArray(t) ? t.filter((x): x is string => typeof x === 'string') : [];
};

const rankOf = (node: Node): number => {
  const ranks = typesOf(node).map((t) => LISTING_TYPES.indexOf(t)).filter((r) => r >= 0);
  return ranks.length ? Math.min(...ranks) : -1;
};

const collect = (value: unknown, out: Node[], depth: number): void => {
  if (depth > 10 || value == null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const v of value) collect(v, out, depth + 1);
    return;
  }
  const node = value as Node;
  if (rankOf(node) >= 0) out.push(node);
  for (const key of NESTED_KEYS) collect(node[key], out, depth + 1);
};

/** Listing nodes among the parsed JSON-LD blocks of a page, most specific first. */
export const listingJsonLdNodes = (blocks: unknown[]): Node[] => {
  const found: Node[] = [];
  collect(blocks, found, 0);
  // An Offer only matters as the price holder of a listing; a bare Place
  // without listing signals (rooms, size, offers) is usually a map pin.
  const useful = found.filter((n) => {
    const types = typesOf(n);
    if (types.includes('Offer')) return false;
    if (types.length === 1 && types[0] === 'Place') return 'floorSize' in n || 'numberOfRooms' in n || 'offers' in n;
    return true;
  });
  return useful
    .map((node, i) => ({ node, i, rank: rankOf(node) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.node);
};
