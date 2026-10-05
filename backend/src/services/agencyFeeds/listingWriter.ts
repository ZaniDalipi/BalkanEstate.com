import { Types } from 'mongoose';
import Property, { type IProperty } from '../../models/Property';
import type { IAgency } from '../../models/Agency';
import type { IAgencyFeed } from '../../models/AgencyFeed';
import type { StagedResult } from '../../models/AgencyFeedStagedRecord';
import { recordPriceChange, processInstantPriceDropForProperty } from '../../jobs/propertyAlertsJob';
import { emitPropertyCreated, emitPropertyUpdated } from '../../sockets/propertySocket';
import type { FeedIssue, NormalizedListing } from './feedTypes';
import { importImages, type ImageContext, type ImageImportOutcome, type ImageImporterDeps } from './imageImporter';
import {
  LOCK_FOLLOWERS,
  SOURCE_MANAGED_FIELDS,
  buildManagedValues,
  stableHash,
  type SourceManagedField,
} from './managedFields';
import { feedLogger } from './feedAudit';

/**
 * Writes one feed record to a listing. Every write goes through a Mongoose
 * document save, so the schema's own hooks (type attributes, total area,
 * construction status) normalize imported listings exactly like manual ones.
 */

export type Geocoder = (query: { address?: string; city: string; country: string }) => Promise<{ lat: number; lng: number } | null>;

export interface WriterContext {
  feed: IAgencyFeed;
  agency: IAgency;
  seller: { _id: Types.ObjectId; name?: string; email?: string; agencyName?: string; licenseNumber?: string };
  runId: Types.ObjectId;
  now: Date;
  geocode: Geocoder;
  images: ImageImporterDeps;
}

export interface WriteOutcome {
  propertyId?: Types.ObjectId;
  result: StagedResult;
  issues: FeedIssue[];
  /** Set when the record could not be written at all. */
  rejected?: boolean;
}

const issue = (listing: NormalizedListing, code: string, message: string, field?: string, severity: FeedIssue['severity'] = 'warning'): FeedIssue => ({
  severity, code, message, field, externalId: listing.externalId,
});

const roundPrivate = (value: number): number => Math.round(value * 100) / 100;

const resolveCoordinates = async (
  listing: NormalizedListing,
  ctx: WriterContext
): Promise<{ lat: number; lng: number } | null> => {
  if (listing.lat !== undefined && listing.lng !== undefined) return { lat: listing.lat, lng: listing.lng };
  try {
    const point = await ctx.geocode({
      address: listing.addressPrivate ? undefined : listing.address,
      city: listing.city,
      country: listing.country,
    });
    if (!point) return null;
    return listing.addressPrivate ? { lat: roundPrivate(point.lat), lng: roundPrivate(point.lng) } : point;
  } catch (err) {
    feedLogger.warn('geocoding failed', { externalId: listing.externalId, error: (err as Error).message });
    return null;
  }
};

const expandLocks = (locked: string[]): Set<string> => {
  const set = new Set(locked);
  for (const field of locked) for (const follower of LOCK_FOLLOWERS[field as SourceManagedField] ?? []) set.add(follower);
  return set;
};

const imageContext = (ctx: WriterContext, propertyId: Types.ObjectId, title: string): ImageContext => ({
  feedId: ctx.feed._id as Types.ObjectId,
  agencyId: ctx.agency._id as Types.ObjectId,
  sellerId: ctx.seller._id,
  sellerName: ctx.seller.name,
  propertyId,
  propertyTitle: title,
});

const tallyImages = (result: StagedResult, outcomes: ImageImportOutcome[]): void => {
  for (const o of outcomes) {
    if (!o.ok) result.imagesFailed = (result.imagesFailed ?? 0) + 1;
    else if (o.downloaded && !o.reused) result.imagesDownloaded = (result.imagesDownloaded ?? 0) + 1;
    else result.imagesReused = (result.imagesReused ?? 0) + 1;
  }
};

const imageFailureIssues = (listing: NormalizedListing, outcomes: ImageImportOutcome[]): FeedIssue[] =>
  outcomes
    .filter((o) => !o.ok)
    .slice(0, 5)
    .map((o) => issue(listing, 'image_failed', `Photo could not be imported (${o.reason ?? 'unknown error'}): ${o.sourceUrl.slice(0, 200)}`, 'images'));

const toPhotos = (outcomes: ImageImportOutcome[]) =>
  outcomes.filter((o) => o.ok && o.url).map((o) => ({ url: o.url as string, publicId: o.publicId, tag: 'other' as const }));

