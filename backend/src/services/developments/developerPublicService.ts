/**
 * The company behind a residence, as buyers see it on its own page: its
 * profile (its Business Directory company, else the builder typed, else the
 * publishing agency: see resolveCompany) and its residences on the platform.
 *
 * Its residences are the ones linked to the same Business Directory company
 * (only that company's owner can link it), and the ones the SAME account (the
 * same agency, or the same owner) published naming the same builder. Builder
 * names are free text, so another account typing the name never appears; no
 * account id ever leaves.
 */
import mongoose from 'mongoose';
import Development, { IDevelopment } from '../../models/Development';
import { NotFoundError } from './developmentListingService';
import { listPreviewImages, loadPublishedDevelopment, toPublicDevelopment } from './developmentPublicService';
import { publicResidenceFilter } from './billing/publicResidenceFilter';
import { sameBuilderName } from './builderMatch';
import { loadOwnerAgency, resolveCompany } from './residenceCompany';
import { findLiveBusiness, loadLinkedBusiness } from './builderBusiness';

/** At most this many OTHER residences are listed on the company's page (this one comes first, on top). */
export const DEVELOPER_RESIDENCES_LIMIT = 12;
/** How many candidate residences are looked through. */
const SCAN_LIMIT = 60;
/** At most this many residences are listed on a business's directory page. */
export const BUSINESS_RESIDENCES_LIMIT = 24;

/** The account a residence belongs to, as a query. */
const sameAccount = (d: IDevelopment): Record<string, unknown> =>
  d.ownerType === 'agency' && d.agencyId ? { ownerType: 'agency', agencyId: d.agencyId } : { ownerType: 'user', ownerId: d.ownerId };
const isSameAccount = (a: IDevelopment, b: IDevelopment): boolean =>
  a.ownerType === b.ownerType && (a.ownerType === 'agency' ? String(a.agencyId) === String(b.agencyId) : String(a.ownerId) === String(b.ownerId));

/** Residences as list cards: the public projection with the picture lists use. */
const asCards = async (residences: IDevelopment[]) => {
  const previews = await listPreviewImages(residences);
  return residences.map((d) => {
    const preview = previews.get(String(d._id));
    return { ...toPublicDevelopment(d), ...(preview ? { previewImage: preview } : {}) };
  });
};

export const getPublicDeveloper = async (slug: unknown) => {
  const development = await loadPublishedDevelopment(slug);
  const [agency, business] = await Promise.all([loadOwnerAgency(development), loadLinkedBusiness(development)]);
  const builder = resolveCompany(toPublicDevelopment(development).builder as Record<string, unknown> | undefined, business, agency);
  const name = typeof builder?.name === 'string' ? builder.name : undefined;
  if (!builder || !name) throw new NotFoundError('This residence has no builder profile', { code: 'BUILDER_NOT_FOUND' });

  const agencyName = typeof agency?.name === 'string' ? agency.name : undefined;
  const linkedId = business ? (development.builder?.businessListingId as mongoose.Types.ObjectId | undefined) : undefined;
  const candidates = await Development.find({
    ...publicResidenceFilter(),
    _id: { $ne: development._id },
    ...(linkedId ? { $or: [{ 'builder.businessListingId': linkedId }, sameAccount(development)] } : sameAccount(development)),
  })
    .sort({ publishedAt: -1 })
    .limit(SCAN_LIMIT);
  const companyOf = (d: IDevelopment) => (d.builder?.name?.trim() ? d.builder.name : agencyName);
  const others = candidates
    .filter((d) => (linkedId && String(d.builder?.businessListingId) === String(linkedId)) || (isSameAccount(d, development) && sameBuilderName(companyOf(d), name)))
    .slice(0, DEVELOPER_RESIDENCES_LIMIT);

  // This residence first, so its card has a picture too (lists pick one for every residence).
  return { builder, residences: await asCards([development, ...others]) };
};

/** GET /by-business/:business — the published residences linked to a live Business Directory company. */
export const listBusinessResidences = async (businessSlugOrId: unknown) => {
  const business = await findLiveBusiness(businessSlugOrId);
  if (!business) return { residences: [] };
  const residences = await Development.find({ ...publicResidenceFilter(), 'builder.businessListingId': business._id })
    .sort({ publishedAt: -1 })
    .limit(BUSINESS_RESIDENCES_LIMIT);
  return { residences: await asCards(residences) };
};
