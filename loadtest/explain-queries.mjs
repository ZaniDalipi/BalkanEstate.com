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
const COLLATION = { locale: 'en', strength: 2 };
const activeFilter = () => ({
  $or: [
    { status: 'active' },
    { status: 'sold', soldAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  ],
});

const cases = [
  {
    name: 'listing page 1 — as the API runs it (with collation)',
    filter: activeFilter(),
    sort: { createdAt: -1 },
    skip: 0,
    collation: COLLATION,
  },
  {
    name: 'listing page 1 — identical query WITHOUT collation',
    filter: activeFilter(),
    sort: { createdAt: -1 },
    skip: 0,
    collation: null,
  },
  {
    name: 'city + type filter — with collation',
    filter: { ...activeFilter(), city: 'Pristina', propertyType: 'apartment' },
    sort: { createdAt: -1 },
    skip: 0,
    collation: COLLATION,
  },
  {
    name: 'city + type filter — WITHOUT collation',
    filter: { ...activeFilter(), city: 'Pristina', propertyType: 'apartment' },
    sort: { createdAt: -1 },
    skip: 0,
    collation: null,
  },
  {
    name: 'price range + sort by price — with collation',
    filter: { ...activeFilter(), price: { $gte: 50000, $lte: 250000 } },
    sort: { price: 1 },
    skip: 0,
    collation: COLLATION,
  },
  {
    name: 'deep pagination — page 100 (skip 2000)',
    filter: activeFilter(),
    sort: { createdAt: -1 },
    skip: 100 * limit,
    collation: COLLATION,
  },
];

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
  const withCollation = results.find(r => r.name.includes('as the API runs it'));
  const withoutCollation = results.find(r => r.name.includes('WITHOUT collation'));
  if (withCollation?.collectionScan && withoutCollation && !withoutCollation.collectionScan) {
    console.log('  ✗ The .collation() on the listing query makes MongoDB ignore the indexes:');
    console.log(`    with collation    → ${withCollation.docsExamined.toLocaleString()} docs examined, ${withCollation.ms} ms`);
    console.log(`    without collation → ${withoutCollation.docsExamined.toLocaleString()} docs examined, ${withoutCollation.ms} ms`);
    console.log('    Fix: either drop .collation() and normalise city/country casing at write time,');
    console.log('    or recreate the property indexes with the same { locale: "en", strength: 2 } collation.');
  } else if (withCollation && !withCollation.collectionScan) {
    console.log('  ✓ The listing query uses an index' + (anyCollatedIndex ? ' (collation-matched).' : '.'));
  }
  const deep = results.find(r => r.name.includes('deep pagination'));
  if (deep && deep.docsExamined > limit * 10) {
    console.log(`  ✗ Deep pagination examines ${deep.docsExamined.toLocaleString()} docs to return ${deep.returned} — skip() cost grows with page number.`);
  }
  if (results.some(r => r.inMemorySort)) {
    console.log('  ✗ At least one query sorts in memory. Above 100 MB of sort data MongoDB fails the query outright.');
  }

  console.log('');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(`\nFailed: ${err.message}\n`);
  try { await mongoose.disconnect(); } catch { /* already down */ }
  process.exit(1);
});
