/**
 * Cloudinary naming — one place that decides where every asset lives.
 *
 * Layout (browsable A–Z in the Media Library):
 *
 * balkan-estate/
 * ├── agencies/{a-z}/{agency-name}_{agencyId}/{logo|cover}
 * ├── businesses/{a-z}/{business-name}_{businessId}/{logo|banner}
 * ├── external-feeds/{source}/{listingId}          (only if re-hosting is enabled)
 * ├── messages/{conversationId}
 * ├── site/{logo|email-logo|ad-banners}
 * └── users/{a-z}/{user-name}_{userId}/
 *     ├── avatar
 *     ├── documents/license
 *     ├── documents/credentials/{credentialId}
 *     └── listings/
 *         ├── temp                                 (swept after 48h)
 *         └── {listing-title}_{propertyId}/{photos|floorplans|videos}
 *
 * Names come first so folders sort alphabetically; the id always follows so a
 * folder is still unique and searchable by id after someone renames things.
 *
 * Deletes never rely on these paths (names change, ids inside them don't
 * always line up with older layouts). Every asset is also tagged with its
 * owner / listing / agency / business id — see `mediaTags` — and cleanup goes
 * by tag.
 *
 * Everything here is pure so it can be unit tested without Cloudinary or Mongo.
 */

export const MEDIA_ROOT = 'balkan-estate';

export type MediaKind =
  | 'property'
  | 'floorplan'
  | 'video'
  | 'avatar'
  | 'license'
  | 'credential'
  | 'agency-logo'
  | 'agency-cover'
  | 'business-logo'
  | 'business-banner'
  | 'site-logo'
  | 'site-email-logo'
  | 'ad-banner';

/** Ids and names needed to place one asset. Only the ones the kind uses matter. */
export interface MediaOwner {
  userId: string;
  /** Display name of the user (listings, avatars, documents). */
  userName?: string;
  propertyId?: string;
  propertyTitle?: string;
  agencyId?: string;
  agencyName?: string;
  businessListingId?: string;
  businessName?: string;
  credentialId?: string;
}

const SEGMENT_MAX = 40;

/**
 * Turn any label into a lowercase, accent-free, URL-safe slug.
 * "Ëndrit Hoxha" → "endrit-hoxha"; returns '' when nothing usable is left.
 */
export const slugify = (text: string | undefined | null, maxLen = SEGMENT_MAX): string => {
  if (!text || typeof text !== 'string') return '';
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/g, '');
};

/** Keep an id to characters Cloudinary accepts in a public_id. */
export const safeId = (id: string | undefined | null): string =>
  typeof id === 'string' ? id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) : '';

/** The A–Z bucket a slug belongs in: its first letter, or "0-9" / "_" otherwise. */
export const letterBucket = (slug: string): string => {
  const first = slug.charAt(0);
  if (/[a-z]/.test(first)) return first;
  if (/[0-9]/.test(first)) return '0-9';
  return '_';
};

/**
 * "{name}_{id}" — the readable, still-unique folder name for an entity.
 * Falls back to just the id when there is no usable name.
 */
export const namedSegment = (name: string | undefined, id: string): string => {
  const slug = slugify(name);
  const cleanId = safeId(id);
  return slug ? `${slug}_${cleanId}` : cleanId;
};

/** "{a-z}/{name}_{id}" — an entity folder filed under its letter. */
export const bucketedSegment = (name: string | undefined, id: string): string => {
  const segment = namedSegment(name, id);
  return `${letterBucket(segment)}/${segment}`;
};

/** balkan-estate/users/{a-z}/{user-name}_{userId} */
export const userRoot = (userId: string, userName?: string): string =>
  `${MEDIA_ROOT}/users/${bucketedSegment(userName, userId)}`;

/** Folder for a listing's media, or the temp folder when it has no id yet. */
export const listingFolder = (owner: MediaOwner, sub: 'photos' | 'floorplans' | 'videos'): string => {
  const root = `${userRoot(owner.userId, owner.userName)}/listings`;
  if (!owner.propertyId) {
    return sub === 'floorplans' ? `${root}/temp/floorplans` : `${root}/temp`;
  }
  return `${root}/${namedSegment(owner.propertyTitle, owner.propertyId)}/${sub}`;
};

/** Resolve the folder an asset of `kind` belongs in. */
export const buildMediaFolder = (kind: MediaKind, owner: MediaOwner): string => {
  switch (kind) {
    case 'property':
      return listingFolder(owner, 'photos');
    case 'floorplan':
      return listingFolder(owner, 'floorplans');
    case 'video':
      return listingFolder(owner, 'videos');
    case 'avatar':
      return `${userRoot(owner.userId, owner.userName)}/avatar`;
    case 'license':
      return `${userRoot(owner.userId, owner.userName)}/documents/license`;
    case 'credential': {
      const base = `${userRoot(owner.userId, owner.userName)}/documents/credentials`;
      return owner.credentialId ? `${base}/${safeId(owner.credentialId)}` : base;
    }
    case 'agency-logo':
    case 'agency-cover': {
      const agencyId = owner.agencyId || owner.userId;
      const sub = kind === 'agency-logo' ? 'logo' : 'cover';
      return `${MEDIA_ROOT}/agencies/${bucketedSegment(owner.agencyName, agencyId)}/${sub}`;
    }
    case 'business-logo':
    case 'business-banner': {
      const businessId = owner.businessListingId || owner.userId;
      const sub = kind === 'business-logo' ? 'logo' : 'banner';
      return `${MEDIA_ROOT}/businesses/${bucketedSegment(owner.businessName, businessId)}/${sub}`;
    }
    case 'site-logo':
      return `${MEDIA_ROOT}/site/logo`;
    case 'site-email-logo':
      return `${MEDIA_ROOT}/site/email-logo`;
    case 'ad-banner':
      return `${MEDIA_ROOT}/site/ad-banners`;
    default: {
      const unreachable: never = kind;
      throw new Error(`Unknown media kind: ${String(unreachable)}`);
    }
  }
};

// ---------------------------------------------------------------------------
// Tags — what cleanup keys on
// ---------------------------------------------------------------------------

export const ownerTag = (userId: string): string => `owner_${safeId(userId)}`;
export const listingTag = (propertyId: string): string => `listing_${safeId(propertyId)}`;
export const agencyTag = (agencyId: string): string => `agency_${safeId(agencyId)}`;
export const businessTag = (businessId: string): string => `business_${safeId(businessId)}`;
export const kindTag = (kind: MediaKind): string => `kind_${kind}`;

/** Every tag an asset should carry, so it can be found and deleted by id. */
export const mediaTags = (kind: MediaKind, owner: MediaOwner): string[] => {
  const tags = [kindTag(kind)];
  // Placeholder owners (e.g. 'public-advertising') are not real users.
  if (/^[a-f0-9]{24}$/i.test(owner.userId)) tags.push(ownerTag(owner.userId));
  if (owner.propertyId) tags.push(listingTag(owner.propertyId));
  if (owner.agencyId) tags.push(agencyTag(owner.agencyId));
  if (owner.businessListingId) tags.push(businessTag(owner.businessListingId));
  return tags;
};
