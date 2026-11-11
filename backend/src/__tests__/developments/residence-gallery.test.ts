/** The residence photo gallery: up to 15 photos in R2, removed and reordered with codes, public without storage keys. */
import request from 'supertest';
import Development from '../../models/Development';
import { isGalleryPermutation } from '../../services/developments/residenceGallery';
import { addMember, buildApp, setupDevelopment } from './helpers/explorerHarness';

jest.mock('../../services/mediaService', () => {
  const actual = jest.requireActual('../../services/mediaService');
  return {
    ...actual,
    isMediaStorageConfigured: jest.fn(() => true),
    uploadImage: jest.fn(async (_buf: Buffer, opts: { type: string }) => {
      const key = Math.random().toString(36).slice(2);
      return { url: `https://cdn.example.com/${opts.type}-${key}.webp`, publicId: `developments/x/gallery/${key}`, width: 2400, height: 1600 };
    }),
    deleteImage: jest.fn(async () => undefined),
  };
});
// eslint-disable-next-line @typescript-eslint/no-var-requires
const media = require('../../services/mediaService');

const app = buildApp();
const DASH = '/api/dashboard/developments';
const PUB = '/api/developments';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f80f00000101000518d84e0000000049454e44ae426082', 'hex');

const upload = (url: string, token: string, n: number) => {
  let r = request(app).post(url).set(auth(token));
  for (let i = 0; i < n; i += 1) r = r.attach('images', PNG, { filename: `p${i}.png`, contentType: 'image/png' });
  return r;
};

describe('isGalleryPermutation', () => {
  it('accepts the same photos in any order, nothing else', () => {
    const g = [{ url: 'a' }, { url: 'b' }, { url: 'c' }];
    expect(isGalleryPermutation(['c', 'a', 'b'], g)).toBe(true);
    expect(isGalleryPermutation(['a', 'b'], g)).toBe(false);
    expect(isGalleryPermutation(['a', 'a', 'b'], g)).toBe(false);
    expect(isGalleryPermutation(['a', 'b', 'x'], g)).toBe(false);
    expect(isGalleryPermutation('a,b,c', g)).toBe(false);
  });
});

describe('residence gallery', () => {
  it('adds photos to R2, reorders and removes them, and shows them to buyers without storage keys', async () => {
    const t = await setupDevelopment({ published: true });
    const url = `${DASH}/${t.devEnc}/gallery`;

    const added = await upload(url, t.ownerToken, 3);
    expect(added.status).toBe(201);
    expect(added.body.development.gallery).toHaveLength(3);
    expect(media.uploadImage).toHaveBeenLastCalledWith(expect.any(Buffer), expect.objectContaining({ type: 'development-gallery', maxWidth: 2400 }));

    const urls: string[] = added.body.development.gallery.map((p: { url: string }) => p.url);
    const reordered = await request(app).patch(`${url}/order`).set(auth(t.ownerToken)).send({ urls: [urls[2], urls[0], urls[1]] });
    expect(reordered.status).toBe(200);
    expect(reordered.body.development.gallery.map((p: { url: string }) => p.url)).toEqual([urls[2], urls[0], urls[1]]);

    const bad = await request(app).patch(`${url}/order`).set(auth(t.ownerToken)).send({ urls: [urls[0], urls[1]] });
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ code: 'GALLERY_ORDER_INVALID', details: { field: 'urls' } });

    media.deleteImage.mockClear();
    const removed = await request(app).delete(`${url}/0`).set(auth(t.ownerToken));
    expect(removed.status).toBe(200);
    expect(removed.body.development.gallery.map((p: { url: string }) => p.url)).toEqual([urls[0], urls[1]]);
    expect(media.deleteImage).toHaveBeenCalledTimes(1);
    expect((await request(app).delete(`${url}/9`).set(auth(t.ownerToken))).body.code).toBe('IMAGE_NOT_FOUND');

    const pub = await request(app).get(`${PUB}/${t.dev.slug}`);
    expect(pub.body.development.gallery).toEqual([
      { url: urls[0], width: 2400, height: 1600 },
      { url: urls[1], width: 2400, height: 1600 },
    ]);
    expect(JSON.stringify(pub.body)).not.toContain('developments/x/gallery');
  });

  it('holds at most 15 photos, saying how many more fit', async () => {
    const t = await setupDevelopment();
    const url = `${DASH}/${t.devEnc}/gallery`;
    expect((await upload(url, t.ownerToken, 10)).status).toBe(201);
    const over = await upload(url, t.ownerToken, 6);
    expect(over.status).toBe(400);
    expect(over.body).toMatchObject({ code: 'RESIDENCE_GALLERY_FULL', details: { params: { max: 15, remaining: 5 } } });
    expect((await upload(url, t.ownerToken, 5)).status).toBe(201);
    expect((await Development.findById(t.devId).lean())?.gallery).toHaveLength(15);
    expect((await upload(url, t.ownerToken, 1)).body.details.params).toMatchObject({ remaining: 0 });
  });

  it('refuses no file, too many at once, a non-picture, unavailable storage and viewers — each with its code', async () => {
    const t = await setupDevelopment();
    const url = `${DASH}/${t.devEnc}/gallery`;
    expect((await request(app).post(url).set(auth(t.ownerToken))).body.code).toBe('NO_IMAGES');
    expect((await upload(url, t.ownerToken, 11)).body.code).toBe('LIMIT_FILE_COUNT');
    const svg = await request(app).post(url).set(auth(t.ownerToken)).attach('images', Buffer.from('<svg/>'), { filename: 'x.svg', contentType: 'image/svg+xml' });
    expect(svg.body.code).toBe('IMAGE_TYPE');
    media.isMediaStorageConfigured.mockReturnValueOnce(false);
    const off = await upload(url, t.ownerToken, 1);
    expect(off.status).toBe(503);
    expect(off.body.code).toBe('STORAGE_NOT_CONFIGURED');
    const viewer = await addMember(t.devId, 'viewer');
    expect((await upload(url, viewer.token, 1)).status).toBe(403);
    expect((await request(app).patch(`${url}/order`).set(auth(viewer.token)).send({ urls: [] })).status).toBe(403);
  });
});

describe('preview photo in the residence list', () => {
  it('uses the cover, else the first gallery photo, else the first published picture of the residence', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DevelopmentScene = require('../../models/DevelopmentScene').default;
    const a = await setupDevelopment({ published: true, name: 'Preview A' });
    const b = await setupDevelopment({ published: true, name: 'Preview B' });
    const c = await setupDevelopment({ published: true, name: 'Preview C' });
    await Development.updateOne({ _id: a.devId }, { $set: { gallery: [{ url: 'https://cdn.example.com/g1.webp' }] } });
    await DevelopmentScene.create({
      developmentId: b.devId, targetType: 'development', targetId: b.devId, imageUrl: 'https://cdn.example.com/view.webp', imageWidth: 100, imageHeight: 100,
      draft: { hotspots: [], version: 1 }, published: { hotspots: [], version: 1, publishedAt: new Date() },
    });
    const res = await request(app).get(`${PUB}?limit=50`);
    expect(res.status).toBe(200);
    const by = (slug: string) => res.body.developments.find((d: { slug: string }) => d.slug === slug);
    expect(by(a.dev.slug).previewImage).toBe('https://cdn.example.com/g1.webp');
    expect(by(b.dev.slug).previewImage).toBe('https://cdn.example.com/view.webp');
    expect(by(c.dev.slug)).not.toHaveProperty('previewImage');
  });
});
