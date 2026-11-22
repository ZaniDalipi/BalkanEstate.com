/**
 * What a listing card needs, shared by every endpoint that returns a list of
 * listings (search results, market landing pages), so a card shows the same
 * fields whichever list it came from.
 */
import Agency from '../../models/Agency';

/** List-view projection: heavy fields no card shows are left out. */
export const PROPERTY_LIST_PROJECTION = {
  description: 0,
  rentalHistory: 0,
  priceIntervals: 0,
  tenantRequirements: 0,
  visitAvailability: 0,
  specialFeatures: 0,
  materials: 0,
  'images.publicId': 0,
} as const;

/** Seller fields a card shows (PII is stripped later by sanitizeProperty). */
export const PROPERTY_LIST_SELLER_FIELDS = 'name email phone avatarUrl avatarOptions gender role agencyName agencyId agentId';

interface ListedSeller {
  agencyId?: unknown;
  agencyLogo?: string;
}

/**
 * Add each agent seller's agency logo to its populated seller, in place, with
 * one query for the whole list. Rows are plain objects (from `.lean()`).
 */
export async function attachAgencyLogos(properties: ReadonlyArray<{ sellerId?: unknown }>): Promise<void> {
  const sellers = properties
    .map((p) => p.sellerId)
    .filter((s): s is ListedSeller => !!s && typeof s === 'object' && !!(s as ListedSeller).agencyId);
  if (sellers.length === 0) return;

  const agencies = await Agency.find({ _id: { $in: sellers.map((s) => s.agencyId) } }, { _id: 1, logo: 1 }).lean();
  const logos = new Map(agencies.map((a) => [String(a._id), a.logo as string | undefined]));
  for (const seller of sellers) {
    seller.agencyLogo = logos.get(String(seller.agencyId));
  }
}
