#!/usr/bin/env node
/**
 * Fails when a lockfile would install a package from anywhere but the public
 * npm registry over https with an integrity hash. See lib/lockfile-sources.mjs.
 *
 *   node scripts/check-lockfiles.mjs [lockfile ...]
 *
 * With no arguments it checks the frontend and backend lockfiles.
 */
import { readFileSync } from 'node:fs';
import { findUntrustedSources } from './lib/lockfile-sources.mjs';

const files = process.argv.slice(2);
if (files.length === 0) files.push('package-lock.json', 'backend/package-lock.json');

let failed = false;
for (const file of files) {
  const problems = findUntrustedSources(JSON.parse(readFileSync(file, 'utf8')));
  if (problems.length === 0) {
    console.log(`✓ ${file}: every package comes from the npm registry with an integrity hash`);
    continue;
  }
  failed = true;
  console.error(`✗ ${file}: ${problems.length} package(s) from an untrusted source`);
  for (const { name, reason } of problems) console.error(`  - ${name}: ${reason}`);
}
process.exit(failed ? 1 : 0);
