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
 *
 * Needs R2_* only. Cloudinary is read over plain HTTPS — no SDK, no API key.
 * Set CLOUDINARY_API_SECRET just for a run that has private (licence)
 * documents whose stored URL isn't signed; CLOUDINARY_CLOUD_NAME only if the
 * database has no Cloudinary URLs to learn it from. When the run reports
 * "Failed: 0" and the site looks right, delete the media in the Cloudinary
 * dashboard and close the account.
 */
import path from 'path';
import fs from 'fs';
import { loadedEnvFiles } from '../config/loadEnv';

import mongoose from 'mongoose';
import { createHash } from 'crypto';
import { isR2Enabled, missingR2Vars } from '../config/r2';
import { CITIES, publicId as cityPublicId } from './seedCityImages';
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
import { resolveMediaNames } from '../services/media/mediaNames';
import { downloadImage } from '../services/mediaService';
import FileRecord from '../models/FileRecord';
import { registerFileUpload } from '../services/storageAccessPolicy';
import {
  findCloudinaryUrls,
  classifyReference,
  planMigration,
  type CloudinaryRef,
  type MigrationTarget,
} from '../services/media/cloudinaryMigration';

/** Collections never touched: the media index itself and high-volume logs. */
const SKIP_COLLECTIONS = new Set(['mediaassets', 'mediamigrationstates', 'activitylogs', 'pageviews', 'analytics', 'sessions']);

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
  /** Images deliberately left on Cloudinary (--skip-external / --skip-listings). */
  leftOnCloudinary: number;
  /** Access records created for private documents that had none. */
  accessRecordsCreated: number;
}

export interface MigrationOptions {
  apply: boolean;
  onlyCollections?: string[];
  /** Skip the Cloudinary Admin API listing of convention city photos (tests). */
  skipConventionCities?: boolean;
  /** Pause after each copied image — keeps a migration on the live server gentle. */
  throttleMs?: number;
  /** Leave imported external-listing images (…/external-listings/…) on Cloudinary for now. */
  skipExternal?: boolean;
  /**
   * Leave every listing photo and floor plan (own and external) on Cloudinary;
   * move everything else (avatars, logos, cities, villas…). The site keeps
   * showing those through the image proxy.
   */
  skipListings?: boolean;
  log?: (line: string) => void;
}

/** State of one run. */
interface RunState {
  options: MigrationOptions;
  /** Cloudinary public id → where it lives in R2 now. */
  migrated: Map<string, Migrated>;
  /** Public ids that failed this run — not retried per reference. */
  failedIds: Set<string>;
  /** Public ids deliberately left on Cloudinary this run. */
  skippedIds: Set<string>;
  /** Cloudinary cloud names seen in the documents (to find convention photos). */
  cloudsSeen: string[];
  stats: Stats;
}

/**
 * Cloudinary's URL signature (`s--XXXXXXXX--`) for a public id: the first 8
 * characters of base64url(sha1("{public_id}.{format}" + api_secret)).
 */
export const cloudinaryUrlSignature = (publicIdWithFormat: string, apiSecret: string): string =>
  createHash('sha1').update(publicIdWithFormat + apiSecret).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').slice(0, 8);

/**
 * URLs Cloudinary serves the original from, best first. Public images are a
 * plain download. Private ("authenticated") ones: the URL as stored (Cloudinary
 * returns it signed), then one signed with CLOUDINARY_API_SECRET if it's set.
 * No Cloudinary SDK or API call is needed.
 */
/**
 * Cloudinary's signed API download link for an original (what its SDK calls
 * private_download_url). It works when public delivery is refused — e.g.
 * "Restricted image types" or an account over its delivery limits answers
 * 401 to every res.cloudinary.com URL. Read-only: it can't upload anything.
 * Signature: sha1 of the sorted params + API secret.
 */
export const cloudinaryApiDownloadUrl = (
  ref: Pick<CloudinaryRef, 'cloud' | 'publicId' | 'format' | 'deliveryType'>,
  apiKey: string,
  apiSecret: string,
  timestamp: number = Math.floor(Date.now() / 1000)
): string => {
  const params: Record<string, string> = {
    public_id: ref.publicId,
    timestamp: String(timestamp),
    type: ref.deliveryType,
    ...(ref.format ? { format: ref.format } : {}),
  };
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const signature = createHash('sha1').update(toSign + apiSecret).digest('hex');
  const query = new URLSearchParams({ ...params, api_key: apiKey, signature });
  return `https://api.cloudinary.com/v1_1/${ref.cloud}/image/download?${query.toString()}`;
};

