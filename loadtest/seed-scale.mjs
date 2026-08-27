#!/usr/bin/env node
/**
 * Seed a database up to production scale so the other tools measure something real.
 *
 * On a few hundred listings every query plan looks fine and every endpoint is
 * fast. The interesting behaviour — collection scans, in-memory sorts, index
 * working sets larger than RAM, sitemaps over the 50k URL limit — only appears
 * at scale. This inserts synthetic listings so you can reproduce that locally.
 *
 *   node loadtest/seed-scale.mjs --uri mongodb://localhost:27017/balkan-estate --count 100000
 *   node loadtest/seed-scale.mjs --uri ... --stats      # sizes only, no writes
 *   node loadtest/seed-scale.mjs --uri ... --cleanup    # remove everything it inserted
 *
 * Everything it writes is tagged (`source: 'loadtest'` on properties, an
 * @loadtest.local email on sellers), so --cleanup removes exactly what it added
 * and nothing else. It still writes to a real database: point it at a local or
 * staging one, never production.
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRequire = createRequire(path.join(here, '..', 'backend', 'package.json'));

let mongoose;
try {
  mongoose = backendRequire('mongoose');
} catch {
  console.error('Could not load mongoose from backend/node_modules — run `npm install` inside ./backend first.');
  process.exit(1);
}

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const config = {
  uri: flag('uri', process.env.MONGODB_URI),
  count: Number(flag('count', 100000)),
  sellers: Number(flag('sellers', 200)),
  batch: Number(flag('batch', 5000)),
  cleanup: has('cleanup'),
  statsOnly: has('stats'),
};

if (!config.uri) {
  console.error('No connection string. Pass --uri or set MONGODB_URI.');
  process.exit(1);
}

const host = (() => {
  try { return new URL(config.uri.replace(/^mongodb(\+srv)?:/, 'http:')).hostname; } catch { return 'unknown'; }
})();
const LOCAL = /^(localhost|127\.0\.0\.1|::1|mongo|mongodb|.*\.local|.*\.internal)$/i;
if (!LOCAL.test(host) && !/staging|dev|test/i.test(config.uri) && !has('yes')) {
  console.error(`\nRefusing to write to "${host}" — it doesn't look local or like staging.\nPass --yes if you really mean it.\n`);
  process.exit(1);
}

// ── Synthetic data ────────────────────────────────────────────────

const CITIES = {
  Kosovo: ['Pristina', 'Prizren', 'Peja', 'Gjilan', 'Mitrovica', 'Ferizaj'],
  Albania: ['Tirana', 'Durres', 'Vlore', 'Shkoder', 'Elbasan', 'Korce'],
  Serbia: ['Belgrade', 'Novi Sad', 'Nis', 'Kragujevac', 'Subotica'],
  'North Macedonia': ['Skopje', 'Bitola', 'Ohrid', 'Kumanovo', 'Tetovo'],
  Montenegro: ['Podgorica', 'Budva', 'Kotor', 'Bar', 'Herceg Novi'],
  'Bosnia and Herzegovina': ['Sarajevo', 'Banja Luka', 'Mostar', 'Tuzla', 'Zenica'],
  Croatia: ['Zagreb', 'Split', 'Dubrovnik', 'Rijeka', 'Zadar'],
};
const COUNTRIES = Object.keys(CITIES);
const TYPES = ['house', 'apartment', 'villa', 'luxury-villa', 'land', 'other'];
const CONDITIONS = ['new', 'excellent', 'good', 'fair', 'needs-renovation'];
const FURNISHINGS = ['furnished', 'semi-furnished', 'unfurnished'];
const TIERS = ['standard', 'featured', 'highlight', 'premium'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const between = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Listings carry ~8 images and a real-length description — payload size is
 * half the story at scale, so undersized documents would flatter the results.
 */
