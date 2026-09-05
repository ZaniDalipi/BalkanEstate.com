/**
 * Pre-flight check for the Bunny.net setup.
 *
 * Uploads one small throwaway image, exercises every path the app depends on,
 * then deletes it. Run this before wiring the app up — each of these fails in a
 * way that is hard to read from the application side:
 *
 *  - Wrong storage region: the API 401s, which looks like a bad password.
 *  - Pull zone pointed at a different origin: uploads succeed and images 404.
 *  - Optimizer off: everything "works", and every visitor silently downloads
 *    the full-size master instead of a thumbnail.
 *  - Token auth not actually enabled on the private zone: signed URLs work, and
 *    so do unsigned ones — ID documents readable by anyone with the path.
 *
 * Usage:
 *   cd backend && npm run check:bunny
 *
 * Reads the same environment variables as the server. Writes and deletes one
 * object under `balkan-estate/_setup-check/`; touches nothing else.
 */

import 'dotenv/config';
import crypto from 'crypto';
import sharp from 'sharp';
import {
  BUNNY_STORAGE_ZONE,
  BUNNY_PULL_ZONE_HOST,
  BUNNY_PRIVATE_PULL_ZONE_HOST,
  BUNNY_TOKEN_AUTH_KEY,
  BUNNY_STORAGE_BASE_URL,
  isBunnyConfigured,
} from '../config/bunny';
import { putObject, getObject, deleteObject } from '../services/bunnyStorageService';
import { buildBunnyUrl, signBunnyUrl } from '../utils/bunnyUrl';

/** Dimensions of the probe image. Chosen so a resize is unmistakable. */
const PROBE_WIDTH = 600;
const PROBE_HEIGHT = 400;
const RESIZE_TO = 50;

const results: Array<{ ok: boolean; label: string; detail?: string }> = [];

const pass = (label: string, detail?: string) => {
  results.push({ ok: true, label, detail });
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
};

const fail = (label: string, detail: string) => {
  results.push({ ok: false, label, detail });
  console.log(`  ✗ ${label}\n      ${detail}`);
};

/**
 * Fetch a URL, retrying briefly.
 *
 * The first request for a freshly uploaded object can miss while the edge pulls
 * it from storage, so a single 404 here would be a false alarm.
 */
const fetchWithRetry = async (url: string, attempts = 4): Promise<Response> => {
  let last: Response | undefined;
  for (let i = 0; i < attempts; i++) {
    last = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20_000) });
    if (last.ok || last.status === 403) return last;
    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
  }
  return last!;
};

