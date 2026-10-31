/**
 * Public (buyer-facing) projections of a published development.
 *
 * Everything that leaves through /api/developments/:slug… is built here so the
 * rules live in one place:
 *  - only published, live developments; hidden units do not exist;
 *  - availability is EFFECTIVE (unit ∧ attached listings), resolved with ONE
 *    batched Property status lookup;
 *  - `on_request` prices are stripped, internal fields and storage keys are
 *    never sent, and only non-draft listing ids are exposed (encoded).
 */
import mongoose from 'mongoose';
import Development, { IDevelopment } from '../../models/Development';
import DevelopmentBuilding from '../../models/DevelopmentBuilding';
import DevelopmentFloor from '../../models/DevelopmentFloor';
import DevelopmentUnit, { IDevelopmentUnit } from '../../models/DevelopmentUnit';
import Property from '../../models/Property';
import { encodeId } from '../../utils/idObfuscation';
import { NotFoundError } from './developmentListingService';
import { linkMaps } from './unitLinks';
import { toObjectId } from './developmentRefs';
import { resolveEffectiveAvailability } from './unitAvailability';
import { publicResidenceFilter } from './billing/publicResidenceFilter';
import { effectiveTour } from './unitTour';

const LIVE = { $exists: false } as const;

/** A unit buyers may see: not deleted and not hidden (legacy units are public). */
export const visibleUnitFilter = (developmentId: mongoose.Types.ObjectId) => ({
  developmentId,
  deletedAt: LIVE,
  visibility: { $ne: 'hidden' },
});

/** The published, live development for a slug, or a 404. */
export const loadPublishedDevelopment = async (rawSlug: unknown): Promise<IDevelopment> => {
  const slug = String(rawSlug ?? '').toLowerCase().trim();
  const development = slug
    ? await Development.findOne({ slug, ...publicResidenceFilter() })
    : null;
  if (!development) throw new NotFoundError('Development not found', { code: 'RESIDENCE_NOT_FOUND' });
  return development;
};

const DEVELOPMENT_PRIVATE_FIELDS = [
  'ownerId',
  'agencyId',
  'coverImagePublicId',
  'coverMediaId',
  'deletedAt',
  // Residence Pass state is the owner's business, not the buyer's.
  'billing',
  'visibleUntil',
] as const;

/** The development as buyers see it — no ownership, storage keys or media ids. */
export const toPublicDevelopment = (development: IDevelopment): Record<string, unknown> => {
  const json = development.toJSON() as Record<string, unknown>;
  for (const f of DEVELOPMENT_PRIVATE_FIELDS) delete json[f];
  json.allowUnitInquiries = development.allowUnitInquiries !== false;
  json.builder = publicBuilder(development.builder);
  if (!json.builder) delete json.builder;
  return json;
};

/** The builder as buyers see it: only once it has a name, and without storage keys. */
const publicBuilder = (b: IDevelopment['builder']): Record<string, unknown> | undefined => {
  if (!b?.name) return undefined;
  const plain = JSON.parse(JSON.stringify(b)) as Record<string, unknown>;
  for (const kind of ['logo', 'banner'] as const) {
    const img = b[kind];
    if (img?.url) plain[kind] = { url: img.url };
    else delete plain[kind];
  }
  delete plain._id;
  const socials = plain.socials as Record<string, unknown> | undefined;
  if (!socials || Object.values(socials).every((v) => !v)) delete plain.socials;
  return plain;
};

type ListingLite = { _id: mongoose.Types.ObjectId; status?: string; virtualTour360Url?: string };

/** One batched status lookup for every listing attached to the given units. */
const loadListingStatuses = async (units: IDevelopmentUnit[]): Promise<Map<string, ListingLite>> => {
  const ids = Array.from(new Set(units.flatMap((u) => (u.listingIds ?? []).map(String)))).map(
    (id) => new mongoose.Types.ObjectId(id)
  );
  if (ids.length === 0) return new Map();
  const rows = (await Property.find({ _id: { $in: ids } }).select('status virtualTour360Url').lean()) as ListingLite[];
  return new Map(rows.map((r) => [String(r._id), r]));
};

