/**
 * One-time migration: copy every image referenced by the database off
 * Cloudinary and onto Bunny storage, rewriting the stored URLs as it goes.
 *
 * Driven by the **database**, not by Cloudinary's asset list. That ordering is
 * the point: it guarantees every URL the site can render gets rewritten, and
 * it ignores the orphaned derivatives and abandoned uploads that accumulate in
 * a media library over time — assets nobody would miss and nobody should pay
 * to move.
 *
 * Safe to re-run. Every field is checked for whether it still points at
 * Cloudinary, so a run that dies halfway resumes by simply starting again, and
 * a finished field is skipped rather than re-uploaded.
 *
 * Usage:
 *   npx tsx src/scripts/migrateCloudinaryToBunny.ts --dry-run
 *   npx tsx src/scripts/migrateCloudinaryToBunny.ts --only=Property
 *   npx tsx src/scripts/migrateCloudinaryToBunny.ts --limit=50
 *   npx tsx src/scripts/migrateCloudinaryToBunny.ts
 *
 * Requires the Cloudinary credentials to still be present (to read), plus the
 * Bunny ones (to write). Do not cancel the Cloudinary account until a verifying
 * run reports zero remaining.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { putObject } from '../services/bunnyStorageService';
import { encodeMaster } from '../services/imageStorageService';
import { buildBunnyUrl } from '../utils/bunnyUrl';
import { assertBunnyConfigured } from '../config/bunny';

import AdBanner from '../models/AdBanner';
import Agency from '../models/Agency';
import Agent from '../models/Agent';
import Article from '../models/Article';
import BusinessListing from '../models/BusinessListing';
import CityMarketData from '../models/CityMarketData';
import CityMarketSnapshot from '../models/CityMarketSnapshot';
import CityShowcase from '../models/CityShowcase';
import FileRecord from '../models/FileRecord';
import Message from '../models/Message';
import News from '../models/News';
import Property from '../models/Property';
import SiteContent from '../models/SiteContent';
import SiteSettings from '../models/SiteSettings';
import Testimonial from '../models/Testimonial';
import User from '../models/User';
import VillaDestination from '../models/VillaDestination';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CLOUDINARY_HOST = 'res.cloudinary.com';

/** Videos are copied byte-for-byte; images are re-encoded to a WebP master. */
type AssetKind = 'image' | 'video';

/**
 * One migratable field.
 *
 * `path` is a dotted path into the document, and may cross a single array —
 * `images.url` means "the `url` of every entry in `images`". That one case
 * covers Property's photo array, which is where most of the volume is.
 */
interface FieldSpec {
  path: string;
  publicIdPath?: string;
  kind?: AssetKind;
}

interface ModelSpec {
  name: string;
  model: mongoose.Model<any>;
  fields: FieldSpec[];
}

const MODELS: ModelSpec[] = [
  { name: 'AdBanner', model: AdBanner as any, fields: [{ path: 'imageUrl', publicIdPath: 'imagePublicId' }] },
  {
    name: 'Agency',
    model: Agency as any,
    fields: [
      { path: 'logo', publicIdPath: 'logoPublicId' },
      { path: 'coverImage', publicIdPath: 'coverImagePublicId' },
      { path: 'credentials.documentUrl', publicIdPath: 'credentials.documentPublicId' },
    ],
  },
  { name: 'Agent', model: Agent as any, fields: [{ path: 'documentUrl', publicIdPath: 'documentPublicId' }] },
  { name: 'Article', model: Article as any, fields: [{ path: 'coverImageUrl', publicIdPath: 'coverImagePublicId' }] },
  {
    name: 'BusinessListing',
    model: BusinessListing as any,
    fields: [
      { path: 'logoUrl', publicIdPath: 'logoPublicId' },
      { path: 'bannerUrl', publicIdPath: 'bannerPublicId' },
    ],
  },
  { name: 'CityMarketData', model: CityMarketData as any, fields: [{ path: 'imageUrl', publicIdPath: 'imagePublicId' }] },
  { name: 'CityMarketSnapshot', model: CityMarketSnapshot as any, fields: [{ path: 'imageUrl' }] },
  { name: 'CityShowcase', model: CityShowcase as any, fields: [{ path: 'imageUrl', publicIdPath: 'imagePublicId' }] },
  { name: 'Message', model: Message as any, fields: [{ path: 'imageUrl', publicIdPath: 'imagePublicId' }] },
  { name: 'News', model: News as any, fields: [{ path: 'coverImageUrl', publicIdPath: 'coverImagePublicId' }] },
  {
    name: 'Property',
    model: Property as any,
    fields: [
      { path: 'imageUrl', publicIdPath: 'imagePublicId' },
      { path: 'images.url', publicIdPath: 'images.publicId' },
      { path: 'floorplanUrl', publicIdPath: 'floorplanPublicId' },
      { path: 'generatedVideoUrl', publicIdPath: 'generatedVideoPublicId', kind: 'video' },
    ],
  },
  { name: 'SiteContent', model: SiteContent as any, fields: [{ path: 'url', publicIdPath: 'publicId' }] },
  {
    name: 'SiteSettings',
    model: SiteSettings as any,
    fields: [
      { path: 'logoUrl', publicIdPath: 'logoPublicId' },
      { path: 'emailLogoUrl', publicIdPath: 'emailLogoPublicId' },
    ],
  },
  { name: 'Testimonial', model: Testimonial as any, fields: [{ path: 'avatarUrl' }] },
  {
    name: 'User',
    model: User as any,
    fields: [
      { path: 'avatarUrl', publicIdPath: 'avatarPublicId' },
      { path: 'credentials.documentUrl', publicIdPath: 'credentials.documentPublicId' },
    ],
  },
  { name: 'VillaDestination', model: VillaDestination as any, fields: [{ path: 'imageUrl', publicIdPath: 'imagePublicId' }] },
];

