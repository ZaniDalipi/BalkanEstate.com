/**
 * Move every Cloudinary image the site uses into R2, and point the database at it.
 *
 * What it does, per image:
 *   1. Finds the document that references it (any collection, any field —
 *      also URLs inside HTML/text) and works out whose it is:
 *        Property photo  → users/{sellerId}/listings/{propertyId}/photos/{id}
 *        floor plan      → users/{sellerId}/listings/{propertyId}/floorplans/{id}
 *        avatar          → users/{userId}/avatar/{id}
 *        licence         → users/{userId}/documents/license/{id}        (private)
 *        agency logo     → agencies/{agencyId}/logo/{id}
 *        chat image      → messages/{conversationId}/{id}
 *        …see services/media/cloudinaryMigration.ts → classifyReference
 *      Anything it can't place goes to legacy/{cloudinary public id}.
 *   2. Downloads the original from Cloudinary, generates every display size
 *      with sharp, uploads them to R2 and records a MediaAsset in MongoDB
 *      (with source.cloudinaryPublicId, so the run can resume).
 *   3. Rewrites the URL to the R2 master and every `*publicId` field holding
 *      the Cloudinary id to the new R2 key — FileRecord included, so access
 *      control keeps working.
 * Plus the convention city photos (`city-{country}-{city}`), which nothing
 * references by URL: they go to cities/convention/{public id}.
 *
 * Images nobody references are not migrated — no point paying to store them.
 * Re-running is safe: migrated images are skipped, keys are deterministic.
 *
 * Dry run by default — prints what it would do. Pass --apply to migrate.
 *   npm run media:migrate                          (dry run)
 *   npm run media:migrate:apply
 *   … --collections=properties,users              only these collections
 *   … --purge-cloudinary                          with --apply: afterwards delete
 *                                                  migrated originals from Cloudinary
 *
 * Needs R2_* and CLOUDINARY_* set at the same time.
 */
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary';
import { isR2Enabled, isCloudinaryConfigured } from '../config/r2';
import MediaAsset from '../models/MediaAsset';
// Imported for their collection names (classifyReference keys on model names).
import '../models/Property';
import '../models/ArchivedListing';
import '../models/User';
import '../models/Agent';
import '../models/Agency';
import '../models/BusinessListing';
import '../models/Message';
import '../models/CityMarketData';
import '../models/CityMarketSnapshot';
import '../models/CityShowcase';
import '../models/VillaDestination';
import '../models/AdBanner';
import '../models/SiteSettings';
import '../models/News';
import '../models/Article';
import '../models/SiteContent';
import '../models/EmailConfig';
import '../models/Testimonial';
import '../models/FileRecord';
import { storeImage, storedUrlFor } from '../services/media/r2MediaStore';
import { downloadImage } from '../services/cloudinaryService';
import {
  findCloudinaryUrls,
  classifyReference,
  planMigration,
  isCityConventionId,
  type CloudinaryRef,
  type MigrationTarget,
} from '../services/media/cloudinaryMigration';

/** Collections never touched: the media index itself and high-volume logs. */
const SKIP_COLLECTIONS = new Set(['mediaassets', 'activitylogs', 'pageviews', 'analytics', 'sessions']);

interface Migrated {
  key: string;
  url: string;
}

export interface Stats {
  migrated: number;
  alreadyMigrated: number;
  failed: Array<{ publicId: string; error: string }>;
  docsUpdated: number;
  byKind: Record<string, number>;
}

export interface MigrationOptions {
  apply: boolean;
  purge?: boolean;
  onlyCollections?: string[];
  /** Skip the Cloudinary Admin API listing of convention city photos (tests). */
  skipConventionCities?: boolean;
  log?: (line: string) => void;
}

/** State of one run. */
interface RunState {
  options: MigrationOptions;
  /** Cloudinary public id → where it lives in R2 now. */
  migrated: Map<string, Migrated>;
  /** Public ids that failed this run — not retried per reference. */
  failedIds: Set<string>;
  stats: Stats;
}

/** A URL Cloudinary will serve the original from, for each delivery type. */
const sourceUrl = (ref: CloudinaryRef): string => {
  if (ref.deliveryType === 'upload') {
    return `https://res.cloudinary.com/${ref.cloud}/image/upload/${ref.publicId}${ref.format ? `.${ref.format}` : ''}`;
  }
  if (ref.deliveryType === 'authenticated') {
    return cloudinary.url(ref.publicId, { type: 'authenticated', sign_url: true, secure: true, ...(ref.format ? { format: ref.format } : {}) });
  }
  return cloudinary.utils.private_download_url(ref.publicId, ref.format || 'jpg', { type: 'private' });
};