function makeProperty(i, sellerIds) {
  const country = pick(COUNTRIES);
  const city = pick(CITIES[country]);
  const propertyType = pick(TYPES);
  const listingType = Math.random() < 0.8 ? 'sale' : 'rent';
  const createdAt = new Date(Date.now() - between(0, 365) * 86400000);
  const status = Math.random() < 0.85 ? 'active' : pick(['pending', 'sold', 'draft']);
  const isPromoted = Math.random() < 0.05;

  return {
    sellerId: sellerIds[i % sellerIds.length],
    createdByName: `Loadtest Seller ${i % sellerIds.length}`,
    createdByEmail: `seller${i % sellerIds.length}@loadtest.local`,
    createdAsRole: 'agent',
    listingType,
    title: `${pick(['Modern', 'Luxury', 'Cozy', 'Spacious', 'Elegant'])} ${propertyType} in ${city} #${i}`,
    status,
    ...(status === 'sold' ? { soldAt: new Date(Date.now() - between(0, 60) * 86400000) } : {}),
    price: listingType === 'rent' ? between(200, 3000) : between(30000, 2000000),
    currency: 'EUR',
    address: `${between(1, 200)} Test Street ${i}`,
    city,
    country,
    beds: between(1, 6),
    baths: between(1, 4),
    livingRooms: between(1, 3),
    sqft: between(30, 500),
    yearBuilt: between(1960, 2025),
    parking: between(0, 3),
    description: `Load-test listing ${i}. ${'A well-presented property in a sought-after part of town. '.repeat(6)}`,
    imageUrl: `https://res.cloudinary.com/demo/image/upload/v1/loadtest/${i}-0.jpg`,
    images: Array.from({ length: 8 }, (_, n) => ({
      url: `https://res.cloudinary.com/demo/image/upload/v1/loadtest/${i}-${n}.jpg`,
      tag: 'other',
    })),
    lat: 39 + Math.random() * 7,
    lng: 13 + Math.random() * 10,
    propertyType,
    ...(propertyType === 'luxury-villa' ? { villaApprovalStatus: 'approved' } : {}),
    condition: pick(CONDITIONS),
    furnishing: pick(FURNISHINGS),
    views: between(0, 5000),
    saves: between(0, 500),
    inquiries: between(0, 100),
    isPromoted,
    ...(isPromoted ? { promotionTier: pick(TIERS), promotionEndDate: new Date(Date.now() + 30 * 86400000) } : {}),
    amenities: [],
    specialFeatures: [],
    materials: [],
    source: 'loadtest',
    sourceListingId: `lt-${i}`,
    lastRenewed: new Date(Date.now() - between(0, 90) * 86400000),
    createdAt,
    updatedAt: createdAt,
  };
}

