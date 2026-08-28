#!/usr/bin/env node
/**
 * Database-side diagnostic for the listing query.
 *
 * The HTTP load test tells you *that* /api/properties is slow; this tells you
 * *why*, by running MongoDB's own explain() on the exact filter, sort and
 * collation `getProperties` builds, against your real data and real indexes.
 *
 *   MONGODB_URI="mongodb://localhost:27017/balkan-estate" node loadtest/explain-queries.mjs
 *   node loadtest/explain-queries.mjs --uri mongodb+srv://... --limit 20
 *
 * Read-only: it runs explain() and count(), and never writes.
 *
 * Uses mongoose from backend/node_modules, so run `npm install` in ./backend
 * first (no extra dependency is added for this script).
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
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

const uri = flag('uri', process.env.MONGODB_URI);
const limit = Number(flag('limit', 20));
if (!uri) {
  console.error('No connection string. Pass --uri or set MONGODB_URI.');
  process.exit(1);
}

// The listing query as propertyController.getProperties builds it.
// Note the sort: the controller always prepends `status: -1` (line 316) before
// the user's chosen ordering, so the real sort is { status: -1, lastRenewed: -1 }.
const COLLATION = { locale: 'en', strength: 2 };
const DEFAULT_SORT = { status: -1, lastRenewed: -1 };
const activeFilter = () => ({
  $or: [
    { status: 'active' },
    { status: 'sold', soldAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  ],
});

const cases = [
  {
    name: 'listing page 1 — exactly as the API runs it',
    filter: activeFilter(),
    sort: DEFAULT_SORT,
    skip: 0,
    collation: COLLATION,
  },
  {
    name: 'listing page 1 — WITHOUT collation (same sort)',
    filter: activeFilter(),
    sort: DEFAULT_SORT,
    skip: 0,
    collation: null,
  },
  {
    name: 'listing page 1 — WITHOUT the leading status sort key',
    filter: activeFilter(),
    sort: { lastRenewed: -1 },
    skip: 0,
    collation: COLLATION,
  },
  {
    name: 'listing page 1 — no collation AND no status sort key',
    filter: activeFilter(),
    sort: { lastRenewed: -1 },
    skip: 0,
    collation: null,
  },
  {
    name: 'city + type filter — as the API runs it',
    filter: { ...activeFilter(), city: 'Pristina', propertyType: 'apartment' },
    sort: DEFAULT_SORT,
    skip: 0,
    collation: COLLATION,
  },
  {
    name: 'city + type filter — WITHOUT collation',
    filter: { ...activeFilter(), city: 'Pristina', propertyType: 'apartment' },
    sort: DEFAULT_SORT,
    skip: 0,
    collation: null,
  },
  {
    name: 'sort by price (price-low)',
    filter: { ...activeFilter(), price: { $gte: 50000, $lte: 250000 } },
    sort: { status: -1, price: 1 },
    skip: 0,
    collation: COLLATION,
  },
  {
    name: 'price-per-m² filter ($expr — cannot use any index)',
    filter: {
      ...activeFilter(),
      $expr: { $and: [{ $gt: ['$sqft', 0] }, { $gte: [{ $divide: ['$price', '$sqft'] }, 1000] }] },
    },
    sort: DEFAULT_SORT,
    skip: 0,
    collation: COLLATION,
  },
  {
    name: `deep pagination — page 100 (skip ${100 * limit})`,
    filter: activeFilter(),
    sort: DEFAULT_SORT,
    skip: 100 * limit,
    collation: COLLATION,
  },
];

/**
 * Compares the indexes `Property.ts` declares against the ones the database
 * actually has.
 *
 * `initDatabase.ts` calls `syncIndexes()` per model at startup, catches any
 * error, and continues — the whole failure surfaces as a single
 * "Index sync had N warning(s)" line in the boot log. A model whose sync threw
 * partway keeps whatever indexes it already had, so schema and database drift
 * apart while everything looks healthy.
 *
 * Only the explicit `PropertySchema.index(...)` declarations are checked;
 * field-level `index: true` ones are left alone.
 */