/** Migrate one Cloudinary image (once), returning where it lives now. */
const migrateOne = async (run: RunState, ref: CloudinaryRef, target: MigrationTarget | null): Promise<Migrated | null> => {
  const { migrated, failedIds, stats, options } = run;
  const log = options.log ?? console.log;
  const done = migrated.get(ref.publicId);
  if (done) return done;
  if (failedIds.has(ref.publicId)) return null;

  const plan = planMigration(ref, target);
  if (!options.apply) {
    const preview = { key: plan.key, url: `(r2)/${plan.key}/original.jpg` };
    migrated.set(ref.publicId, preview);
    stats.migrated++;
    stats.byKind[plan.kind] = (stats.byKind[plan.kind] || 0) + 1;
    log(`  would migrate ${ref.publicId}  →  ${plan.key}${plan.bucket === 'private' ? '  (private)' : ''}`);
    return preview;
  }

  try {
    const buffer = await downloadImage(sourceUrl(ref), 60_000);
    const stored = await storeImage(buffer, {
      kind: plan.kind,
      context: plan.context,
      key: plan.key,
      bucket: plan.bucket,
      // Keep originals crisp: masters were already ≤1920 on Cloudinary.
      master: { maxWidth: 1920, maxHeight: 1920, preserveQuality: true },
      source: { cloudinaryPublicId: ref.publicId },
    });
    const result = { key: stored.key, url: stored.url };
    migrated.set(ref.publicId, result);
    stats.migrated++;
    stats.byKind[plan.kind] = (stats.byKind[plan.kind] || 0) + 1;
    return result;
  } catch (error: any) {
    failedIds.add(ref.publicId);
    stats.failed.push({ publicId: ref.publicId, error: error?.message || String(error) });
    log(`  ❌ ${ref.publicId}: ${error?.message || error}`);
    return null;
  }
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v as any)._bsontype && !(v instanceof Date) && !Buffer.isBuffer(v);

/** Every string leaf of a document with its dotted path. */
const collectStrings = (value: unknown, pathPrefix: string, out: Array<{ path: string; value: string }>): void => {
  if (typeof value === 'string') {
    out.push({ path: pathPrefix, value });
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => collectStrings(item, pathPrefix ? `${pathPrefix}.${i}` : String(i), out));
  } else if (isPlainObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (k === '_id' && !pathPrefix) continue;
      collectStrings(v, pathPrefix ? `${pathPrefix}.${k}` : k, out);
    }
  }
};

const isPublicIdField = (path: string): boolean => /publicid$/i.test(path.split('.').pop() || '');

/** Migrate everything one document references; returns the $set to apply. */
const processDocument = async (run: RunState, modelName: string, doc: any): Promise<Record<string, string>> => {
  const strings: Array<{ path: string; value: string }> = [];
  collectStrings(doc, '', strings);
  const set: Record<string, string> = {};

  // URLs first, so publicId fields next to them find the mapping.
  for (const { path: fieldPath, value } of strings) {
    if (!value.includes('res.cloudinary.com')) continue;
    const refs = findCloudinaryUrls(value);
    if (refs.length === 0) continue;
    let next = value;
    for (const ref of refs) {
      const target = classifyReference(modelName, doc, fieldPath);
      const result = await migrateOne(run, ref, target);
      if (result) next = next.split(ref.url).join(result.url);
    }
    if (next !== value) set[fieldPath] = next;
  }

  for (const { path: fieldPath, value } of strings) {
    if (!isPublicIdField(fieldPath)) continue;
    const result = run.migrated.get(value);
    if (result && result.key !== value) set[fieldPath] = result.key;
  }

  return set;
};

const migrateCollection = async (run: RunState, collectionName: string, modelName: string): Promise<void> => {
  const collection = mongoose.connection.db!.collection(collectionName);
  const cursor = collection.find({}, { batchSize: 200 });
  let scanned = 0;
  let updated = 0;
  for await (const doc of cursor) {
    scanned++;
    const set = await processDocument(run, modelName, doc);
    if (Object.keys(set).length === 0) continue;
    updated++;
    if (run.options.apply) await collection.updateOne({ _id: doc._id }, { $set: set });
  }
  run.stats.docsUpdated += updated;
  if (updated > 0) {
    (run.options.log ?? console.log)(`  ${collectionName}: scanned ${scanned}, ${run.options.apply ? 'updated' : 'would update'} ${updated}`);
  }
};

/** The `city-{country}-{city}` photos the frontend finds by name — referenced by nothing in the DB. */
const migrateConventionCityPhotos = async (run: RunState): Promise<void> => {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME as string;
  let cursor: string | undefined;
  do {
    const page: any = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'image',
      prefix: 'city-',
      max_results: 500,
      ...(cursor ? { next_cursor: cursor } : {}),
    });
    for (const r of page.resources || []) {
      if (!isCityConventionId(r.public_id)) continue;
      await migrateOne(run, { url: r.secure_url, cloud, deliveryType: 'upload', publicId: r.public_id, format: r.format || '' }, null);
    }
    cursor = page.next_cursor;
  } while (cursor);
};

