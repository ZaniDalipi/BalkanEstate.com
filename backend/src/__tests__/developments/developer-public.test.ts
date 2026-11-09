/**
 * GET /api/developments/:slug/developer — the company behind a residence and
 * its other residences: only the same account's published residences that
 * name the same builder, with no account ids or storage keys.
 */
import request from 'supertest';
import { createDevelopment } from '../../services/developments/developmentService';
import { setResidenceStatus } from '../../services/developments/billing/residenceBillingService';
import { buildApp, setupDevelopment, makeUser, encodeId } from './helpers/explorerHarness';

const app = buildApp();
const PUB = '/api/developments';

const allStrings = (v: unknown, out: string[] = []): string[] => {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => allStrings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => allStrings(x, out));
  return out;
};

const residence = async (owner: unknown, name: string, builder: string | undefined, publish = true) => {
  const dev = await createDevelopment({ name, country: 'Montenegro', city: 'Bar', category: 'apartment_building' }, owner as never);
  if (builder) {
    dev.builder = { name: builder };
    await dev.save();
  }
  if (publish) await setResidenceStatus(dev, 'published');
  return dev;
};

describe('GET /:slug/developer', () => {
  it('shows the builder and its other published residences from the same account, nothing else', async () => {
    const t = await setupDevelopment({ published: true });
    t.dev.builder = { name: 'Balkan Build', about: 'Since 1998.', logo: { url: 'https://media.test/logo.webp', publicId: 'developments/secret/logo' } } as never;
    await t.dev.save();
    const sister = await residence(t.owner, 'Sea Gate', '  balkan BUILD ');
    await residence(t.owner, 'Draft Park', 'Balkan Build', false);
    await residence(t.owner, 'Other Co Tower', 'Other Co');
    // Another account naming the same company is not that company's residence.
    await residence(await makeUser(), 'Lookalike', 'Balkan Build');

    const res = await request(app).get(`${PUB}/${t.dev.slug}/developer`);
    expect(res.status).toBe(200);
    expect(res.body.builder).toMatchObject({ name: 'Balkan Build', about: 'Since 1998.', logo: { url: 'https://media.test/logo.webp' } });
    // This residence first, then the company's other published ones from the same account.
    expect(res.body.residences.map((r: { slug: string }) => r.slug)).toEqual([t.dev.slug, sister.slug]);
    const strings = allStrings(res.body);
    expect(strings).not.toContain('developments/secret/logo');
    expect(strings).not.toContain(String(t.owner._id));
    expect(strings).not.toContain(encodeId(String(t.owner._id)));
    expect(JSON.stringify(res.body)).not.toMatch(/ownerId|agencyId|publicId/);
  });

  it('is a 404 for a residence without a builder, or one that is not published', async () => {
    const t = await setupDevelopment({ published: true });
    const none = await request(app).get(`${PUB}/${t.dev.slug}/developer`);
    expect(none.status).toBe(404);
    expect(none.body.code).toBe('BUILDER_NOT_FOUND');

    const draft = await residence(t.owner, 'Hidden Hill', 'Balkan Build', false);
    const hidden = await request(app).get(`${PUB}/${draft.slug}/developer`);
    expect(hidden.status).toBe(404);
    expect(hidden.body.code).toBe('RESIDENCE_NOT_FOUND');
  });
});