/** Unit fields that never leave the dashboard. */
const UNIT_PRIVATE_FIELDS = [
  'visibility',
  'priceVisibility',
  'mediaIds',
  'floorplanMediaId',
  'parkingRefs',
  'storageRefs',
  'deletedAt',
] as const;
/** Heavier fields only the unit detail endpoint returns. */
const UNIT_DETAIL_FIELDS = ['description', 'gallery', 'floorplan'] as const;

const stripImage = (img: unknown): Record<string, unknown> | undefined => {
  if (!img || typeof img !== 'object') return undefined;
  const { url, width, height } = img as Record<string, unknown>;
  if (typeof url !== 'string' || !url) return undefined;
  return { url, ...(width ? { width } : {}), ...(height ? { height } : {}) };
};

interface UnitContext {
  listings: Map<string, ListingLite>;
  buildingName: Map<string, string>;
  floorById: Map<string, { label: string; level: number }>;
  /** Units sold together, among the units being shown (see unitLinks). */
  links?: ReturnType<typeof linkMaps>;
}

/** Project one visible unit for the public. */
export const toPublicUnit = (
  unit: IDevelopmentUnit,
  ctx: UnitContext,
  opts: { detail?: boolean } = {}
): Record<string, unknown> => {
  const json = unit.toJSON() as Record<string, unknown>;
  for (const f of UNIT_PRIVATE_FIELDS) delete json[f];

  // Only listings that exist and are not drafts are public.
  const attached = (unit.listingIds ?? [])
    .map((id) => ctx.listings.get(String(id)))
    .filter((l): l is ListingLite => !!l && l.status !== 'draft');
  const effective = resolveEffectiveAvailability(
    unit.availability,
    attached.map((l) => l.status)
  );
  const publicIds = attached.map((l) => String(l._id));
  const primary =
    unit.primaryListingId && publicIds.includes(String(unit.primaryListingId))
      ? String(unit.primaryListingId)
      : publicIds[0];

  json.listingIds = publicIds.map(encodeId);
  if (primary) json.primaryListingId = encodeId(primary);
  else delete json.primaryListingId;
  json.hasListing = publicIds.length > 0;
  // Its own 360° tour, else the tour of its public listing (the primary one first).
  const tour = effectiveTour(
    unit.virtualTourUrl,
    attached.map((l) => ({ id: String(l._id), virtualTour360Url: l.virtualTour360Url })),
    primary
  );
  if (tour) {
    json.virtualTourUrl = tour.url;
    json.tourSource = tour.source;
  } else delete json.virtualTourUrl;
  json.availability = effective.availability;
  json.availabilitySource = effective.source;
  // Only links between visible units: a hidden spot's id never leaves the server.
  const id = String(unit._id);
  json.linkedUnitIds = (ctx.links?.comesWith.get(id) ?? []).map(encodeId);
  json.soldWithUnitIds = (ctx.links?.soldWith.get(id) ?? []).map(encodeId);

  const onRequest = unit.priceVisibility === 'on_request';
  json.priceOnRequest = onRequest;
  if (onRequest) {
    delete json.price;
    delete json.pricePerSqm;
  }

  const floor = ctx.floorById.get(String(unit.floorId));
  json.buildingName = ctx.buildingName.get(String(unit.buildingId)) ?? null;
  json.floorLabel = floor?.label ?? null;
  json.floorLevel = floor?.level ?? null;

  for (const f of UNIT_DETAIL_FIELDS) delete json[f];
  // The floor plan is small (one URL) and the explorer's hover card previews it,
  // so the list carries it too; description and gallery stay detail-only.
  const floorplan = stripImage(unit.floorplan);
  if (floorplan) json.floorplan = floorplan;
  if (opts.detail) {
    if (typeof unit.description === 'string' && unit.description) json.description = unit.description;
    json.gallery = (unit.gallery ?? []).map(stripImage).filter(Boolean);
  }
  return json;
};

const loadStructureMaps = async (developmentId: mongoose.Types.ObjectId) => {
  const [buildings, floors] = await Promise.all([
    DevelopmentBuilding.find({ developmentId, deletedAt: LIVE }).sort({ order: 1 }),
    DevelopmentFloor.find({ developmentId, deletedAt: LIVE }).sort({ order: 1 }),
  ]);
  return {
    buildings,
    floors,
    buildingName: new Map(buildings.map((b) => [String(b._id), b.name])),
    floorById: new Map(floors.map((f) => [String(f._id), { label: f.label, level: f.level }])),
  };
};