const sourceUrls = (ref: CloudinaryRef): string[] => {
  const file = `${ref.publicId}${ref.format ? `.${ref.format}` : ''}`;
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const urls =
    ref.deliveryType === 'upload' ? [`https://res.cloudinary.com/${ref.cloud}/image/upload/${file}`, ref.url] : [ref.url];
  if (secret && ref.deliveryType !== 'upload') {
    urls.push(`https://res.cloudinary.com/${ref.cloud}/image/${ref.deliveryType}/s--${cloudinaryUrlSignature(file, secret)}--/v1/${file}`);
  }
  // Last resort, and the only way when Cloudinary refuses public delivery.
  if (secret && apiKey) urls.push(cloudinaryApiDownloadUrl(ref, apiKey, secret));
  return [...new Set(urls)];
};

/** Download the first source that answers. */
const downloadOriginal = async (ref: CloudinaryRef): Promise<Buffer> => {
  let lastError: unknown;
  for (const url of sourceUrls(ref)) {
    try {
      return await downloadImage(url, 60_000);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
};

/** Images imported from external listing feeds (Cloudinary folder `…/external-listings/…`). */
export const isExternalListingImage = (publicId: string): boolean => /(^|\/)external-listings\//.test(publicId);

/** Migrate one Cloudinary image (once), returning where it lives now. */
const migrateOne = async (run: RunState, ref: CloudinaryRef, target: MigrationTarget | null): Promise<Migrated | null> => {
  const { migrated, failedIds, stats, options } = run;
  const log = options.log ?? console.log;
  const done = migrated.get(ref.publicId);
  if (done) return done;
  if (failedIds.has(ref.publicId)) return null;
  if (run.skippedIds.has(ref.publicId)) return null;
  const isListingPhoto =
    isExternalListingImage(ref.publicId) ||
    /\/listings\//.test(ref.publicId) ||
    target?.kind === 'property' ||
    target?.kind === 'floorplan';
  if ((options.skipExternal && isExternalListingImage(ref.publicId)) || (options.skipListings && isListingPhoto)) {
    run.skippedIds.add(ref.publicId);
    stats.leftOnCloudinary++;
    return null;
  }

  // Readable folder names (user, listing title + reference, agency…).
  const named = target ? { ...target, context: await resolveMediaNames(target.context) } : null;
  const plan = planMigration(ref, named);
  if (!options.apply) {
    const preview = { key: plan.key, url: `(r2)/${plan.key}/original.jpg` };
    migrated.set(ref.publicId, preview);
    stats.migrated++;
    stats.byKind[plan.kind] = (stats.byKind[plan.kind] || 0) + 1;
    log(`  would migrate ${ref.publicId}  →  ${plan.key}${plan.bucket === 'private' ? '  (private)' : ''}`);
    return preview;
  }

  try {
    const buffer = await downloadOriginal(ref);
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
    if (stats.migrated % 100 === 0) log(`  … ${stats.migrated} images copied so far (${stats.failed.length} failed)`);
    if (options.throttleMs) await new Promise((resolve) => setTimeout(resolve, options.throttleMs));
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

/** A field to rewrite: the value it had when read, and its new value. */
interface FieldChange {
  from: string;
  to: string;
}

/** Migrate everything one document references; returns the fields to rewrite. */
const processDocument = async (run: RunState, modelName: string, doc: any): Promise<Record<string, FieldChange>> => {
  const strings: Array<{ path: string; value: string }> = [];
  collectStrings(doc, '', strings);
  const set: Record<string, FieldChange> = {};

  // URLs first, so publicId fields next to them find the mapping.
  for (const { path: fieldPath, value } of strings) {
    if (!value.includes('res.cloudinary.com')) continue;
    const refs = findCloudinaryUrls(value);
    if (refs.length === 0) continue;
    let next = value;
    for (const ref of refs) {
      run.cloudsSeen.push(ref.cloud);
      const target = classifyReference(modelName, doc, fieldPath);
      const result = await migrateOne(run, ref, target);
      if (result) next = next.split(ref.url).join(result.url);
    }
    if (next !== value) set[fieldPath] = { from: value, to: next };
  }

  for (const { path: fieldPath, value } of strings) {
    if (!isPublicIdField(fieldPath)) continue;
    const result = run.migrated.get(value);
    if (result && result.key !== value) set[fieldPath] = { from: value, to: result.key };
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
    let current: any = doc;
    // The site may be live: a field is only rewritten if it still holds the
    // value we read, so an edit made meanwhile (say, photos reordered) is
    // never overwritten. When the document changed, read it again and redo it
    // (cheap — the images are already copied).
    for (let attempt = 0; current && attempt < 3; attempt++) {
      const changes = await processDocument(run, modelName, current);
      const paths = Object.keys(changes);
      if (paths.length === 0) break;
      if (!run.options.apply) {
        updated++;
        break;
      }
      const filter: Record<string, unknown> = { _id: current._id };
      const $set: Record<string, string> = {};
      for (const p of paths) {
        filter[p] = changes[p].from;
        $set[p] = changes[p].to;
      }
      const result = await collection.updateOne(filter, { $set });
      if (result.matchedCount > 0) {
        updated++;
        break;
      }
      current = await collection.findOne({ _id: current._id });
    }
  }
  run.stats.docsUpdated += updated;
  if (updated > 0) {
    (run.options.log ?? console.log)(`  ${collectionName}: scanned ${scanned}, ${run.options.apply ? 'updated' : 'would update'} ${updated}`);
  }
};

/** The Cloudinary cloud the database's images live in (the most common one seen). */
const detectCloud = (run: RunState): string | null => {
  if (process.env.CLOUDINARY_CLOUD_NAME?.trim()) return process.env.CLOUDINARY_CLOUD_NAME.trim();
  const counts = new Map<string, number>();
  for (const cloud of run.cloudsSeen) counts.set(cloud, (counts.get(cloud) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};

/**
 * The `city-{country}-{city}` photos the frontend finds by name. Nothing in
 * the database points at most of them, so each featured city's id is tried
 * directly; a city that was never seeded is simply skipped.
 */
const migrateConventionCityPhotos = async (run: RunState): Promise<void> => {
  const cloud = detectCloud(run);
  if (!cloud) {
    (run.options.log ?? console.log)('  (no Cloudinary cloud name known — set CLOUDINARY_CLOUD_NAME to include them)');
    return;
  }
  for (const { city, country } of CITIES) {
    const id = cityPublicId(city, country);
    if (run.migrated.has(id)) continue;
    const url = `https://res.cloudinary.com/${cloud}/image/upload/${id}`;
    const head = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15_000) }).catch(() => null);
    if (!head?.ok) continue; // never seeded for this city
    await migrateOne(run, { url, cloud, deliveryType: 'upload', publicId: id, format: '' }, null);
  }
};

/**
 * Migrate on the current mongoose connection. Returns the run's stats; the
 * CLI below wraps it with connect/disconnect and a report file.
 */
export async function runMigration(options: MigrationOptions): Promise<Stats> {
  const log = options.log ?? console.log;
  if (options.apply && !isR2Enabled()) {
    const missing = missingR2Vars();
    throw new Error(
      `R2 is not configured — missing or empty: ${missing.join(', ')} (looked in ${loadedEnvFiles.join(' and ')})`
    );
  }

  const run: RunState = {
    options,
    migrated: new Map(),
    failedIds: new Set(),
    skippedIds: new Set(),
    cloudsSeen: [],
    stats: { migrated: 0, alreadyMigrated: 0, failed: [], docsUpdated: 0, byKind: {}, leftOnCloudinary: 0, accessRecordsCreated: 0 },
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

  // Curated city photos first when the cloud is known up front: the frontend
  // finds them by name, so they're worth having on R2 early. Otherwise the
  // cloud is learnt from the documents and they come last.
  const conventionCities = !options.onlyCollections && !options.skipConventionCities;
  const cloudKnown = Boolean(process.env.CLOUDINARY_CLOUD_NAME?.trim());
  if (conventionCities && cloudKnown) {
    log('\nConvention city photos (city-*):');
    await migrateConventionCityPhotos(run);
  }

  log('\nDocuments:');
  for (const name of collections) {
    await migrateCollection(run, name, modelByCollection.get(name) || '');
  }

  if (options.apply) await ensurePrivateAccessRecords(run);

  if (conventionCities && !cloudKnown) {
    log('\nConvention city photos (city-*):');
    await migrateConventionCityPhotos(run);
  }

  return run.stats;
}

/**
 * Private documents open through /api/files/open, which needs a FileRecord
 * naming the owner. Licences and credentials uploaded before FileRecord
 * existed have none, so give every private photo with a known owner one —
 * otherwise only admins could open them after the move. Runs after the
 * FileRecord collection was rewritten, so existing records are kept.
 */
const ensurePrivateAccessRecords = async (run: RunState): Promise<void> => {
  const assets = await MediaAsset.find({ bucket: 'private', ownerId: { $exists: true } })
    .select('key kind ownerId credentialId bytes')
    .lean();
  for (const asset of assets) {
    if (await FileRecord.exists({ publicId: asset.key })) continue;
    await registerFileUpload({
      publicId: asset.key,
      url: storedUrlFor(asset.key, 'private'),
      userId: String(asset.ownerId),
      fileType: asset.kind === 'license' || asset.kind === 'credential' ? asset.kind : 'other',
      resourceId: asset.credentialId,
      mimeType: 'image/jpeg',
      bytes: asset.bytes,
    });
    run.stats.accessRecordsCreated++;
  }
  if (run.stats.accessRecordsCreated) {
    (run.options.log ?? console.log)(`Created ${run.stats.accessRecordsCreated} access records for private documents that had none.`);
  }
};

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
    skipExternal: args.includes('--skip-external'),
    skipListings: args.includes('--skip-listings'),
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
      `${stats.alreadyMigrated} already done, ` +
      (stats.leftOnCloudinary ? `${stats.leftOnCloudinary} images left on Cloudinary as asked, ` : '') +
      `${options.apply ? 'updated' : 'would update'} ${stats.docsUpdated} documents. ` +
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