const toFloorplans = (outcomes: ImageImportOutcome[], listing: NormalizedListing) =>
  outcomes
    .map((o, i) => ({ o, label: listing.floorplans[i]?.label }))
    .filter(({ o }) => o.ok && o.url)
    .map(({ o, label }) => ({ url: o.url as string, publicId: o.publicId, ...(label ? { label } : {}) }));

/** Fingerprint every managed field as the document now stores it. */
const hashStored = (doc: IProperty, fields: readonly string[]): Record<string, string> => {
  const plain = doc.toObject({ depopulate: true }) as unknown as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const field of fields) {
    if (field === 'images') out.images = stableHash((plain.images as Array<{ url: string }> | undefined)?.map((i) => i.url) ?? []);
    else if (field === 'floorplans') out.floorplans = stableHash((plain.floorplans as Array<{ url: string }> | undefined)?.map((i) => i.url) ?? []);
    else out[field] = stableHash(plain[field]);
  }
  return out;
};

const compact = (values: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));

export const createListing = async (
  listing: NormalizedListing,
  hash: string,
  ctx: WriterContext
): Promise<WriteOutcome> => {
  const result: StagedResult = {};
  const coordinates = await resolveCoordinates(listing, ctx);
  if (!coordinates) {
    return {
      result,
      rejected: true,
      issues: [issue(listing, 'missing_coordinates', 'No coordinates in the feed and the address could not be located', 'latitude', 'error')],
    };
  }

  const propertyId = new Types.ObjectId();
  const imgCtx = imageContext(ctx, propertyId, listing.title);
  const photoOutcomes = await importImages(listing.imageUrls, 'photo', imgCtx, ctx.images);
  const planOutcomes = await importImages(listing.floorplans.map((f) => f.url), 'floorplan', imgCtx, ctx.images);
  tallyImages(result, photoOutcomes);
  tallyImages(result, planOutcomes);
  const issues = [...imageFailureIssues(listing, photoOutcomes), ...imageFailureIssues(listing, planOutcomes)];
  const photos = toPhotos(photoOutcomes);
  if (photos.length === 0) {
    return {
      result,
      rejected: true,
      issues: [...issues, issue(listing, 'no_usable_images', 'None of the listing photos could be imported; it will be retried on the next sync', 'images', 'error')],
    };
  }

  const { values, missingDetails } = buildManagedValues(listing, coordinates);
  const status = values.status as IProperty['status'];
  const doc = new Property({
    _id: propertyId,
    ...compact(values),
    images: photos,
    imageUrl: photos[0].url,
    imagePublicId: photos[0].publicId,
    floorplans: toFloorplans(planOutcomes, listing),
    sellerId: ctx.seller._id,
    createdByName: ctx.seller.name || ctx.agency.name,
    createdByEmail: ctx.seller.email || ctx.agency.email,
    createdAsRole: 'agent',
    createdByAgencyName: ctx.agency.name,
    createdByAgencyId: ctx.agency._id,
    createdByLicenseNumber: ctx.seller.licenseNumber,
    // Matches createProperty: villas publish immediately, admins may curate later.
    ...(listing.propertyType === 'luxury-villa' ? { villaApprovalStatus: 'approved' } : {}),
    ...(status === 'sold' ? { soldAt: ctx.now } : {}),
    ...(status === 'rented' ? { rentedAt: ctx.now } : {}),
    source: `agency-feed:${String(ctx.feed._id)}`,
    sourceListingId: listing.externalId,
    sourceFetchedAt: ctx.now,
    feedSync: {
      agencyId: ctx.agency._id,
      feedId: ctx.feed._id,
      externalId: listing.externalId,
      sourceHash: hash,
      managedHashes: {},
      lockedFields: [],
      missingDetails,
      addressPrivate: listing.addressPrivate,
      ...(listing.sourceUpdatedAt ? { sourceUpdatedAt: new Date(listing.sourceUpdatedAt) } : {}),
      firstImportedAt: ctx.now,
      lastSeenAt: ctx.now,
      lastSyncedAt: ctx.now,
      lastRunId: ctx.runId,
      failedImageUrls: photoOutcomes.concat(planOutcomes).filter((o) => !o.ok).map((o) => o.sourceUrl),
    },
  });
  await doc.save();

  const managedHashes: Record<string, string> = {
    ...hashStored(doc, SOURCE_MANAGED_FIELDS),
    imagesSource: stableHash(listing.imageUrls),
    floorplansSource: stableHash(listing.floorplans.map((f) => f.url)),
  };
  await Property.updateOne({ _id: doc._id }, { $set: { 'feedSync.managedHashes': managedHashes } });

  if (doc.price > 0) await recordPriceChange(String(doc._id), doc.price);
  emitPropertyCreated(doc.toObject());
  return { propertyId: doc._id as Types.ObjectId, result, issues };
};