/** GET /:slug → { development, buildings (with stats), floors } */
export const getPublicDevelopmentDetail = async (slug: unknown) => {
  const development = await loadPublishedDevelopment(slug);
  const developmentId = development._id as mongoose.Types.ObjectId;
  const [{ buildings, floors }, units] = await Promise.all([
    loadStructureMaps(developmentId),
    DevelopmentUnit.find(visibleUnitFilter(developmentId)).select(
      'buildingId availability listingIds primaryListingId virtualTourUrl'
    ),
  ]);
  const listings = await loadListingStatuses(units);

  const stats = new Map<string, { units: number; available: number; withTour: number }>();
  for (const u of units) {
    const key = String(u.buildingId);
    const s = stats.get(key) ?? { units: 0, available: 0, withTour: 0 };
    s.units += 1;
    const statuses = (u.listingIds ?? []).map((id) => listings.get(String(id))?.status);
    if (resolveEffectiveAvailability(u.availability, statuses).availability === 'available') s.available += 1;
    const publicListings = (u.listingIds ?? [])
      .map((id) => listings.get(String(id)))
      .filter((l): l is ListingLite => !!l && l.status !== 'draft')
      .map((l) => ({ id: String(l._id), virtualTour360Url: l.virtualTour360Url }));
    if (effectiveTour(u.virtualTourUrl, publicListings, u.primaryListingId ? String(u.primaryListingId) : undefined)) s.withTour += 1;
    stats.set(key, s);
  }

  return {
    development: toPublicDevelopment(development),
    buildings: buildings.map((b) => {
      const json = b.toJSON() as Record<string, unknown>;
      delete json.coverMediaId;
      delete json.facadeMediaId;
      delete json.deletedAt;
      json.stats = stats.get(String(b._id)) ?? { units: 0, available: 0, withTour: 0 };
      return json;
    }),
    floors: floors.map((f) => {
      const json = f.toJSON() as Record<string, unknown>;
      delete json.floorplanMediaId;
      delete json.deletedAt;
      return json;
    }),
  };
};

/** GET /:slug/units → { units, summary } */
export const listPublicUnits = async (slug: unknown) => {
  const development = await loadPublishedDevelopment(slug);
  const developmentId = development._id as mongoose.Types.ObjectId;
  const [maps, units] = await Promise.all([
    loadStructureMaps(developmentId),
    DevelopmentUnit.find(visibleUnitFilter(developmentId))
      .collation({ locale: 'en', numericOrdering: true })
      .sort({ buildingId: 1, unitNumber: 1 }),
  ]);
  const listings = await loadListingStatuses(units);
  const ctx: UnitContext = { listings, buildingName: maps.buildingName, floorById: maps.floorById, links: linkMaps(units) };
  const projected = units.map((u) => toPublicUnit(u, ctx));

  // Price range over publicly priced units only.
  const priced = units.filter(
    (u) => u.priceVisibility !== 'on_request' && typeof u.price === 'number' && u.price > 0
  );
  const prices = priced.map((u) => u.price as number);
  const summary = {
    total: projected.length,
    available: projected.filter((u) => u.availability === 'available').length,
    priceMin: prices.length ? Math.min(...prices) : null,
    priceMax: prices.length ? Math.max(...prices) : null,
    currency: priced[0]?.currency ?? 'EUR',
  };
  return { units: projected, summary };
};

const LISTING_PUBLIC_SELECT =
  'title imageUrl images price listingType beds baths sqft createdByName createdByAgencyName status isNegotiable virtualTour360Url';

