/** The builder shown on the residence page: validated on the server, images uploaded, public without storage keys. */
import request from 'supertest';
import { normalizeBuilderText, phoneProblem } from '../../services/developments/builderProfile';
import { addMember, buildApp, setupDevelopment } from './helpers/explorerHarness';

jest.mock('../../services/mediaService', () => {
  const actual = jest.requireActual('../../services/mediaService');
  return {
    ...actual,
    isMediaStorageConfigured: jest.fn(() => true),
    uploadImage: jest.fn(async (_buf: Buffer, opts: { type: string }) => {
      const key = Math.random().toString(36).slice(2);
      return { url: `https://cdn.example.com/${opts.type}-${key}.webp`, publicId: `developments/x/builder/${key}`, width: 600, height: 600 };
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

const FULL = {
  name: 'Balkan Build Group',
  tagline: 'Building homes in Skopje since 2004',
  about: 'Family company. 18 residences delivered on time.',
  foundedYear: 2004,
  completedProjects: 18,
  licenseNumber: 'MK-GR-1182',
  website: 'https://balkanbuild.example.com',
  email: 'sales@balkanbuild.example.com',
  phone: '+389 2 123 4567',
  address: 'Bul. Partizanski Odredi 21, Skopje',
  socials: { facebook: 'https://www.facebook.com/balkanbuild', instagram: 'https://instagram.com/balkanbuild', linkedin: '', youtube: 'https://youtu.be/abc' },
};

describe('normalizeBuilderText', () => {
  it('trims and keeps only what is filled in; nothing filled in removes it', () => {
    const out = normalizeBuilderText({ ...FULL, name: '  Balkan Build Group ', socials: { ...FULL.socials } });
    expect(out).toMatchObject({ name: 'Balkan Build Group', foundedYear: 2004, socials: { facebook: FULL.socials.facebook, youtube: FULL.socials.youtube } });
    expect(out?.socials).not.toHaveProperty('linkedin');
    expect(normalizeBuilderText({ name: ' ', tagline: '' })).toBeNull();
    expect(normalizeBuilderText(null)).toBeNull();
  });
  it('accepts sensible phone numbers only', () => {
    expect(phoneProblem('+389 2 123 4567')).toBe(false);
    expect(phoneProblem('(02) 555-1234')).toBe(false);
    expect(phoneProblem('call me')).toBe(true);
    expect(phoneProblem('123')).toBe(true);
  });
});

describe('saving the builder', () => {
  const setup = async () => {
    const t = await setupDevelopment({ published: true });
    const patch = (builder: unknown) => request(app).patch(`${DASH}/${t.devEnc}`).set(auth(t.ownerToken)).send({ builder });
    return { t, patch };
  };
  const refused = async (res: request.Response, code: string, field: string, params?: Record<string, unknown>) => {
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(code);
    expect(res.body.details).toMatchObject({ field: `builder.${field}`, ...(params ? { params } : {}) });
  };

  it('saves every field and shows buyers the company (without storage keys)', async () => {
    const { t, patch } = await setup();
    const saved = await patch(FULL);
    expect(saved.status).toBe(200);
    expect(saved.body.development.builder).toMatchObject({ name: FULL.name, completedProjects: 18, phone: FULL.phone });
    const pub = await request(app).get(`${PUB}/${t.dev.slug}`);
    expect(pub.body.development.builder).toMatchObject({ name: FULL.name, tagline: FULL.tagline, website: FULL.website, socials: { instagram: FULL.socials.instagram } });
  });

  it('names the field and the problem for each bad value', async () => {
    const { patch } = await setup();
    await refused(await patch({ tagline: 'Without a name' }), 'FIELD_REQUIRED', 'name');
    await refused(await patch({ name: 'x'.repeat(121) }), 'FIELD_TOO_LONG', 'name', { max: 120 });
    await refused(await patch({ name: 'B', tagline: 'x'.repeat(161) }), 'FIELD_TOO_LONG', 'tagline', { max: 160 });
    await refused(await patch({ name: 'B', about: 'x'.repeat(3001) }), 'FIELD_TOO_LONG', 'about', { max: 3000 });
    await refused(await patch({ name: 'B', foundedYear: 1700 }), 'FIELD_RANGE', 'foundedYear', { min: 1800 });
    await refused(await patch({ name: 'B', foundedYear: new Date().getFullYear() + 1 }), 'FIELD_RANGE', 'foundedYear');
    await refused(await patch({ name: 'B', completedProjects: -1 }), 'FIELD_RANGE', 'completedProjects', { min: 0, max: 10000 });
    await refused(await patch({ name: 'B', completedProjects: 2.5 }), 'FIELD_RANGE', 'completedProjects');
    await refused(await patch({ name: 'B', website: 'javascript:alert(1)' }), 'URL_INVALID', 'website');
    await refused(await patch({ name: 'B', website: 'balkanbuild' }), 'URL_INVALID', 'website');
    await refused(await patch({ name: 'B', email: 'sales@' }), 'EMAIL_INVALID', 'email');
    await refused(await patch({ name: 'B', phone: 'call us' }), 'PHONE_INVALID', 'phone');
    await refused(await patch({ name: 'B', socials: { facebook: 'https://evil.example.com/balkanbuild' } }), 'SOCIAL_HOST', 'socials.facebook', { network: 'Facebook' });
    await refused(await patch({ name: 'B', socials: { instagram: 'instagram' } }), 'URL_INVALID', 'socials.instagram');
    await refused(await patch({ name: 'B', socials: 'nope' }), 'FIELD_INVALID', 'socials');
    await refused(await patch({ name: 42 }), 'FIELD_INVALID', 'name');
    await refused(await patch('a builder'), 'FIELD_INVALID', 'name');
  });

  it('only owners and managers may change it', async () => {
    const { t } = await setup();
    const viewer = await addMember(t.devId, 'viewer');
    const res = await request(app).patch(`${DASH}/${t.devEnc}`).set(auth(viewer.token)).send({ builder: FULL });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('logo and banner', () => {
  it('uploads, replaces (removing the old file), keeps them when the text is cleared, and removes them', async () => {
    const t = await setupDevelopment({ published: true });
    const url = (kind: string) => `${DASH}/${t.devEnc}/builder/${kind}`;
    await request(app).patch(`${DASH}/${t.devEnc}`).set(auth(t.ownerToken)).send({ builder: { name: 'Balkan Build Group' } });

    const logo = await request(app).post(url('logo')).set(auth(t.ownerToken)).attach('image', PNG, { filename: 'logo.png', contentType: 'image/png' });
    expect(logo.status).toBe(200);
    expect(logo.body.url).toMatch(/development-builder-logo/);
    const banner = await request(app).post(url('banner')).set(auth(t.ownerToken)).attach('image', PNG, { filename: 'b.png', contentType: 'image/png' });
    expect(banner.status).toBe(200);
    expect(media.uploadImage).toHaveBeenLastCalledWith(expect.any(Buffer), expect.objectContaining({ type: 'development-builder-banner', maxWidth: 1920 }));

    const firstLogoKey = logo.body.development.builder.logo.publicId;
    media.deleteImage.mockClear();
    await request(app).post(url('logo')).set(auth(t.ownerToken)).attach('image', PNG, { filename: 'logo2.png', contentType: 'image/png' });
    expect(media.deleteImage).toHaveBeenCalledWith(firstLogoKey);

    const pub = await request(app).get(`${PUB}/${t.dev.slug}`);
    expect(pub.body.development.builder.logo).toEqual({ url: expect.stringMatching(/^https:/) });
    expect(pub.body.development.builder).not.toHaveProperty('socials'); // nothing filled in
    expect(JSON.stringify(pub.body)).not.toContain('developments/x/builder');

    // Saving the text again (as the form does) keeps both images.
    const resaved = await request(app).patch(`${DASH}/${t.devEnc}`).set(auth(t.ownerToken)).send({ builder: { name: 'Balkan Build', tagline: 'New' } });
    expect(resaved.status).toBe(200);
    expect(resaved.body.development.builder.logo.url).toBeTruthy();
    expect(resaved.body.development.builder.banner.url).toBeTruthy();

    const removed = await request(app).delete(url('banner')).set(auth(t.ownerToken));
    expect(removed.status).toBe(200);
    expect(removed.body.development.builder.banner).toBeUndefined();
  });

  it('refuses an unknown kind, a missing file, a non-picture, and unavailable storage — each with its code', async () => {
    const t = await setupDevelopment();
    const url = (kind: string) => `${DASH}/${t.devEnc}/builder/${kind}`;
    const bad = await request(app).post(url('poster')).set(auth(t.ownerToken)).attach('image', PNG, { filename: 'x.png', contentType: 'image/png' });
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ code: 'FIELD_INVALID', details: { field: 'kind' } });
    expect((await request(app).post(url('logo')).set(auth(t.ownerToken))).body.code).toBe('NO_IMAGES');
    const svg = await request(app).post(url('logo')).set(auth(t.ownerToken)).attach('image', Buffer.from('<svg/>'), { filename: 'x.svg', contentType: 'image/svg+xml' });
    expect(svg.body.code).toBe('IMAGE_TYPE');
    media.isMediaStorageConfigured.mockReturnValueOnce(false);
    const off = await request(app).post(url('logo')).set(auth(t.ownerToken)).attach('image', PNG, { filename: 'x.png', contentType: 'image/png' });
    expect(off.status).toBe(503);
    expect(off.body.code).toBe('STORAGE_NOT_CONFIGURED');
    const viewer = await addMember(t.devId, 'viewer');
    expect((await request(app).post(url('logo')).set(auth(viewer.token)).attach('image', PNG, { filename: 'x.png', contentType: 'image/png' })).status).toBe(403);
  });
});