export const updateListing = async (
  doc: IProperty,
  listing: NormalizedListing,
  hash: string,
  ctx: WriterContext
): Promise<WriteOutcome> => {
  const result: StagedResult = {};
  const issues: FeedIssue[] = [];
  const sync = doc.feedSync as NonNullable<IProperty['feedSync']>;
  const recorded: Record<string, string> = { ...(sync.managedHashes ?? {}) };
  const locked = expandLocks(sync.lockedFields ?? []);
  const keptLocal: string[] = [];
  const written: string[] = [];

  const locationChanged =
    listing.address !== doc.address || listing.city !== doc.city || listing.country !== doc.country;
  let coordinates: { lat: number; lng: number } | null;
  if (listing.lat !== undefined && listing.lng !== undefined) coordinates = { lat: listing.lat, lng: listing.lng };
  else if (!locationChanged) coordinates = { lat: doc.lat, lng: doc.lng };
  else {
    coordinates = await resolveCoordinates(listing, ctx);
    if (!coordinates) {
      coordinates = { lat: doc.lat, lng: doc.lng };
      issues.push(issue(listing, 'geocode_failed', 'The new address could not be located; the map position was not changed', 'address'));
    }
  }

  const { values, missingDetails } = buildManagedValues(listing, coordinates);
  const plain = doc.toObject({ depopulate: true }) as unknown as Record<string, unknown>;
  const previousPrice = doc.price;
  const wasDeactivated = Boolean(sync.deactivatedAt);

  /** True when the stored value differs from what the last sync wrote: a local edit. */
  const editedLocally = (field: string, current: unknown): boolean =>
    recorded[field] !== undefined && recorded[field] !== stableHash(current);

  for (const field of SOURCE_MANAGED_FIELDS) {
    if (field === 'images' || field === 'floorplans') continue;
    const incoming = values[field];
    const current = plain[field];

    if (field === 'status' && wasDeactivated) {
      if (locked.has('status')) {
        keptLocal.push('status');
        continue;
      }
      doc.set('status', incoming);
      written.push('status');
      result.reactivated = true;
      continue;
    }
    if (stableHash(incoming) === stableHash(current)) {
      written.push(field);
      continue;
    }
    if (locked.has(field) || editedLocally(field, current)) {
      keptLocal.push(field);
      continue;
    }
    doc.set(field, incoming);
    written.push(field);
    if (field === 'status' && incoming === 'sold') doc.soldAt = ctx.now;
    if (field === 'status' && incoming === 'rented') doc.rentedAt = ctx.now;
  }

  // Photos and floor plans: compared by the source URLs the feed lists.
  const imgCtx = imageContext(ctx, doc._id as Types.ObjectId, listing.title);
  const failedUrls = new Set(sync.failedImageUrls ?? []);
  const media = [
    { field: 'images' as const, sourceKey: 'imagesSource' as const, urls: listing.imageUrls, kind: 'photo' as const },
    { field: 'floorplans' as const, sourceKey: 'floorplansSource' as const, urls: listing.floorplans.map((f) => f.url), kind: 'floorplan' as const },
  ];
  const stillFailed: string[] = [];
  for (const m of media) {
    const currentUrls = ((plain[m.field] as Array<{ url: string }> | undefined) ?? []).map((i) => i.url);
    const sourceChanged = recorded[m.sourceKey] !== stableHash(m.urls);
    const retryFailures = m.urls.some((u) => failedUrls.has(u));
    if (!sourceChanged && !retryFailures) {
      written.push(m.field);
      continue;
    }
    if (locked.has(m.field) || editedLocally(m.field, currentUrls)) {
      keptLocal.push(m.field);
      continue;
    }
    const outcomes = await importImages(m.urls, m.kind, imgCtx, ctx.images);
    tallyImages(result, outcomes);
    issues.push(...imageFailureIssues(listing, outcomes));
    stillFailed.push(...outcomes.filter((o) => !o.ok).map((o) => o.sourceUrl));
    if (m.field === 'images') {
      const photos = toPhotos(outcomes);
      if (photos.length === 0) {
        // Never strip a listing of its photos because downloads failed.
        issues.push(issue(listing, 'images_kept', 'New photos could not be imported; the current photos were kept', 'images'));
        continue;
      }
      doc.set('images', photos);
      doc.imageUrl = photos[0].url;
      doc.imagePublicId = photos[0].publicId;
    } else {
      doc.set('floorplans', toFloorplans(outcomes, listing));
    }
    written.push(m.field);
    recorded[m.sourceKey] = stableHash(m.urls);
  }

  // Price-reduction display fields, exactly as updateProperty maintains them.
  if (doc.price < previousPrice) {
    if (!doc.originalPrice || doc.originalPrice < previousPrice) doc.originalPrice = previousPrice;
    doc.priceReducedAt = ctx.now;
  } else if (doc.price > previousPrice) {
    doc.originalPrice = undefined;
    doc.priceReducedAt = undefined;
  }

  sync.sourceHash = hash;
  sync.missingDetails = missingDetails;
  sync.addressPrivate = listing.addressPrivate;
  sync.sourceUpdatedAt = listing.sourceUpdatedAt ? new Date(listing.sourceUpdatedAt) : undefined;
  sync.lastSeenAt = ctx.now;
  sync.lastSyncedAt = ctx.now;
  sync.lastRunId = ctx.runId;
  sync.failedImageUrls = stillFailed;
  if (result.reactivated) {
    sync.deactivatedAt = undefined;
    sync.deactivationReason = undefined;
    sync.statusBeforeDeactivation = undefined;
  }
  doc.sourceFetchedAt = ctx.now;
  doc.markModified('feedSync');
  await doc.save();

  // Re-fingerprint what was written; fields kept local keep their old
  // fingerprint so they continue to be recognised as local edits.
  Object.assign(recorded, hashStored(doc, written));
  await Property.updateOne({ _id: doc._id }, { $set: { 'feedSync.managedHashes': recorded } });

  if (keptLocal.length) {
    result.localEditsKept = keptLocal;
    issues.push(issue(listing, 'local_edit_kept', `Kept the value edited on BalkanEstateAI for: ${keptLocal.join(', ')}`));
  }

  if (doc.price !== previousPrice) {
    await recordPriceChange(String(doc._id), doc.price, previousPrice);
    processInstantPriceDropForProperty(String(doc._id), doc.price, previousPrice).catch((err) =>
      feedLogger.warn('price alert failed', { error: (err as Error).message })
    );
  }
  emitPropertyUpdated(String(doc._id), doc.toObject());
  return { propertyId: doc._id as Types.ObjectId, result, issues };
};