function declaredIndexes() {
  const modelPath = path.join(here, '..', 'backend', 'src', 'models', 'Property.ts');
  let source;
  try {
    source = readFileSync(modelPath, 'utf8');
  } catch {
    return null;
  }

  const declared = [];
  const re = /PropertySchema\.index\(\s*(\{[^{}]*\})/g;
  let match;
  while ((match = re.exec(source))) {
    const literal = match[1]
      .replace(/'/g, '"')
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
      .replace(/,\s*\}/, '}');
    try {
      declared.push(JSON.parse(literal));
    } catch {
      // A declaration this regex can't handle is skipped rather than guessed at.
    }
  }
  return declared;
}

const keySignature = (key) => Object.entries(key).map(([field, dir]) => `${field}:${dir}`).join(',');

function reportIndexDrift(dbIndexes) {
  const declared = declaredIndexes();
  if (!declared || declared.length === 0) {
    console.log('\nINDEX DRIFT\n  (could not read backend/src/models/Property.ts — skipped)');
    return;
  }

  const present = new Set(dbIndexes.map(idx => keySignature(idx.key)));
  const missing = declared.filter(key => !present.has(keySignature(key)));

  console.log(`\nINDEX DRIFT — ${declared.length} declared in Property.ts, ${missing.length} missing from this database`);
  if (missing.length === 0) {
    console.log('  ✓ every declared index exists.');
    return;
  }

  for (const key of missing) {
    console.log(`  ✗ ${JSON.stringify(key)}`);
  }

  const hasText = missing.some(key => Object.values(key).includes('text'));
  if (hasText) {
    console.log('\n  ⚠ The text index is missing. `GET /api/properties?query=…` builds a $text filter,');
    console.log('    and MongoDB rejects $text outright without a text index (error 27) — keyword');
    console.log('    search is not slow here, it is broken.');
  }

  console.log('\n  `syncAllIndexes` (backend/src/utils/initDatabase.ts:126) is supposed to create these');
  console.log('  at startup. It catches the error and logs one "Index sync had N warning(s)" line, so');
  console.log('  the real reason is in the backend boot log — look there before recreating them.');
  console.log('  Run this against production too: index drift is per-database, not per-codebase.');
  console.log('  To build them (background build, safe on a live collection):');
  console.log('    db.properties.createIndexes([');
  for (const key of missing) {
    console.log(`      { key: ${JSON.stringify(key)}, name: "${keySignature(key).replace(/[:,]/g, '_')}" },`);
  }
  console.log('    ])');
  console.log('  Note: the { source, sourceListingId } index is unique — de-duplicate before creating it.');
}

/** Pulls the interesting bits out of an explain() tree. */
function summarize(explain) {
  const stats = explain.executionStats || {};
  const stages = [];
  let node = stats.executionStages;
  let indexName = null;
  let inMemorySort = false;
  while (node) {
    stages.push(node.stage);
    if (node.stage === 'IXSCAN' && !indexName) indexName = node.indexName;
    if (node.stage === 'SORT') inMemorySort = true;
    node = node.inputStage || (node.inputStages && node.inputStages[0]);
  }
  return {
    plan: stages.join(' ← ') || 'unknown',
    index: indexName,
    collectionScan: stages.includes('COLLSCAN'),
    inMemorySort,
    docsExamined: stats.totalDocsExamined ?? 0,
    keysExamined: stats.totalKeysExamined ?? 0,
    returned: stats.nReturned ?? 0,
    ms: stats.executionTimeMillis ?? 0,
    rejectedPlans: (explain.queryPlanner?.rejectedPlans || []).length,
  };
}

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const properties = db.collection('properties');

  console.log(`\nConnected to ${mongoose.connection.name}\n`);

  // ── Collection sizes ─────────────────────────────────────────────
  const collections = ['properties', 'users', 'agents', 'agencies', 'conversations', 'messages'];
  console.log('COLLECTION SIZES');
  for (const name of collections) {
    try {
      const count = await db.collection(name).estimatedDocumentCount();
      console.log(`  ${name.padEnd(16)} ${count.toLocaleString()}`);
    } catch {
      console.log(`  ${name.padEnd(16)} (not present)`);
    }
  }

  // ── Indexes ──────────────────────────────────────────────────────
  const indexes = await properties.indexes();
  console.log(`\nINDEXES ON properties (${indexes.length})`);
  let anyCollatedIndex = false;
  for (const idx of indexes) {
    const hasCollation = Boolean(idx.collation && idx.collation.locale !== 'simple');
    if (hasCollation) anyCollatedIndex = true;
    console.log(`  ${JSON.stringify(idx.key)}${hasCollation ? `  [collation: ${idx.collation.locale}/${idx.collation.strength}]` : ''}`);
  }

  reportIndexDrift(indexes);

  // ── Query plans ──────────────────────────────────────────────────
  console.log('\nQUERY PLANS');
  const results = [];
  for (const testCase of cases) {
    let cursor = properties.find(testCase.filter).sort(testCase.sort).skip(testCase.skip).limit(limit);
    if (testCase.collation) cursor = cursor.collation(testCase.collation);
    const explain = await cursor.explain('executionStats');
    const summary = summarize(explain);
    results.push({ name: testCase.name, ...summary });

    console.log(`\n  ${testCase.name}`);
    console.log(`    plan:      ${summary.plan}`);
    console.log(`    index:     ${summary.index || (summary.collectionScan ? 'NONE — full collection scan' : 'n/a')}`);
    console.log(`    examined:  ${summary.docsExamined.toLocaleString()} docs / ${summary.keysExamined.toLocaleString()} index keys → ${summary.returned} returned`);
    console.log(`    sort:      ${summary.inMemorySort ? 'in-memory (blocking SORT stage)' : 'index-provided'}`);
    console.log(`    time:      ${summary.ms} ms`);
  }

  // ── countDocuments, which the API runs alongside every filtered page ──
  const countStart = Date.now();
  const total = await properties.countDocuments(activeFilter());
  console.log(`\ncountDocuments(active filter): ${total.toLocaleString()} docs in ${Date.now() - countStart} ms`);
  console.log('  (the API runs this in parallel with every non-cursor listing request)');

  // ── Verdict ──────────────────────────────────────────────────────
  console.log('\nVERDICT');
  const asShipped = results.find(r => r.name.includes('exactly as the API runs it'));
  const noCollation = results.find(r => r.name.includes('WITHOUT collation (same sort)'));
  const noStatusSort = results.find(r => r.name.includes('WITHOUT the leading status sort'));
  const neither = results.find(r => r.name.includes('no collation AND no status sort'));

  const compare = (label, variant) => {
    if (!variant || !asShipped) return;
    const better = variant.docsExamined < asShipped.docsExamined || (asShipped.inMemorySort && !variant.inMemorySort);
    console.log(
      `  ${better ? '✗' : '·'} ${label}: ${variant.docsExamined.toLocaleString()} docs examined, ` +
      `${variant.ms} ms, sort ${variant.inMemorySort ? 'in memory' : 'from index'}` +
      (better ? '  ← cheaper than what ships' : '')
    );
  };

  console.log(
    `  Shipped query: ${asShipped?.docsExamined.toLocaleString()} docs examined to return ${asShipped?.returned}, ` +
    `${asShipped?.ms} ms, sort ${asShipped?.inMemorySort ? 'in memory (blocking)' : 'from index'}` +
    `${asShipped?.collectionScan ? ', FULL COLLECTION SCAN' : `, index ${asShipped?.index}`}`
  );
  compare('drop .collation()', noCollation);
  compare('drop the status sort key', noStatusSort);
  compare('drop both', neither);

  if (asShipped?.inMemorySort) {
    console.log('\n  ✗ The listing query sorts in memory. MongoDB caps a blocking sort at 100 MB and');
    console.log('    fails the query above that (error 292) unless disk use is enabled — so this does not');
    console.log('    degrade gracefully, it stops working once the result set is large enough.');
    console.log('    The controller always prepends `status: -1` to the sort (propertyController.ts:316);');
    console.log('    no index can serve { status: -1, lastRenewed: -1 }, and the Node-side highlighting');
    console.log('    sort re-orders the page afterwards anyway.');
  }
  if (asShipped?.collectionScan && noCollation && !noCollation.collectionScan) {
    console.log('\n  ✗ The .collation() is what stops MongoDB using the indexes. Either drop it and');
    console.log('    normalise city/country casing at write time, or recreate the property indexes');
    console.log('    with { collation: { locale: "en", strength: 2 } }.');
  }
  if (!asShipped?.collectionScan && !asShipped?.inMemorySort) {
    console.log(`  ✓ The listing query is index-served${anyCollatedIndex ? ' (collation-matched)' : ''}.`);
  }

  const expr = results.find(r => r.name.includes('$expr'));
  if (expr?.collectionScan) {
    console.log(`\n  ✗ The price-per-m² filter scans the whole collection (${expr.docsExamined.toLocaleString()} docs, ${expr.ms} ms) —`);
    console.log('    $expr with $divide can never use an index. Store price-per-m² as a real field on write.');
  }
  const deep = results.find(r => r.name.includes('deep pagination'));
  if (deep && deep.docsExamined > limit * 10) {
    console.log(`\n  ✗ Deep pagination examines ${deep.docsExamined.toLocaleString()} docs to return ${deep.returned} — skip() cost grows with page number.`);
  }

  console.log('');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(`\nFailed: ${err.message}\n`);
  try { await mongoose.disconnect(); } catch { /* already down */ }
  process.exit(1);
});
