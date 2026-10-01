import { mediaLogger } from '../../utils/logger';
import type { MediaKind, MediaOwner } from './mediaNaming';

/**
 * Fill in the display names `buildMediaFolder` uses for readable folders.
 *
 * Callers usually know ids but not names. A missing or failed lookup is never
 * fatal: the folder just falls back to the id alone, and the upload proceeds.
 */

const OBJECT_ID = /^[a-f0-9]{24}$/i;

const USER_KINDS: ReadonlySet<MediaKind> = new Set([
  'property',
  'floorplan',
  'video',
  'avatar',
  'license',
  'credential',
]);

const lookupName = async (
  label: string,
  id: string | undefined,
  load: (id: string) => Promise<string | undefined>
): Promise<string | undefined> => {
  if (!id || !OBJECT_ID.test(id)) return undefined;
  try {
    return await load(id);
  } catch (error) {
    mediaLogger.warn(`⚠️  Could not resolve ${label} name for ${id}, using id-only folder: ${(error as Error).message}`);
    return undefined;
  }
};

export const resolveMediaOwner = async (kind: MediaKind, owner: MediaOwner): Promise<MediaOwner> => {
  const resolved: MediaOwner = { ...owner };

  if (USER_KINDS.has(kind) && !resolved.userName) {
    resolved.userName = await lookupName('user', owner.userId, async (id) => {
      const { default: User } = await import('../../models/User');
      const user = await User.findById(id).select('name').lean<{ name?: string }>();
      return user?.name;
    });
  }

  if ((kind === 'property' || kind === 'floorplan' || kind === 'video') && owner.propertyId && !resolved.propertyTitle) {
    resolved.propertyTitle = await lookupName('listing', owner.propertyId, async (id) => {
      const { default: Property } = await import('../../models/Property');
      const property = await Property.findById(id).select('title').lean<{ title?: string }>();
      return property?.title;
    });
  }

  if ((kind === 'agency-logo' || kind === 'agency-cover') && !resolved.agencyName) {
    resolved.agencyName = await lookupName('agency', owner.agencyId, async (id) => {
      const { default: Agency } = await import('../../models/Agency');
      const agency = await Agency.findById(id).select('name').lean<{ name?: string }>();
      return agency?.name;
    });
  }

  if ((kind === 'business-logo' || kind === 'business-banner') && !resolved.businessName) {
    resolved.businessName = await lookupName('business', owner.businessListingId, async (id) => {
      const { default: BusinessListing } = await import('../../models/BusinessListing');
      const listing = await BusinessListing.findById(id).select('name').lean<{ name?: string }>();
      return listing?.name;
    });
  }

  return resolved;
};