/** Delete migrated originals from Cloudinary (both delivery types), 100 at a time. */
const purgeFromCloudinary = async (publicIds: string[], log: (line: string) => void): Promise<void> => {
  log(`\nDeleting ${publicIds.length} migrated images from Cloudinary…`);
  for (let i = 0; i < publicIds.length; i += 100) {
    const batch = publicIds.slice(i, i + 100);
    const result = await cloudinary.api.delete_resources(batch);
    const notFound = Object.entries(result.deleted || {})
      .filter(([, status]) => status === 'not_found')
      .map(([id]) => id);
    if (notFound.length) await cloudinary.api.delete_resources(notFound, { type: 'authenticated' }).catch(() => undefined);
  }
};

/**
 * Migrate on the current mongoose connection. Returns the run's stats; the
 * CLI below wraps it with connect/disconnect and a report file.
 */
export async function runMigration(options: MigrationOptions): Promise<Stats> {
  const log = options.log ?? console.log;
  if (!isCloudinaryConfigured() && !options.skipConventionCities) {
    throw new Error('CLOUDINARY_* must be set (images are read from Cloudinary)');
  }
  if (options.apply && !isR2Enabled()) {
    throw new Error('R2_* must be set to migrate (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL)');
  }

  const run: RunState = {
    options,
    migrated: new Map(),
    failedIds: new Set(),
    stats: { migrated: 0, alreadyMigrated: 0, failed: [], docsUpdated: 0, byKind: {} },
  };

  // Resume: everything a previous run already moved.
  if (isR2Enabled()) {
    const previous = await MediaAsset.find({ 'source.cloudinaryPublicId': { $exists: true } })
      .select('key bucket source.cloudinaryPublicId')
      .lean();
    for (const a of previous) {
      run.migrated.set(a.source!.cloudinaryPublicId!, { key: a.key, url: storedUrlFor(a.key, a.bucket) });
    }
    run.stats.alreadyMigrated = previous.length;
    if (previous.length) log(`${previous.length} images already migrated by an earlier run.`);
  }

  const modelByCollection = new Map<string, string>();
  for (const name of mongoose.modelNames()) modelByCollection.set(mongoose.model(name).collection.collectionName, name);

  const collections = (await mongoose.connection.db!.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((name) => !name.startsWith('system.') && !SKIP_COLLECTIONS.has(name))
    .filter((name) => !options.onlyCollections || options.onlyCollections.includes(name))
    // Owner-aware collections first, so an image shared with e.g. an archive
    // thumbnail lands in its listing's folder rather than legacy/. FileRecord
    // last: it only mirrors references the others already resolved.
    .sort((a, b) => rank(a, modelByCollection) - rank(b, modelByCollection));

  log('\nDocuments:');
  for (const name of collections) {
    await migrateCollection(run, name, modelByCollection.get(name) || '');
  }

  if (!options.onlyCollections && !options.skipConventionCities) {
    log('\nConvention city photos (city-*):');
    await migrateConventionCityPhotos(run);
  }

  if (options.apply && options.purge && run.stats.failed.length === 0) {
    await purgeFromCloudinary([...run.migrated.keys()], log);
  } else if (options.purge) {
    log('\nNot purging Cloudinary: ' + (options.apply ? `${run.stats.failed.length} images failed — fix and re-run first.` : 'dry run.'));
  }

  return run.stats;
}

/** Sort order: collections whose model classifies references first, FileRecord last. */
const rank = (collection: string, modelByCollection: Map<string, string>): number => {
  const model = modelByCollection.get(collection);
  if (model === 'FileRecord') return 2;
  return model ? 0 : 1;
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    apply: args.includes('--apply'),
    purge: args.includes('--purge-cloudinary'),
    onlyCollections: args.find((a) => a.startsWith('--collections='))?.split('=')[1]?.split(',').filter(Boolean),
  };
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);

  console.log(options.apply ? 'Migrating Cloudinary images to R2…' : 'DRY RUN — nothing will be uploaded or changed (pass --apply)');
  let stats: Stats;
  try {
    stats = await runMigration(options);
  } finally {
    await mongoose.disconnect();
  }

  const reportPath = path.resolve(process.cwd(), `media-migration-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({ finishedAt: new Date().toISOString(), apply: options.apply, ...stats }, null, 2));

  const verb = options.apply ? 'migrated' : 'would migrate';
  console.log(
    `\nDone. ${verb} ${stats.migrated} images (${Object.entries(stats.byKind).map(([k, n]) => `${k}: ${n}`).join(', ') || 'none'}), ` +
      `${stats.alreadyMigrated} already done, ${options.apply ? 'updated' : 'would update'} ${stats.docsUpdated} documents. ` +
      `Failed: ${stats.failed.length}. Report: ${reportPath}`
  );
  if (stats.failed.length > 0) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
