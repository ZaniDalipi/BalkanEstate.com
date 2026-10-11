/**
 * seedCityImages.ts
 *
 * Fetches a representative image for each of the 89 featured cities from
 * Wikipedia / Wikimedia Commons and stores it in R2 where getCityImageUrl
 * (config/mediaConfig.ts) looks for it:
 *
 *   cities/convention/city-{country}-{city}/   (all sizes, + a MediaAsset record)
 *
 * Usage:
 *   npx ts-node backend/src/scripts/seedCityImages.ts            # skip existing
 *   npx ts-node backend/src/scripts/seedCityImages.ts --force    # overwrite all
 *   npx ts-node backend/src/scripts/seedCityImages.ts Athens,Greece  # single city
 */

import '../config/loadEnv';

import mongoose from 'mongoose';
import sharp from 'sharp';
import axios from 'axios';
import { isR2Enabled } from '../config/r2';
import { CITY_CONVENTION_FOLDER } from '../config/mediaVariants';
import MediaAsset from '../models/MediaAsset';
import { storeImage } from '../services/media/r2MediaStore';

const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 2500;

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeName(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function publicId(city: string, country: string): string {
  return `city-${normalizeName(country)}-${normalizeName(city)}`;
}

const HTTP = axios.create({
  timeout: 10000,
  headers: { 'User-Agent': 'BalkanEstate Research Bot/1.0' },
});

// ── All 89 featured cities ────────────────────────────────────────────────────

export const CITIES: Array<{ city: string; country: string; wikiAlt?: string }> = [
  // Kosovo
  { city: 'Prishtina', country: 'Kosovo', wikiAlt: 'Pristina' },
  { city: 'Prizren', country: 'Kosovo' },
  { city: 'Peja', country: 'Kosovo' },
  { city: 'Gjakova', country: 'Kosovo' },
  { city: 'Ferizaj', country: 'Kosovo' },
  { city: 'Mitrovica', country: 'Kosovo', wikiAlt: 'Mitrovicë' },
  { city: 'Gjilan', country: 'Kosovo' },
  // Albania
  { city: 'Tirana', country: 'Albania' },
  { city: 'Durres', country: 'Albania', wikiAlt: 'Durrës' },
  { city: 'Vlore', country: 'Albania', wikiAlt: 'Vlorë' },
  { city: 'Sarande', country: 'Albania', wikiAlt: 'Sarandë' },
  { city: 'Shkoder', country: 'Albania', wikiAlt: 'Shkodër' },
  { city: 'Fier', country: 'Albania' },
  { city: 'Berat', country: 'Albania' },
  { city: 'Elbasan', country: 'Albania' },
  { city: 'Korce', country: 'Albania', wikiAlt: 'Korçë' },
  // North Macedonia
  { city: 'Skopje', country: 'North Macedonia' },
  { city: 'Ohrid', country: 'North Macedonia' },
  { city: 'Bitola', country: 'North Macedonia' },
  { city: 'Tetovo', country: 'North Macedonia' },
  { city: 'Kumanovo', country: 'North Macedonia' },
  { city: 'Veles', country: 'North Macedonia', wikiAlt: 'Veles, North Macedonia' },
  { city: 'Strumica', country: 'North Macedonia' },
  { city: 'Kavadarci', country: 'North Macedonia' },
  // Serbia
  { city: 'Belgrade', country: 'Serbia' },
  { city: 'Novi Sad', country: 'Serbia' },
  { city: 'Nis', country: 'Serbia', wikiAlt: 'Niš' },
  { city: 'Kragujevac', country: 'Serbia' },
  { city: 'Subotica', country: 'Serbia' },
  { city: 'Zrenjanin', country: 'Serbia' },
  { city: 'Pancevo', country: 'Serbia', wikiAlt: 'Pančevo' },
  { city: 'Cacak', country: 'Serbia', wikiAlt: 'Čačak' },
  { city: 'Valjevo', country: 'Serbia' },
  { city: 'Smederevo', country: 'Serbia' },
  // Bosnia and Herzegovina
  { city: 'Sarajevo', country: 'Bosnia and Herzegovina' },
  { city: 'Banja Luka', country: 'Bosnia and Herzegovina' },
  { city: 'Mostar', country: 'Bosnia and Herzegovina' },
  { city: 'Tuzla', country: 'Bosnia and Herzegovina' },
  { city: 'Zenica', country: 'Bosnia and Herzegovina' },
  { city: 'Trebinje', country: 'Bosnia and Herzegovina' },
  { city: 'Bijeljina', country: 'Bosnia and Herzegovina' },
  { city: 'Brcko', country: 'Bosnia and Herzegovina', wikiAlt: 'Brčko' },
  // Croatia
  { city: 'Zagreb', country: 'Croatia' },
  { city: 'Split', country: 'Croatia' },
  { city: 'Dubrovnik', country: 'Croatia' },
  { city: 'Rijeka', country: 'Croatia' },
  { city: 'Osijek', country: 'Croatia' },
  { city: 'Zadar', country: 'Croatia' },
  { city: 'Pula', country: 'Croatia' },
  { city: 'Sibenik', country: 'Croatia', wikiAlt: 'Šibenik' },
  { city: 'Varazdin', country: 'Croatia', wikiAlt: 'Varaždin' },
  { city: 'Slavonski Brod', country: 'Croatia' },
  // Montenegro
  { city: 'Podgorica', country: 'Montenegro' },
  { city: 'Budva', country: 'Montenegro' },
  { city: 'Kotor', country: 'Montenegro' },
  { city: 'Niksic', country: 'Montenegro', wikiAlt: 'Nikšić' },
  { city: 'Herceg Novi', country: 'Montenegro' },
  { city: 'Bar', country: 'Montenegro', wikiAlt: 'Bar, Montenegro' },
  { city: 'Ulcinj', country: 'Montenegro' },
  { city: 'Tivat', country: 'Montenegro' },
  // Greece
  { city: 'Athens', country: 'Greece' },
  { city: 'Thessaloniki', country: 'Greece' },
  { city: 'Patras', country: 'Greece' },
  { city: 'Heraklion', country: 'Greece' },
  { city: 'Volos', country: 'Greece' },
  { city: 'Larissa', country: 'Greece' },
  { city: 'Ioannina', country: 'Greece' },
  { city: 'Kavala', country: 'Greece' },
  { city: 'Chania', country: 'Greece' },
  { city: 'Rhodes', country: 'Greece', wikiAlt: 'Rhodes (city)' },
  // Bulgaria
  { city: 'Sofia', country: 'Bulgaria' },
  { city: 'Plovdiv', country: 'Bulgaria' },
  { city: 'Varna', country: 'Bulgaria' },
  { city: 'Burgas', country: 'Bulgaria' },
  { city: 'Stara Zagora', country: 'Bulgaria' },
  { city: 'Pleven', country: 'Bulgaria' },
  { city: 'Ruse', country: 'Bulgaria' },
  { city: 'Sliven', country: 'Bulgaria' },
  { city: 'Dobrich', country: 'Bulgaria' },
  // Romania
  { city: 'Bucharest', country: 'Romania' },
  { city: 'Cluj-Napoca', country: 'Romania' },
  { city: 'Timisoara', country: 'Romania', wikiAlt: 'Timișoara' },
  { city: 'Brasov', country: 'Romania', wikiAlt: 'Brașov' },
  { city: 'Iasi', country: 'Romania', wikiAlt: 'Iași' },
  { city: 'Constanta', country: 'Romania', wikiAlt: 'Constanța' },
  { city: 'Galati', country: 'Romania', wikiAlt: 'Galați' },
  { city: 'Craiova', country: 'Romania' },
  { city: 'Ploiesti', country: 'Romania', wikiAlt: 'Ploiești' },
  { city: 'Oradea', country: 'Romania' },
];

// ── Image source fetching ─────────────────────────────────────────────────────

async function fetchWikiImageUrl(searchTerm: string): Promise<string | null> {
  try {
    const res = await HTTP.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`
    );
    return (res.data?.thumbnail?.source ?? res.data?.originalimage?.source ?? null) as string | null;
  } catch {
    return null;
  }
}

async function fetchCommonsImageUrl(city: string, country: string): Promise<string | null> {
  const queries = [`${city} ${country} skyline`, `${city} city center`, city];
  for (const q of queries) {
    try {
      const res = await HTTP.get('https://commons.wikimedia.org/w/api.php', {
        params: {
          action: 'query',
          generator: 'search',
          gsrsearch: `filetype:bitmap ${q}`,
          gsrnamespace: 6,
          gsrlimit: 5,
          prop: 'imageinfo',
          iiprop: 'url|size',
          iiurlwidth: 1200,
          format: 'json',
          origin: '*',
        },
      });
      const pages = Object.values((res.data?.query?.pages ?? {}) as Record<string, { title: string; imageinfo?: Array<{ thumburl: string; url: string; width: number; height: number }> }>);
      const valid = pages.filter(p => {
        const title = (p.title ?? '').toLowerCase();
        const info = p.imageinfo?.[0];
        return info && info.width > 400 && info.height > 300
          && !/(flag|map|coat|logo|emblem|locator|seal|plan)/.test(title);
      });
      if (valid.length > 0) {
        return valid[0].imageinfo![0].thumburl ?? valid[0].imageinfo![0].url;
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ── Storage ───────────────────────────────────────────────────────────────────

/** The R2 key the frontend builds for a convention city photo. */
export const conventionKey = (pid: string): string => `${CITY_CONVENTION_FOLDER}/${pid}`;

/** 1200×800, cropped toward the interesting part, never enlarged. */
const FRAME_WIDTH = 1200;
const FRAME_HEIGHT = 800;

async function imageExists(pid: string): Promise<boolean> {
  return Boolean(await MediaAsset.exists({ key: conventionKey(pid) }));
}

async function storeInR2(imageUrl: string, pid: string): Promise<boolean> {
  try {
    const res = await HTTP.get<ArrayBuffer>(imageUrl, { responseType: 'arraybuffer', maxContentLength: 25 * 1024 * 1024 });
    const framed = await sharp(Buffer.from(res.data), { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(FRAME_WIDTH, FRAME_HEIGHT, { fit: 'cover', position: sharp.strategy.attention, withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
    await storeImage(framed, {
      kind: 'city',
      context: {},
      key: conventionKey(pid),
      master: { preserveQuality: true },
      source: { url: imageUrl },
    });
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ R2 upload failed: ${msg}`);
    return false;
  }
}