/** Soft-deactivate one listing the feed explicitly marked as removed. */
export const deactivateListing = async (doc: IProperty, ctx: WriterContext): Promise<boolean> => {
  const sync = doc.feedSync as NonNullable<IProperty['feedSync']>;
  if (sync.deactivatedAt || (sync.lockedFields ?? []).includes('status')) return false;
  sync.statusBeforeDeactivation = doc.status;
  sync.deactivatedAt = ctx.now;
  sync.deactivationReason = 'marked_removed';
  sync.lastSeenAt = ctx.now;
  sync.lastRunId = ctx.runId;
  doc.status = 'draft';
  doc.markModified('feedSync');
  await doc.save();
  return true;
};

/**
 * Soft-deactivate listings missing from a complete snapshot. Idempotent: only
 * listings not already deactivated, not status-locked, and not seen since
 * `notSeenSince` are touched. Returns how many were deactivated.
 */
export const deactivateMissing = async (
  feedId: Types.ObjectId,
  externalIds: string[],
  runId: Types.ObjectId,
  now: Date,
  notSeenSince: Date
): Promise<number> => {
  if (externalIds.length === 0) return 0;
  const result = await Property.updateMany(
    {
      'feedSync.feedId': feedId,
      'feedSync.externalId': { $in: externalIds },
      'feedSync.deactivatedAt': { $exists: false },
      'feedSync.lockedFields': { $ne: 'status' },
      'feedSync.lastSeenAt': { $lt: notSeenSince },
    },
    [
      {
        $set: {
          'feedSync.statusBeforeDeactivation': '$status',
          status: 'draft',
          'feedSync.deactivatedAt': now,
          'feedSync.deactivationReason': 'removed_from_feed',
          'feedSync.lastRunId': runId,
        },
      },
    ]
  );
  return result.modifiedCount;
};
