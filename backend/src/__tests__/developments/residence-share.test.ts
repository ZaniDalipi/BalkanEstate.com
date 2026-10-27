/** Shared residence links: the share card image and the link preview. */
import http from 'http';
import type { AddressInfo } from 'net';
import express from 'express';
import request from 'supertest';
import sharp from 'sharp';
import Development from '../../models/Development';
import DevelopmentScene from '../../models/DevelopmentScene';
import { setupDevelopment } from './helpers/explorerHarness';

const app = express();
app.use('/api/og', require('../../routes/ogRoutes').default);

const BOT = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
const PERSON = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1';

let photoServer: http.Server;
let photoUrl: string;

beforeAll(async () => {
  // A plain grey 800×800 picture, served locally (allowed outside production).
  const grey = await sharp({ create: { width: 800, height: 800, channels: 3, background: '#808080' } }).png().toBuffer();
  photoServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(grey);
  });
  await new Promise<void>((resolve) => photoServer.listen(0, '127.0.0.1', resolve));
  photoUrl = `http://127.0.0.1:${(photoServer.address() as AddressInfo).port}/aerial.png`;
});
afterAll(() => new Promise<void>((resolve) => photoServer.close(() => resolve())));

describe('GET /api/og/residence/:slug/image.jpg', () => {
  it('draws the residence picture with its building marked, as a 1200×630 JPEG', async () => {
    const t = await setupDevelopment({ published: true });
    await DevelopmentScene.create({
      developmentId: t.devId,
      targetType: 'development',
      targetId: t.devId,
      viewKey: 'main',
      imageUrl: photoUrl,
      imageWidth: 800,
      imageHeight: 800,
      published: {
        version: 1,
        publishedAt: new Date(),
        hotspots: [{ id: 'a', shape: 'rect', points: [[0.3, 0.3], [0.7, 0.7]], label: 'Block A', linkType: 'building', linkId: t.enc(t.building._id), z: 0 }],
      },
    });
    const res = await request(app).get(`/api/og/residence/${t.dev.slug}/image.jpg`).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on('data', (c: Buffer) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.headers['cache-control']).toContain('max-age=3600');
    const img = sharp(res.body as Buffer);
    expect(await img.metadata()).toMatchObject({ width: 1200, height: 630, format: 'jpeg' });
    // Inside the building (card centre, above the bottom band) the grey is tinted teal;
    // outside it, at the far left, it stays grey.
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const [r, g] = px(600, 260);
    expect(g - r).toBeGreaterThan(25);
    const [r2, g2] = px(20, 260);
    expect(Math.abs(g2 - r2)).toBeLessThan(12);
  });

  it('a draft residence has no card', async () => {
    const t = await setupDevelopment();
    expect((await request(app).get(`/api/og/residence/${t.dev.slug}/image.jpg`)).status).toBe(404);
    expect((await request(app).get('/api/og/residence/..%2Fetc/image.jpg')).status).toBe(404);
  });
});

describe('GET /api/og/residence/:slug', () => {
  it('sends people to the residence page in their language', async () => {
    const t = await setupDevelopment({ published: true });
    const res = await request(app).get(`/api/og/residence/${t.dev.slug}?lang=sq`).set('User-Agent', PERSON);
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(new RegExp(`/sq/developments/${t.dev.slug}$`));
  });

  it('gives link-preview bots the title, the summary and the card', async () => {
    const t = await setupDevelopment({ published: true, name: 'Sea & Sun' });
    const res = await request(app).get(`/api/og/residence/${t.dev.slug}`).set('User-Agent', BOT);
    expect(res.status).toBe(200);
    expect(res.text).toContain('<meta property="og:title" content="Sea &amp; Sun · Budva, Montenegro" />');
    expect(res.text).toContain('1 of 1 homes available · from 150.000 €');
    expect(res.text).toMatch(new RegExp(`og:image" content="[^"]+/api/og/residence/${t.dev.slug}/image\\.jpg\\?lang=en&amp;v=\\d+"`));
    expect(res.text).toContain('summary_large_image');
  });

  it('a residence that is not public sends bots to the residences list', async () => {
    const t = await setupDevelopment({ published: true });
    await Development.updateOne({ _id: t.devId }, { $set: { visibleUntil: new Date(Date.now() - 1000) } });
    const res = await request(app).get(`/api/og/residence/${t.dev.slug}`).set('User-Agent', BOT);
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/en\/developments$/);
  });
});