function makeSeller(i) {
  return {
    name: `Loadtest Seller ${i}`,
    email: `seller${i}@loadtest.local`,
    // Not a usable login — these accounts exist only to be referenced by listings.
    password: '$2a$10$loadtestseedonlynotarealpasswordhash000000000000000000',
    role: 'agent',
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ── Reporting ─────────────────────────────────────────────────────

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

async function printStats(db) {
  const properties = db.collection('properties');
  const count = await properties.estimatedDocumentCount();
  const stats = await db.command({ collStats: 'properties' });
  const indexes = await properties.indexes();

  console.log('\nPROPERTIES COLLECTION');
  console.log(`  documents:        ${count.toLocaleString()}`);
  console.log(`  average doc size: ${(stats.avgObjSize || 0).toLocaleString()} bytes`);
  console.log(`  data size:        ${mb(stats.size || 0)}`);
  console.log(`  storage on disk:  ${mb(stats.storageSize || 0)}`);
  console.log(`  total index size: ${mb(stats.totalIndexSize || 0)}  (${indexes.length} indexes)`);

  const indexSizes = Object.entries(stats.indexSizes || {}).sort((a, b) => b[1] - a[1]);
  for (const [name, size] of indexSizes.slice(0, 6)) {
    console.log(`    ${name.padEnd(40)} ${mb(size)}`);
  }
  if (indexSizes.length > 6) console.log(`    … and ${indexSizes.length - 6} more`);

  console.log(
    `\n  The indexes plus the frequently-read documents are what MongoDB wants resident in RAM.\n` +
    `  Below that, every query pages from disk and latency climbs sharply — this is the number\n` +
    `  to size your database instance against.`
  );

  const active = await properties.countDocuments({ status: 'active' });
  console.log(`\n  active listings:  ${active.toLocaleString()}`);
  if (active > 50000) {
    console.log('  ⚠ /sitemap.xml emits one <url> per active listing. Search engines reject a');
    console.log('    single sitemap above 50,000 URLs (or 50 MB), so it needs a sitemap index.');
  }
  if (indexes.length === 1) {
    console.log('\n  ⚠ Only the _id index exists — start the backend once so Mongoose builds the rest,');
    console.log('    otherwise every query here will scan the collection regardless of the code.');
  }
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(config.uri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const properties = db.collection('properties');
  const users = db.collection('users');
  console.log(`\nConnected to ${mongoose.connection.name}`);

  if (config.cleanup) {
    const p = await properties.deleteMany({ source: 'loadtest' });
    const u = await users.deleteMany({ email: /@loadtest\.local$/ });
    console.log(`\nRemoved ${p.deletedCount.toLocaleString()} seeded listings and ${u.deletedCount} seeded sellers.\n`);
    await mongoose.disconnect();
    return;
  }

  if (config.statsOnly) {
    await printStats(db);
    console.log('');
    await mongoose.disconnect();
    return;
  }

  // Sellers first — listings reference them, and the list endpoint populates them.
  const existing = await users.find({ email: /@loadtest\.local$/ }, { projection: { _id: 1 } }).toArray();
  let sellerIds = existing.map(u => u._id);
  if (sellerIds.length < config.sellers) {
    const toCreate = Array.from({ length: config.sellers - sellerIds.length }, (_, i) => makeSeller(sellerIds.length + i));
    const res = await users.insertMany(toCreate, { ordered: false });
    sellerIds = sellerIds.concat(Object.values(res.insertedIds));
  }
  console.log(`Sellers ready: ${sellerIds.length}`);

  const startedAt = Date.now();
  let inserted = 0;
  for (let start = 0; start < config.count; start += config.batch) {
    const size = Math.min(config.batch, config.count - start);
    const docs = Array.from({ length: size }, (_, n) => makeProperty(start + n, sellerIds));
    try {
      await properties.insertMany(docs, { ordered: false });
      inserted += size;
    } catch (err) {
      // Duplicate sourceListingId on a re-run is expected; keep going.
      inserted += err?.result?.insertedCount ?? 0;
    }
    const elapsed = (Date.now() - startedAt) / 1000;
    process.stdout.write(
      `\r  inserted ${(start + size).toLocaleString()} / ${config.count.toLocaleString()} ` +
      `(${Math.round((start + size) / elapsed).toLocaleString()} docs/s)   `
    );
  }
  const seconds = (Date.now() - startedAt) / 1000;
  console.log(`\n\nInserted ${inserted.toLocaleString()} listings in ${seconds.toFixed(0)}s (${Math.round(inserted / seconds).toLocaleString()} docs/s).`);
  console.log('Write throughput here is also your bulk-ingest ceiling — every listing maintains all indexes on the collection.');

  await printStats(db);

  console.log('\nNext:');
  console.log('  node loadtest/explain-queries.mjs --uri "<uri>"       # which index does the listing query use?');
  console.log('  node loadtest/run.mjs --vus 100 --duration 120 --vary-ip');
  console.log('  node loadtest/seed-scale.mjs --uri "<uri>" --cleanup  # remove the seeded data\n');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(`\nFailed: ${err.message}\n`);
  try { await mongoose.disconnect(); } catch { /* already down */ }
  process.exit(1);
});
