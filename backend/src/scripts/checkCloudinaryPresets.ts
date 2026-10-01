/**
 * Diagnose Cloudinary delivery presets in production.
 *
 * For each preset this reports (1) whether the named transformation exists and
 * is allowed for strict mode, and (2) whether a real image actually loads
 * through it — with Cloudinary's own reason (`x-cld-error`) when it doesn't.
 *
 *   npm run cloudinary:check-presets -- <any Cloudinary image URL>
 *   npm run cloudinary:check-presets -- <url> --fix   (re-run the sync first)
 */
import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import cloudinary from '../config/cloudinary';
import { buildPresetDefinitions } from '../config/cloudinaryPresets';
import { originalCloudinaryUrl } from '../utils/cloudinaryUrl';
import { syncCloudinaryPresets } from '../services/media/cloudinaryPresetSync';

interface Row {
  preset: string;
  registered: string;
  delivery: string;
}

async function registeredState(): Promise<Map<string, boolean>> {
  const state = new Map<string, boolean>();
  let cursor: string | undefined;
  do {
    const page: { transformations?: Array<{ name: string; allowed_for_strict?: boolean }>; next_cursor?: string } =
      await cloudinary.api.transformations({ named: true, max_results: 500, ...(cursor ? { next_cursor: cursor } : {}) });
    for (const t of page.transformations || []) state.set(t.name.replace(/^t_/, ''), Boolean(t.allowed_for_strict));
    cursor = page.next_cursor;
  } while (cursor);
  return state;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const sample = args.find((a) => a.startsWith('http'));
  const original = sample ? originalCloudinaryUrl(sample) : null;
  if (!original) throw new Error('Pass a Cloudinary image URL, e.g. an agency logo URL from the site.');

  if (args.includes('--fix')) {
    const r = await syncCloudinaryPresets();
    console.log(`Sync: ${r.created.length} created, ${r.allowed.length} allowed, ${r.failed.length} failed`);
    for (const f of r.failed) console.log(`  ✗ ${f.name}: ${f.error}`);
  }

  const state = await registeredState();
  const [, base, rest] = original.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/)!;

  const originalRes = await fetch(original, { method: 'GET' });
  console.log(`Original: ${originalRes.status} ${original}\n`);

  const rows: Row[] = [];
  for (const preset of Object.keys(buildPresetDefinitions())) {
    const registered = !state.has(preset) ? 'MISSING' : state.get(preset) ? 'ok' : 'NOT ALLOWED FOR STRICT';
    const url = `${base}t_${preset}/${rest}`;
    const res = await fetch(url, { method: 'GET' });
    const delivery = res.ok ? 'ok' : `${res.status} ${res.headers.get('x-cld-error') || ''}`.trim();
    rows.push({ preset, registered, delivery });
  }

  const bad = rows.filter((r) => r.registered !== 'ok' || r.delivery !== 'ok');
  console.log(`${rows.length - bad.length}/${rows.length} presets OK`);
  for (const r of bad) console.log(`  ✗ ${r.preset.padEnd(18)} registered: ${r.registered.padEnd(24)} delivery: ${r.delivery}`);
  if (bad.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
