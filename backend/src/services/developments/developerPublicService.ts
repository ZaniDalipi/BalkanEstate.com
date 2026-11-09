/**
 * The company behind a residence, as buyers see it on its own page: the
 * builder's public profile (or, with no builder named, the publishing
 * agency's: see residenceCompany) and the other residences on the platform.
 *
 * "Other residences" are only those published by the SAME account (the same
 * agency, or the same owner) that name the same builder. Builder names are
 * free text, so matching across accounts would let anyone attach their
 * residence to a well-known company's page; and no account id ever leaves.
 */
import Development, { IDevelopment } from '../../models/Development';
import { NotFoundError } from './developmentListingService';
import { listPreviewImages, loadPublishedDevelopment, toPublicDevelopment } from './developmentPublicService';
import { publicResidenceFilter } from './billing/publicResidenceFilter';
import { sameBuilderName } from './builderMatch';
import { agencyAsBuilder, loadOwnerAgency } from './residenceCompany';

/** At most this many OTHER residences are listed on the company's page (this one comes first, on top). */
export const DEVELOPER_RESIDENCES_LIMIT = 12;
/** How many of the account's residences are looked through for the same builder. */
const SCAN_LIMIT = 60;

/** The account a residence belongs to, as a query. */
const sameAccount = (d: IDevelopment): Record<string, unknown> =>
  d.ownerType === 'agency' && d.agencyId ? { ownerType: 'agency', agencyId: d.agencyId } : { ownerType: 'user', ownerId: d.ownerId };

export const getPublicDeveloper = async (slug: unknown) => {
  const development = await loadPublishedDevelopment(slug);
  // An agency-owned residence's other residences without a builder named have the same agency behind them.
  const agency = await loadOwnerAgency(development);
  const agencyName = typeof agency?.name === 'string' ? agency.name : undefined;
  const builder = development.builder?.name?.trim() ? toPublicDevelopment(development).builder : agencyAsBuilder(agency);
  const name = (builder as { name?: string } | undefined)?.name;
  if (!builder || !name) throw new NotFoundError('This residence has no builder profile', { code: 'BUILDER_NOT_FOUND' });

  const candidates = await Development.find({
    ...publicResidenceFilter(),
    ...sameAccount(development),
    _id: { $ne: development._id },
  })
    .sort({ publishedAt: -1 })
    .limit(SCAN_LIMIT);
  const companyOf = (d: IDevelopment) => (d.builder?.name?.trim() ? d.builder.name : agencyName);
  const others = candidates.filter((d) => sameBuilderName(companyOf(d), name)).slice(0, DEVELOPER_RESIDENCES_LIMIT);
  // This residence first, so its card has a picture too (lists pick one for every residence).
  const residences = [development, ...others];
  const previews = await listPreviewImages(residences);

  return {
    builder,
    residences: residences.map((d) => {
      const preview = previews.get(String(d._id));
      return { ...toPublicDevelopment(d), ...(preview ? { previewImage: preview } : {}) };
    }),
  };
};
