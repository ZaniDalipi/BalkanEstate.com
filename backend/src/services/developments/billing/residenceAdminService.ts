/**
 * Admin view and controls for residences while there is no payment provider:
 * list residences with their plan, set a residence's building limit, and (via
 * grant / agencyResidences) give passes and agency extras.
 */
import mongoose from 'mongoose';
import Development from '../../../models/Development';
import DevelopmentBuilding from '../../../models/DevelopmentBuilding';
import { MAX_BUILDING_LIMIT } from '../../../config/residenceBilling';
import { escapeRegex } from '../../../utils/escapeRegex';
import { ValidationError } from '../developmentService';
import { billingFacts } from './residenceBillingService';
import { residenceAccess } from './residencePlan';
import { residenceTerms } from './residenceTerms';

export const ADMIN_RESIDENCE_FILTERS = ['all', 'public', 'offline', 'draft', 'trial', 'pass', 'agency'] as const;
export type AdminResidenceFilter = (typeof ADMIN_RESIDENCE_FILTERS)[number];
const PAGE_SIZE = 20;

const filterQuery = (filter: AdminResidenceFilter, now: Date): Record<string, unknown> => {
  switch (filter) {
    case 'public':
      return { status: 'published', visibleUntil: { $gt: now } };
    case 'offline':
      return { status: 'published', $or: [{ visibleUntil: { $exists: false } }, { visibleUntil: null }, { visibleUntil: { $lte: now } }] };
    case 'draft':
      return { status: 'draft' };
    case 'trial':
      return { 'billing.trialEndsAt': { $gt: now } };
    case 'pass':
      return { 'billing.paidUntil': { $gt: now } };
    case 'agency':
      return { 'billing.agencyUntil': { $gt: now } };
    default:
      return {};
  }
};

export async function listResidences(params: { search?: unknown; filter?: unknown; page?: unknown }, now = new Date()) {
  const filter = ADMIN_RESIDENCE_FILTERS.includes(params.filter as AdminResidenceFilter) ? (params.filter as AdminResidenceFilter) : 'all';
  const page = Math.max(1, Math.min(1000, Math.floor(Number(params.page)) || 1));
  const search = typeof params.search === 'string' ? params.search.trim().slice(0, 100) : '';
  const query: Record<string, unknown> = { deletedAt: { $exists: false }, ...filterQuery(filter, now) };
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    query.$and = [{ $or: [{ name: rx }, { slug: rx }, { city: rx }] }];
  }
  const [rows, total, terms] = await Promise.all([
    Development.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate('ownerId', 'name email')
      .populate('agencyId', 'name'),
    Development.countDocuments(query),
    residenceTerms(),
  ]);
  const counts = await DevelopmentBuilding.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
    { $match: { developmentId: { $in: rows.map((r) => r._id) }, deletedAt: { $exists: false } } },
    { $group: { _id: '$developmentId', n: { $sum: 1 } } },
  ]);
  const used = new Map(counts.map((c) => [String(c._id), c.n]));
  const items = rows.map((dev) => {
    const access = residenceAccess(billingFacts(dev, { includedBuildings: terms.includedBuildings }), now);
    const owner = dev.ownerId as unknown as { _id: unknown; name?: string; email?: string } | null;
    const agency = dev.agencyId as unknown as { _id: unknown; name?: string } | null;
    return {
      id: dev.id as string,
      name: dev.name,
      slug: dev.slug,
      city: dev.city,
      status: dev.status,
      state: access.state,
      publicNow: access.publicNow,
      visibleUntil: access.visibleUntil,
      owner: owner ? { name: owner.name ?? '', email: owner.email ?? '' } : null,
      agency: agency ? { id: String(agency._id), name: agency.name ?? '' } : null,
      buildings: { used: used.get(String(dev._id)) ?? 0, limit: access.buildingLimit, adminLimit: dev.billing?.buildingLimit ?? null },
    };
  });
  return { items, total, page, pageSize: PAGE_SIZE, includedBuildings: terms.includedBuildings };
}

/** Set (or clear, with null) a residence's building limit; never below the buildings it has. */
export async function setBuildingLimit(developmentId: string, raw: unknown): Promise<{ limit: number | null; used: number }> {
  const dev = await Development.findOne({ _id: developmentId, deletedAt: { $exists: false } });
  if (!dev) throw Object.assign(new Error('Residence not found'), { statusCode: 404, code: 'RESIDENCE_NOT_FOUND' });
  const used = await DevelopmentBuilding.countDocuments({ developmentId: dev._id, deletedAt: { $exists: false } });
  if (raw === null) {
    dev.set('billing.buildingLimit', undefined);
    await dev.save();
    return { limit: null, used };
  }
  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_BUILDING_LIMIT) {
    throw new ValidationError(`limit must be a whole number from 1 to ${MAX_BUILDING_LIMIT}`, {
      code: 'FIELD_RANGE',
      field: 'limit',
      params: { min: 1, max: MAX_BUILDING_LIMIT },
    });
  }
  if (limit < used) {
    throw new ValidationError(`This residence already has ${used} buildings; the limit can't be lower`, {
      code: 'LIMIT_BELOW_USED',
      field: 'limit',
      params: { used },
    });
  }
  dev.set('billing.buildingLimit', limit);
  await dev.save();
  return { limit, used };
}