async function uploadFromUrl(imageUrl: string, pid: string): Promise<boolean> {
  if (!isR2Enabled()) {
    console.error('  ✗ R2 is not configured (R2_* in backend/.env)');
    return false;
  }
  return storeInR2(imageUrl, pid);
}

// ── Main seed function ────────────────────────────────────────────────────────

export async function seedCityImages(
  force = false,
  only?: string
): Promise<{ ok: number; skipped: number; failed: number }> {
  const targets = only
    ? CITIES.filter(c => `${c.city},${c.country}`.toLowerCase() === only.toLowerCase())
    : CITIES;

  let ok = 0, skipped = 0, failed = 0;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async ({ city, country, wikiAlt }) => {
      const pid = publicId(city, country);

      if (!force && await imageExists(pid)) {
        console.log(`  ⏩  ${city}, ${country}`);
        skipped++;
        return;
      }

      console.log(`  ⬇  ${city}, ${country} ...`);

      let url: string | null = null;

      // 1. Wikipedia REST API (primary name)
      url = await fetchWikiImageUrl(city);

      // 2. Try alternative Wikipedia title
      if (!url && wikiAlt) url = await fetchWikiImageUrl(wikiAlt);

      // 3. Try "City, Country" on Wikipedia
      if (!url) url = await fetchWikiImageUrl(`${city}, ${country}`);

      // 4. Wikimedia Commons search
      if (!url) url = await fetchCommonsImageUrl(city, country);

      if (!url) {
        console.error(`  ✗  No image found for ${city}, ${country}`);
        failed++;
        return;
      }

      const uploaded = await uploadFromUrl(url, pid);
      if (uploaded) {
        console.log(`  ✓  ${city}, ${country} → ${pid}`);
        ok++;
      } else {
        failed++;
      }
    }));

    if (i + BATCH_SIZE < targets.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return { ok, skipped, failed };
}

// ── CLI entry point ───────────────────────────────────────────────────────────

if (require.main === module) {
  const force = process.argv.includes('--force');
  const only = process.argv.find(a => a.includes(',') && !a.startsWith('--'));

  console.log(`\nSeed city images — ${force ? 'force mode' : 'skip existing'}${only ? ` — only: ${only}` : ''}\n`);

  // Each photo is recorded in MediaAsset, so the CLI needs the database too.
  const connect = (async () => {
    if (!isR2Enabled()) throw new Error('R2 is not configured (R2_* in backend/.env)');
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
    await mongoose.connect(process.env.MONGODB_URI);
  })();

  connect.then(() => seedCityImages(force, only)).then(async ({ ok, skipped, failed }) => {
    console.log(`\n✅  Done: ${ok} uploaded  ${skipped} skipped  ${failed} failed `);
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
