/**
 * A residence's builder linked to its company in the Business Directory.
 *
 * Only the owner of a business can link it (to a residence they may edit),
 * so nobody can put a company they do not run behind a residence. Buyers then
 * see the business's details, kept up to date on its directory page; what the
 * owner typed in the builder form fills what the business does not say
 * (tagline, completed projects, YouTube). The link itself never leaves the
 * server: buyers get the business's public page address only.
 */
import mongoose from 'mongoose';
import BusinessListing from '../../models/BusinessListing';
import type { IDevelopment } from '../../models/Development';
import { encodeId, resolveId } from '../../utils/idObfuscation';
import { NotFoundError } from './developmentListingService';
import { BUILDER_LIMITS as L } from './builderProfile';

/** What the business's public directory page already shows, and nothing else. */
const PUBLIC_BUSINESS_FIELDS = 'name slug description logoUrl bannerUrl contactPhone contactEmail website address city country yearEstablished licenseNumber socialMedia';

export interface BusinessLike {
  _id?: unknown;
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  logoUrl?: unknown;
  bannerUrl?: unknown;
  contactPhone?: unknown;
  contactEmail?: unknown;
  website?: unknown;
  address?: unknown;
  city?: unknown;
  country?: unknown;
  yearEstablished?: unknown;
  licenseNumber?: unknown;
  socialMedia?: { facebook?: unknown; instagram?: unknown; linkedin?: unknown } | null;
}

const str = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return s && s.length <= max ? s : undefined;
};
const httpUrl = (v: unknown, max: number): string | undefined => {
  const s = str(v, max);
  if (!s) return undefined;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(s) ? s : `https://${s}`);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.') && !url.username ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/**
 * The company as buyers see it: the business's public details, then what the
 * owner typed (`typed`, the public builder) where the business says nothing.
 */
export function businessAsBuilder(business: BusinessLike | null | undefined, typed: Record<string, unknown> = {}, now = new Date()): Record<string, unknown> | undefined {
  const name = str(business?.name, L.name);
  if (!business || !name) return undefined;
  const year = typeof business.yearEstablished === 'number' && Number.isInteger(business.yearEstablished) && business.yearEstablished >= L.minFoundedYear && business.yearEstablished <= now.getFullYear() ? business.yearEstablished : undefined;
  const address = [str(business.address, L.address), str(business.city, 80), str(business.country, 80)].filter(Boolean).join(', ');
  const email = str(business.contactEmail, L.email);
  // The business's links first; the owner's typed ones fill the networks it has none for (YouTube, say).
  const socials = {
    ...((typed.socials as Record<string, unknown> | undefined) ?? {}),
    ...clean({
      facebook: httpUrl(business.socialMedia?.facebook, L.social),
      instagram: httpUrl(business.socialMedia?.instagram, L.social),
      linkedin: httpUrl(business.socialMedia?.linkedin, L.social),
    }),
  };
  const logo = httpUrl(business.logoUrl, 2000);
  const banner = httpUrl(business.bannerUrl, 2000);
  const slug = str(business.slug, 200) ?? (business._id ? encodeId(String(business._id)) : undefined);
  const fromBusiness = clean({
    name,
    about: str(business.description, L.about),
    foundedYear: year,
    licenseNumber: str(business.licenseNumber, L.licenseNumber),
    website: httpUrl(business.website, L.website),
    email: email && EMAIL.test(email) ? email : undefined,
    phone: str(business.contactPhone, L.phone),
    address: address && address.length <= L.address ? address : undefined,
    logo: logo ? { url: logo } : undefined,
    banner: banner ? { url: banner } : undefined,
  });
  const { source: _source, agencySlug: _agency, ...ownTyped } = typed;
  return {
    ...ownTyped,
    ...fromBusiness,
    ...(Object.keys(socials).length ? { socials } : {}),
    source: 'business',
    ...(slug ? { businessSlug: slug } : {}),
  };
}

/** The residence's linked business, while it is live in the directory (public fields only). */
export const loadLinkedBusiness = async (development: Pick<IDevelopment, 'builder'>): Promise<BusinessLike | null> => {
  const id = development.builder?.businessListingId;
  return id ? ((await BusinessListing.findOne({ _id: id, isActive: true }).select(PUBLIC_BUSINESS_FIELDS).lean()) as BusinessLike | null) : null;
};

/** A live business by its public page address (slug or encoded id). */
export const findLiveBusiness = async (slugOrId: unknown): Promise<{ _id: mongoose.Types.ObjectId; name: string } | null> => {
  const key = typeof slugOrId === 'string' ? slugOrId.trim() : '';
  if (!key || key.length > 200) return null;
  const id = resolveId(key);
  const byId = id && mongoose.isValidObjectId(id) ? await BusinessListing.findOne({ _id: id, isActive: true }).select('name').lean() : null;
  const found = byId ?? (await BusinessListing.findOne({ slug: key.toLowerCase(), isActive: true }).select('name').lean());
  return found as { _id: mongoose.Types.ObjectId; name: string } | null;
};

/**
 * Link (or, with null, unlink) the residence's builder to a business the
 * signed-in user owns. A business that is not theirs, or not live, is "not
 * found" either way, so its existence is not given away. A residence without a
 * builder name takes the business's.
 */
export async function linkBuilderBusiness(development: IDevelopment, userId: unknown, rawId: unknown): Promise<void> {
  if (rawId === null || rawId === undefined || rawId === '') {
    if (development.builder?.businessListingId) development.set('builder.businessListingId', undefined);
    await development.save();
    return;
  }
  const id = typeof rawId === 'string' && rawId.length <= 200 ? resolveId(rawId) : null;
  const listing = id && mongoose.isValidObjectId(id)
    ? await BusinessListing.findOne({ _id: id, owner: userId, isActive: true }).select('name').lean<{ _id: mongoose.Types.ObjectId; name: string }>()
    : null;
  if (!listing) throw new NotFoundError('Business not found', { code: 'BUSINESS_NOT_FOUND', field: 'businessId' });
  development.set('builder.businessListingId', listing._id);
  if (!development.builder?.name?.trim()) development.set('builder.name', String(listing.name).slice(0, L.name));
  await development.save();
}