const main = async (): Promise<void> => {
  console.log('\nBunny.net setup check\n');

  // ── Configuration ──────────────────────────────────────────────────────────
  console.log('Configuration');
  if (!isBunnyConfigured()) {
    fail(
      'required variables are set',
      'Missing one of BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD, BUNNY_PULL_ZONE_HOST. ' +
      'See docs/setup/backend/BUNNY_SETUP.md',
    );
    console.log('\nCannot continue without credentials.\n');
    process.exit(1);
  }
  pass('required variables are set');
  console.log(`      storage : ${BUNNY_STORAGE_BASE_URL}`);
  console.log(`      cdn     : https://${BUNNY_PULL_ZONE_HOST}`);
  console.log(
    `      private : ${BUNNY_PRIVATE_PULL_ZONE_HOST || '(not configured — document uploads will be refused)'}`,
  );

  const probePath = `balkan-estate/_setup-check/${crypto.randomBytes(8).toString('hex')}.jpg`;
  let uploaded = false;

  try {
    // A plain JPEG, not WebP: it makes the Optimizer's format negotiation
    // observable further down, since a WebP master would come back as WebP
    // whether or not anything transformed it.
    const probe = await sharp({
      create: {
        width: PROBE_WIDTH,
        height: PROBE_HEIGHT,
        channels: 3,
        background: { r: 40, g: 90, b: 160 },
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    // ── Storage ──────────────────────────────────────────────────────────────
    console.log('\nStorage zone');
    try {
      await putObject(probePath, probe, 'image/jpeg');
      uploaded = true;
      pass('upload', `${Math.round(probe.length / 1024)}KB to ${BUNNY_STORAGE_ZONE}`);
    } catch (error: any) {
      fail(
        'upload',
        `${error.message}\n      A 401 here usually means BUNNY_STORAGE_REGION does not match the zone's region, ` +
        'not a wrong password.',
      );
      throw error;
    }

    const readBack = await getObject(probePath);
    if (readBack && readBack.length === probe.length) {
      pass('read back');
    } else {
      fail('read back', readBack ? 'byte length differs from what was uploaded' : 'object not found');
    }

    // ── Delivery ─────────────────────────────────────────────────────────────
    console.log('\nPull zone (delivery)');
    const plainUrl = buildBunnyUrl(probePath);
    const plainResponse = await fetchWithRetry(plainUrl);

    if (!plainResponse.ok) {
      fail(
        'serves the uploaded object',
        `${plainResponse.status} from ${plainUrl}\n      ` +
        'The pull zone is probably not pointed at this storage zone, or BUNNY_PULL_ZONE_HOST names a different zone.',
      );
    } else {
      pass('serves the uploaded object');

      // ── Optimizer ──────────────────────────────────────────────────────────
      // The definitive test: ask for a width and measure what comes back.
      // Without Optimizer the request succeeds and returns the full-size
      // original, which is exactly the silent, expensive failure mode.
      const resizedUrl = buildBunnyUrl(probePath, { width: RESIZE_TO });
      const resized = await fetchWithRetry(resizedUrl);

      if (!resized.ok) {
        fail('Optimizer', `${resized.status} requesting ${resizedUrl}`);
      } else {
        const body = Buffer.from(await resized.arrayBuffer());
        const meta = await sharp(body).metadata().catch(() => null);

        if (meta?.width === RESIZE_TO) {
          pass('Optimizer resizes', `${PROBE_WIDTH}px → ${meta.width}px, ${meta.format}`);
        } else if (meta?.width === PROBE_WIDTH) {
          fail(
            'Optimizer resizes',
            'The image came back at full size, so Bunny Optimizer is OFF for this pull zone. ' +
            'Every visitor would download full-resolution masters. ' +
            'Enable it: dashboard → the pull zone → Optimizer.',
          );
        } else {
          fail('Optimizer resizes', `Unexpected width back: ${meta?.width ?? 'unreadable'}`);
        }
      }
    }

    // ── Private zone ─────────────────────────────────────────────────────────
    console.log('\nPrivate pull zone (agent licenses and credentials)');
    if (!BUNNY_PRIVATE_PULL_ZONE_HOST || !BUNNY_TOKEN_AUTH_KEY) {
      console.log(
        '  – skipped: not configured. Public images work fine without it, but uploading\n' +
        '      a license or credential document will be refused rather than stored\n' +
        '      behind a publicly readable URL.',
      );
    } else {
      const signed = signBunnyUrl(probePath, 300);
      const signedResponse = await fetchWithRetry(signed);

      if (signedResponse.ok) {
        pass('signed URL is accepted');
      } else {
        fail(
          'signed URL is accepted',
          `${signedResponse.status}. BUNNY_TOKEN_AUTH_KEY probably does not match this zone's key.`,
        );
      }

      // The security-critical half: the same path without a token must be refused.
      const unsignedResponse = await fetchWithRetry(
        `https://${BUNNY_PRIVATE_PULL_ZONE_HOST}/${probePath}`,
        2,
      );

      if (unsignedResponse.status === 403) {
        pass('unsigned URL is refused');
      } else {
        fail(
          'unsigned URL is refused',
          `Got ${unsignedResponse.status}, expected 403. Token Authentication is NOT enabled on this zone — ` +
          'ID documents would be readable by anyone who guessed the path. ' +
          'Enable it: dashboard → the private pull zone → Security → Token Authentication.',
        );
      }
    }
  } finally {
    if (uploaded) {
      await deleteObject(probePath).catch(() => undefined);
      console.log(`\nCleaned up ${probePath}`);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const failures = results.filter(r => !r.ok);
  console.log('\n─────────────────────────────');
  if (failures.length === 0) {
    console.log(`All ${results.length} checks passed. Bunny is ready.\n`);
    return;
  }
  console.log(`${failures.length} of ${results.length} checks failed:\n`);
  failures.forEach(f => console.log(`  ✗ ${f.label}`));
  console.log('');
  process.exit(1);
};

main().catch((error) => {
  console.error(`\n${error.message}\n`);
  process.exit(1);
});
