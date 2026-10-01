/**
 * Register the Cloudinary delivery presets as named transformations allowed
 * for strict mode. The server also does this on startup; run it by hand
 * before turning on "Strict transformations", or to check the result.
 *
 *   npm run cloudinary:sync-presets
 */
import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { syncCloudinaryPresets } from '../services/media/cloudinaryPresetSync';

async function main(): Promise<void> {
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are not set');
  }
  const r = await syncCloudinaryPresets();
  console.log(`Presets: ${r.total}`);
  console.log(`  created:            ${r.created.length}`);
  console.log(`  allowed for strict: ${r.allowed.length}`);
  console.log(`  failed:             ${r.failed.length}`);
  for (const f of r.failed) console.error(`  ✗ ${f.name}: ${f.error}`);
  if (r.failed.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