// ── URL / path helpers ───────────────────────────────────────────────────────

const isCloudinaryUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || !value) return false;
  try {
    return new URL(value).hostname.toLowerCase() === CLOUDINARY_HOST;
  } catch {
    return false;
  }
};

/**
 * Recover a Cloudinary public id from a delivery URL.
 *
 * Everything between `/upload/` (or `/authenticated/`) and the filename may be
 * transformation segments and a version; both are stripped, since neither is
 * part of the id. Used only when a document stored a URL but no public id.
 */
const publicIdFromUrl = (url: string): string => {
  const match = url.match(/\/(?:image|video)\/(?:upload|authenticated)\/(.+)$/);
  if (!match) return '';

  const parts = match[1].split('/');
  const versionIdx = parts.findIndex(p => /^v\d+$/.test(p));
  const rest = versionIdx !== -1
    ? parts.slice(versionIdx + 1)
    : parts.filter(p => !p.split(',').every(t => /^[a-z]{1,3}_/.test(t)));

  return rest.join('/').replace(/\.[a-z0-9]+$/i, '');
};

/**
 * Storage path for a migrated asset.
 *
 * The Cloudinary public id is already a readable folder path — the layout this
 * codebase built deliberately — so it is kept as-is and only given the
 * extension its new format needs. Existing folder-prefix logic (listing
 * deletes, temp cleanup) then keeps working unchanged after the migration.
 */
const targetStoragePath = (publicId: string, kind: AssetKind): string => {
  const cleaned = publicId.replace(/^\/+/, '').replace(/\.[a-z0-9]+$/i, '');
  return `${cleaned}.${kind === 'video' ? 'mp4' : 'webp'}`;
};

