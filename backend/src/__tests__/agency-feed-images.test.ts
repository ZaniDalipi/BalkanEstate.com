/**
 * Agency property feeds — image validation, reuse and safe cleanup.
 */
import sharp from 'sharp';
import { Types } from 'mongoose';
import AgencyFeedAsset from '../models/AgencyFeedAsset';
import Property from '../models/Property';
import {
  importImages,
  mapWithConcurrency,
  sweepUnreferencedAssets,
  validateImageBuffer,
  type ImageImporterDeps,
  type ImageStore,
} from '../services/agencyFeeds/imageImporter';

const image = (width: number, height: number, format: 'png' | 'jpeg' = 'jpeg') =>
  sharp({ create: { width, height, channels: 3, background: '#88aacc' } })[format]().toBuffer();

const ctx = () => ({
  feedId: new Types.ObjectId(),
  agencyId: new Types.ObjectId(),
  sellerId: new Types.ObjectId(),
  propertyId: new Types.ObjectId(),
  propertyTitle: 'Test',
});

const memoryStore = () => {
  const saved: string[] = [];
  const removed: string[] = [];
  const store: ImageStore = {
    mode: 'rehost',
    save: async (_b, url) => {
      saved.push(url);
      return { url: `https://res.cloudinary.com/t/${saved.length}.jpg`, publicId: `p/${saved.length}` };
    },
    remove: async (id) => {
      removed.push(id);
    },
  };
  return { store, saved, removed };
};

describe('validateImageBuffer', () => {
  it('checks the real bytes, not the file name or Content-Type', async () => {
    await expect(validateImageBuffer(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).rejects.toThrow(/not a readable image|Unsupported/);
    await expect(validateImageBuffer(Buffer.from('<html><body>Login</body></html>'))).rejects.toThrow(/not a readable image/);
    await expect(validateImageBuffer(Buffer.alloc(0))).rejects.toThrow('Empty file');
  });

  it('enforces minimum dimensions and the size cap', async () => {
    await expect(validateImageBuffer(await image(100, 80))).rejects.toThrow(/too small/);
    await expect(validateImageBuffer(Buffer.alloc(16 * 1024 * 1024, 1))).rejects.toThrow(/15 MB/);
    const ok = await validateImageBuffer(await image(800, 600, 'png'));
    expect(ok).toMatchObject({ width: 800, height: 600, format: 'png' });
  });
});

describe('importImages', () => {
  it('keeps feed order, reuses stored assets and de-duplicates identical bytes', async () => {
    const c = ctx();
    const { store, saved } = memoryStore();
    const bytes = await image(640, 480);
    const downloads: string[] = [];
    const deps: ImageImporterDeps = {
      store,
      download: async (url) => {
        downloads.push(url);
        // a.jpg and b.jpg are the same photo behind two URLs
        return url.endsWith('c.jpg') ? image(640, 481) : bytes;
      },
    };
    const urls = ['https://x.example/a.jpg', 'https://x.example/b.jpg', 'https://x.example/c.jpg'];

    const first = await importImages(urls, 'photo', c, deps);
    expect(first.map((o) => o.sourceUrl)).toEqual(urls);
    expect(first.every((o) => o.ok)).toBe(true);
    expect(first[0].publicId).toBe(first[1].publicId);
    expect(saved).toHaveLength(2);

    const second = await importImages(urls, 'photo', c, deps);
    expect(second.every((o) => o.reused)).toBe(true);
    expect(downloads).toHaveLength(3);
  });

  it('limits concurrent downloads', async () => {
    let inFlight = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 12 }, (_, i) => i), 4, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
    });
    expect(peak).toBe(4);
  });
});

describe('sweepUnreferencedAssets', () => {
  it('deletes only stale imported files no listing uses any more', async () => {
    const c = ctx();
    const { store, removed } = memoryStore();
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const base = { feedId: c.feedId, agencyId: c.agencyId, status: 'stored', lastAttemptAt: old };
    await AgencyFeedAsset.create([
      { ...base, sourceUrl: 'https://x.example/unused.jpg', urlHash: 'u1', url: 'https://res.cloudinary.com/t/1.jpg', publicId: 'p/unused', lastReferencedAt: old },
      { ...base, sourceUrl: 'https://x.example/used.jpg', urlHash: 'u2', url: 'https://res.cloudinary.com/t/2.jpg', publicId: 'p/used', lastReferencedAt: old },
      { ...base, sourceUrl: 'https://x.example/fresh.jpg', urlHash: 'u3', url: 'https://res.cloudinary.com/t/3.jpg', publicId: 'p/fresh', lastReferencedAt: new Date() },
    ]);
    // A listing (possibly edited by hand) still shows "used".
    await Property.collection.insertOne({ images: [{ url: 'https://res.cloudinary.com/t/2.jpg', publicId: 'p/used', tag: 'other' }] });

    const { removed: count } = await sweepUnreferencedAssets(c.feedId, store);

    expect(count).toBe(1);
    expect(removed).toEqual(['p/unused']);
    expect(await AgencyFeedAsset.countDocuments({ feedId: c.feedId })).toBe(2);
  });
});