/** GET /:slug/units/:unitId → { unit, development, listings } */
export const getPublicUnitDetail = async (slug: unknown, rawUnitId: unknown) => {
  const development = await loadPublishedDevelopment(slug);
  const developmentId = development._id as mongoose.Types.ObjectId;
  const unitId = toObjectId(rawUnitId);
  if (!unitId) throw new NotFoundError('Unit not found', { code: 'UNIT_NOT_FOUND' });
  const unit = await DevelopmentUnit.findOne({ _id: unitId, ...visibleUnitFilter(developmentId) });
  if (!unit) throw new NotFoundError('Unit not found', { code: 'UNIT_NOT_FOUND' });

  // Visible units sold together with this one, either way round.
  const related = await DevelopmentUnit.find({
    ...visibleUnitFilter(developmentId),
    $or: [{ _id: { $in: unit.linkedUnitIds ?? [] } }, { linkedUnitIds: unit._id }],
  });
  const [maps, listingDocs, relatedListings] = await Promise.all([
    loadStructureMaps(developmentId),
    (unit.listingIds ?? []).length
      ? Property.find({ _id: { $in: unit.listingIds }, status: { $ne: 'draft' } })
          .select(LISTING_PUBLIC_SELECT)
          .limit(20)
          .lean()
      : Promise.resolve([]),
    loadListingStatuses(related),
  ]);
  const listings = new Map(
    listingDocs.map((l) => [String(l._id), { _id: l._id as mongoose.Types.ObjectId, status: l.status, virtualTour360Url: l.virtualTour360Url }])
  );
  const links = linkMaps([unit, ...related]);
  const ctx: UnitContext = { listings, buildingName: maps.buildingName, floorById: maps.floorById, links };
  const relatedCtx: UnitContext = { ...ctx, listings: relatedListings };
  const comesWith = new Set(links.comesWith.get(String(unit._id)) ?? []);

  // Primary first, then the order they were attached.
  const order = (unit.listingIds ?? []).map(String);
  const primary = String(unit.primaryListingId ?? '');
  const sorted = [...listingDocs].sort((a, b) => {
    const ka = String(a._id) === primary ? -1 : order.indexOf(String(a._id));
    const kb = String(b._id) === primary ? -1 : order.indexOf(String(b._id));
    return ka - kb;
  });

  return {
    unit: toPublicUnit(unit, ctx, { detail: true }),
    /** Parking spots / storage rooms it comes with, and the units it is sold with. */
    companions: related.map((u) => ({
      relation: comesWith.has(String(u._id)) ? 'comes_with' : 'sold_with',
      unit: toPublicUnit(u, relatedCtx),
    })),
    development: {
      name: development.name,
      slug: development.slug,
      city: development.city,
      country: development.country,
      allowUnitInquiries: development.allowUnitInquiries !== false,
    },
    listings: sorted.slice(0, 10).map((l) => ({
      id: encodeId(String(l._id)),
      title: l.title,
      imageUrl: l.imageUrl,
      images: (Array.isArray(l.images) ? l.images : [])
        .filter((img) => img && typeof img.url === 'string')
        .slice(0, 6)
        .map((img) => ({ url: img.url })),
      price: l.price,
      listingType: l.listingType,
      beds: l.beds,
      baths: l.baths,
      sqft: l.sqft,
      createdByName: l.createdByName,
      createdByAgencyName: l.createdByAgencyName,
      status: l.status,
      isNegotiable: l.isNegotiable ?? false,
    })),
  };
};

export interface ListingResidence {
  name: string;
  slug: string;
  city: string;
  /** Present when the listing sits on a visible apartment. */
  unit?: { id: string; unitNumber: string; buildingName?: string; floorLabel?: string };
}

/**
 * "Part of <residence>" for a listing's detail page: the published residence
 * the listing is attached to and, when visible, its apartment. Null for a
 * draft listing, an unpublished or deleted residence, or no attachment.
 */
export const getListingResidence = async (rawListingId: unknown): Promise<ListingResidence | null> => {
  const listingId = toObjectId(rawListingId);
  if (!listingId) return null;
  const listing = await Property.findById(listingId).select('status developmentId unitId').lean();
  if (!listing?.developmentId || listing.status === 'draft') return null;
  const development = await Development.findOne({ _id: listing.developmentId, ...publicResidenceFilter() })
    .select('name slug city')
    .lean();
  if (!development) return null;
  const residence: ListingResidence = { name: development.name, slug: development.slug, city: development.city };
  if (listing.unitId) {
    const unit = await DevelopmentUnit.findOne({ _id: listing.unitId, ...visibleUnitFilter(development._id as mongoose.Types.ObjectId) })
      .select('unitNumber buildingId floorId')
      .lean();
    if (unit) {
      const [building, floor] = await Promise.all([
        DevelopmentBuilding.findById(unit.buildingId).select('name').lean(),
        unit.floorId ? DevelopmentFloor.findById(unit.floorId).select('label').lean() : null,
      ]);
      residence.unit = { id: encodeId(String(unit._id)), unitNumber: unit.unitNumber, buildingName: building?.name, floorLabel: floor?.label };
    }
  }
  return residence;
};
