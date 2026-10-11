/**
 * Check that every picture the site shows comes from R2.
 *
 * Scans every string field of every collection (URLs inside HTML/text too)
 * and reports:
 *   1. links still pointing at Cloudinary (res.cloudinary.com) — run
 *      `npm run media:migrate:apply` to move them;
 *   2. links to our media domain whose photo is missing — no MediaAsset
 *      record, or (unless --no-http) its original.jpg doesn't answer;
 *   3. the curated city photos (cities/convention/…) the frontend finds by
 *      name, which no document links to.
 *
 *   npm run media:check              (everything, including an HTTP check of each photo)
 *   npm run media:check -- --no-http (database only, fast)
 *
 * Exits 1 when anything is wrong, and writes media-check-report-*.json.
 */
import '../config/loadEnv';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import MediaAsset from '../models/MediaAsset';
import { parseMediaUrl, mediaFileUrl, MEDIA_MASTER_FILE, CITY_CONVENTION_FOLDER } from '../config/mediaVariants';
import { CITIES, publicId as cityPublicId } from './seedCityImages';

const CLOUDINARY_URL = /https?:\/\/res\.cloudinary\.com\/[^\s"'<>()\\]+/g;
const SKIP_COLLECTIONS = new Set(['activitylogs', 'pageviews', 'analytics', 'sessions']);
const HTTP_CONCURRENCY = 12;

interface Finding {
  collection: string;
  id: string;
  path: string;
  url: string;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v as any)._bsontype && !(v instanceof Date) && !Buffer.isBuffer(v);

const walk = (value: unknown, prefix: string, visit: (path: string, text: string) => void): void => {
  if (typeof value === 'string') visit(prefix, value);
  else if (Array.isArray(value)) value.forEach((item, i) => walk(item, prefix ? `${prefix}.${i}` : String(i), visit));
  else if (isPlainObject(value)) for (const [k, v] of Object.entries(value)) walk(v, prefix ? `${prefix}.${k}` : k, visit);
};

const mapLimit = async <T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> => {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    })
  );
};

async function main(): Promise<void> {
  const checkHttp = !process.argv.includes('--no-http');
  const mediaBase = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, '');
  if (!mediaBase) throw new Error('R2_PUBLIC_URL is not set (backend/.env)');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI);

  const cloudinary: Finding[] = [];
  const mediaRefs = new Map<string, Finding>(); // photo key → first place it's used
  let scannedDocs = 0;

  try {
    const collections = (await mongoose.connection.db!.listCollections({}, { nameOnly: true }).toArray())
      .map((c) => c.name)
      .filter((name) => !name.startsWith('system.') && !SKIP_COLLECTIONS.has(name) && name !== 'mediaassets');

    for (const name of collections) {
      for await (const doc of mongoose.connection.db!.collection(name).find({}, { batchSize: 500 })) {
        scannedDocs++;
        walk(doc, '', (fieldPath, text) => {
          for (const url of text.match(CLOUDINARY_URL) || []) {
            cloudinary.push({ collection: name, id: String(doc._id), path: fieldPath, url });
          }
          if (!text.includes(mediaBase)) return;
          for (const url of text.match(new RegExp(`${mediaBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/[^\\s"'<>()\\\\]+`, 'g')) || []) {
            const parsed = parseMediaUrl(url, mediaBase);
            if (parsed && !mediaRefs.has(parsed.photoKey)) {
              mediaRefs.set(parsed.photoKey, { collection: name, id: String(doc._id), path: fieldPath, url });
            }
          }
        });
      }
    }

    // Photos the database links to but MediaAsset doesn't know.
    const keys = [...mediaRefs.keys()];
    const known = new Set<string>();
    for (let i = 0; i < keys.length; i += 1000) {
      const found = await MediaAsset.find({ key: { $in: keys.slice(i, i + 1000) } }).select('key').lean();
      found.forEach((a) => known.add(a.key));
    }
    const unindexed = keys.filter((k) => !known.has(k)).map((k) => mediaRefs.get(k)!);

    // Curated city photos, found by name rather than linked.
    const conventionKeys = CITIES.map(({ city, country }) => `${CITY_CONVENTION_FOLDER}/${cityPublicId(city, country)}`);
    const conventionKnown = new Set(
      (await MediaAsset.find({ key: { $in: conventionKeys } }).select('key').lean()).map((a) => a.key)
    );
    const missingCityPhotos = conventionKeys.filter((k) => !conventionKnown.has(k));

    // Files that don't answer on the CDN.
    const unreachable: Finding[] = [];
    if (checkHttp) {
      await mapLimit(keys, HTTP_CONCURRENCY, async (key) => {
        const url = mediaFileUrl(mediaBase, key, MEDIA_MASTER_FILE);
        // Some CDNs/proxies refuse HEAD: confirm a failure with a 1-byte GET.
        let res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15_000) }).catch(() => null);
        if (!res?.ok) {
          res = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(15_000) }).catch(() => null);
          await res?.body?.cancel().catch(() => undefined);
        }
        if (!res?.ok) unreachable.push({ ...mediaRefs.get(key)!, url: `${url} (${res ? `HTTP ${res.status}` : 'no answer'})` });
      });
    }

    const report = {
      checkedAt: new Date().toISOString(),
      mediaBase,
      scannedDocs,
      r2PhotosLinked: keys.length,
      cloudinaryLinks: cloudinary,
      r2LinksWithoutRecord: unindexed,
      r2LinksNotAnswering: checkHttp ? unreachable : 'skipped (--no-http)',
      curatedCityPhotosMissing: missingCityPhotos,
    };
    const reportPath = path.resolve(process.cwd(), `media-check-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    const line = (label: string, items: Finding[]) => {
      console.log(`${items.length === 0 ? '✅' : '❌'} ${label}: ${items.length}`);
      for (const f of items.slice(0, 15)) console.log(`     ${f.collection} ${f.id} ${f.path}  ${f.url}`);
      if (items.length > 15) console.log(`     … ${items.length - 15} more in the report`);
    };
    console.log(`\nScanned ${scannedDocs} documents; ${keys.length} different R2 photos are linked.\n`);
    line('Links still on Cloudinary', cloudinary);
    line('R2 links with no MediaAsset record', unindexed);
    if (checkHttp) line('R2 links whose file does not load', unreachable);
    console.log(
      `${missingCityPhotos.length === 0 ? '✅' : 'ℹ️ '} Curated city photos not in R2: ${missingCityPhotos.length} of ${conventionKeys.length}` +
        (missingCityPhotos.length ? ' (those cities fall back to their own photo — run seedCityImages to add them)' : '')
    );
    console.log(`\nReport: ${reportPath}`);

    if (cloudinary.length || unindexed.length || unreachable.length) process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