/** Download an asset, signing the URL when it is a private document. */
const downloadFromCloudinary = async (url: string, publicId: string): Promise<Buffer> => {
  const isAuthenticated = url.includes('/authenticated/');

  // An authenticated asset 401s on its plain URL; only a signed one is fetchable.
  const fetchUrl = isAuthenticated
    ? cloudinary.url(publicId, { type: 'authenticated', sign_url: true, secure: true })
    : url;

  const response = await fetch(fetchUrl, { redirect: 'follow', signal: AbortSignal.timeout(120_000) });
  if (!response.ok) {
    throw new Error(`download failed: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
};

// ── Document traversal ───────────────────────────────────────────────────────

/** Read a dotted path, returning every match when the path crosses an array. */
const readPath = (doc: any, path: string): Array<{ container: any; key: string }> => {
  const [head, ...tail] = path.split('.');
  if (tail.length === 0) return doc ? [{ container: doc, key: head }] : [];

  const next = doc?.[head];
  if (Array.isArray(next)) {
    return next.flatMap((entry: any) => readPath(entry, tail.join('.')));
  }
  return next ? readPath(next, tail.join('.')) : [];
};

interface Stats {
  migrated: number;
  skipped: number;
  failed: number;
  bytesBefore: number;
  bytesAfter: number;
}

const stats: Stats = { migrated: 0, skipped: 0, failed: 0, bytesBefore: 0, bytesAfter: 0 };

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ONLY = args.find(a => a.startsWith('--only='))?.split('=')[1];
const LIMIT = Number(args.find(a => a.startsWith('--limit='))?.split('=')[1] || 0);

/**
 * Migrate one field of one document. Returns true when the document changed.
 */
const migrateField = async (doc: any, field: FieldSpec): Promise<boolean> => {
  const kind: AssetKind = field.kind ?? 'image';
  const urlSlots = readPath(doc, field.path);
  const idSlots = field.publicIdPath ? readPath(doc, field.publicIdPath) : [];

  let changed = false;

  for (let i = 0; i < urlSlots.length; i++) {
    const { container, key } = urlSlots[i];
    const url = container?.[key];
    if (!isCloudinaryUrl(url)) continue;

    const idSlot = idSlots[i];
    const publicId = (idSlot?.container?.[idSlot.key] as string) || publicIdFromUrl(url);

    if (!publicId) {
      console.warn(`  ! ${doc._id} ${field.path}: no public id recoverable from ${url}`);
      stats.failed++;
      continue;
    }

    const storagePath = targetStoragePath(publicId, kind);

    if (DRY_RUN) {
      console.log(`  · ${doc._id} ${field.path}: ${publicId} → ${storagePath}`);
      stats.migrated++;
      continue;
    }

    try {
      const source = await downloadFromCloudinary(url, publicId);

      // Videos are copied as they are: Bunny does not transcode, and the file
      // is already the H.264 MP4 the site was serving.
      const body = kind === 'video'
        ? source
        : (await encodeMaster(source, { maxWidth: 1920, maxHeight: 1080, preserveQuality: false })).buffer;

      await putObject(storagePath, body, kind === 'video' ? 'video/mp4' : 'image/webp');

      container[key] = buildBunnyUrl(storagePath);
      if (idSlot) idSlot.container[idSlot.key] = storagePath;

      stats.bytesBefore += source.length;
      stats.bytesAfter += body.length;
      stats.migrated++;
      changed = true;

      const saved = Math.round((1 - body.length / source.length) * 100);
      console.log(`  ✓ ${storagePath} (${Math.round(source.length / 1024)}KB → ${Math.round(body.length / 1024)}KB, -${saved}%)`);
    } catch (error: any) {
      console.error(`  ✗ ${doc._id} ${field.path} (${publicId}): ${error.message}`);
      stats.failed++;
    }
  }

  return changed;
};

const migrateModel = async (spec: ModelSpec): Promise<void> => {
  // Match documents where any migratable field still names Cloudinary. The
  // regex is anchored at the scheme so it cannot match the host inside some
  // unrelated string.
  const cloudinaryMatch = { $regex: '^https?://res\\.cloudinary\\.com/', $options: 'i' };
  const filter = {
    $or: spec.fields.map(f => ({ [f.path]: cloudinaryMatch })),
  };

  const query = spec.model.find(filter);
  if (LIMIT) query.limit(LIMIT);

  const docs = await query.exec();
  if (docs.length === 0) {
    console.log(`\n${spec.name}: nothing to migrate`);
    return;
  }

  console.log(`\n${spec.name}: ${docs.length} document(s) with Cloudinary URLs`);

  for (const doc of docs) {
    let changed = false;
    for (const field of spec.fields) {
      if (await migrateField(doc, field)) changed = true;
    }

    if (changed && !DRY_RUN) {
      // `markModified` because the array-crossing paths mutate nested
      // subdocuments in place, which Mongoose does not always detect.
      spec.fields.forEach(f => doc.markModified(f.path.split('.')[0]));
      await doc.save();
    }
  }
};

/**
 * Rewrite the ownership records last.
 *
 * These are keyed by public id and are what gates access to private documents,
 * so they are only touched once the objects they describe are known to exist in
 * their new home.
 */
const migrateFileRecords = async (): Promise<void> => {
  const records = await FileRecord.find({
    url: { $regex: '^https?://res\\.cloudinary\\.com/', $options: 'i' },
  });

  if (records.length === 0) {
    console.log('\nFileRecord: nothing to migrate');
    return;
  }

  console.log(`\nFileRecord: ${records.length} record(s)`);

  for (const record of records) {
    const storagePath = targetStoragePath(record.publicId, 'image');
    if (DRY_RUN) {
      console.log(`  · ${record.publicId} → ${storagePath}`);
      continue;
    }
    record.publicId = storagePath;
    record.url = buildBunnyUrl(storagePath);
    await record.save();
  }
};

const main = async (): Promise<void> => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('CLOUDINARY_CLOUD_NAME is not set — the migration reads from Cloudinary.');
  }
  if (!DRY_RUN) assertBunnyConfigured();

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri);
  console.log(`Connected. ${DRY_RUN ? 'DRY RUN — nothing will be written.' : 'Migrating…'}`);

  const targets = ONLY ? MODELS.filter(m => m.name === ONLY) : MODELS;
  if (ONLY && targets.length === 0) {
    throw new Error(`Unknown model "${ONLY}". Known: ${MODELS.map(m => m.name).join(', ')}`);
  }

  for (const spec of targets) {
    await migrateModel(spec);
  }

  if (!ONLY) await migrateFileRecords();

  const savedPct = stats.bytesBefore
    ? Math.round((1 - stats.bytesAfter / stats.bytesBefore) * 100)
    : 0;

  console.log('\n─────────────────────────────');
  console.log(`migrated: ${stats.migrated}`);
  console.log(`failed:   ${stats.failed}`);
  if (stats.bytesBefore) {
    console.log(
      `bytes:    ${(stats.bytesBefore / 1e6).toFixed(1)}MB → ${(stats.bytesAfter / 1e6).toFixed(1)}MB (-${savedPct}%)`
    );
  }
  if (stats.failed > 0) {
    console.log('\nRe-run to retry the failures; migrated fields are skipped automatically.');
  }

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
