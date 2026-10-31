import { mediaLogger } from '../../utils/logger';
import type { MediaKeyContext } from './mediaKeys';

/**
 * Fill in the names mediaKeys uses for readable folders — user name, listing
 * title and reference, agency and business names — from the ids a caller has.
 *
 * A missing or failed lookup is never fatal: the folder just falls back to
 * the id alone and the upload goes ahead.
 */

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/** Short-lived memo: a 30-photo listing upload looks the same names up once. */
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: Promise<Record<string, unknown> | null> }>();

const lookup = (
  label: string,
  id: string | undefined,
  load: (id: string) => Promise<Record<string, unknown> | null>
): Promise<Record<string, unknown> | null> => {
  if (!id || !OBJECT_ID.test(id)) return Promise.resolve(null);
  const cacheKey = `${label}:${id}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  if (cache.size > 2000) cache.clear();
  const value = load(id).catch((error) => {
    mediaLogger.warn(`⚠️  Could not look up ${label} ${id} for its folder name: ${(error as Error).message}`);
    return null;
  });
  cache.set(cacheKey, { at: Date.now(), value });
  return value;
};

/** Test hook. */
export const clearMediaNameCache = (): void => cache.clear();

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

/** `ctx` with every name it can find filled in. Names already given are kept. */
export const resolveMediaNames = async (ctx: MediaKeyContext): Promise<MediaKeyContext> => {
  const out: MediaKeyContext = { ...ctx };

  if (!out.userName) {
    const user = await lookup('user', ctx.userId, async (id) => {
      const { default: User } = await import('../../models/User');
      return User.findById(id).select('name').lean();
    });
    out.userName = str(user?.name);
  }

  if (ctx.propertyId && (!out.propertyTitle || !out.propertyRef)) {
    const property = await lookup('listing', ctx.propertyId, async (id) => {
      const { default: Property } = await import('../../models/Property');
      return Property.findById(id).select('title propertyId').lean();
    });
    out.propertyTitle = out.propertyTitle ?? str(property?.title);
    out.propertyRef = out.propertyRef ?? str(property?.propertyId);
  }

  if (ctx.agencyId && !out.agencyName) {
    const agency = await lookup('agency', ctx.agencyId, async (id) => {
      const { default: Agency } = await import('../../models/Agency');
      return Agency.findById(id).select('name').lean();
    });
    out.agencyName = str(agency?.name);
  }

  if (ctx.businessListingId && !out.businessName) {
    const business = await lookup('business', ctx.businessListingId, async (id) => {
      const { default: BusinessListing } = await import('../../models/BusinessListing');
      return BusinessListing.findById(id).select('name').lean();
    });
    out.businessName = str(business?.name);
  }

  return out;
};
