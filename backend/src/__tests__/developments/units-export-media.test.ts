/**
 * CSV export (escaping + formula-injection neutralisation), unit floorplan
 * upload (media service mocked — no object storage in tests) and follower
 * alerts from the general unit edit / bulk paths.
 */
import request from 'supertest';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import DevelopmentAuditLog from '../../models/DevelopmentAuditLog';
import DevelopmentFollow from '../../models/DevelopmentFollow';
import { createUnit } from '../../services/developments/developmentInventoryService';
import { csvCell } from '../../services/developments/unitAdminService';
import { buildApp, setupDevelopment, makeListing, linkListing, makeUser } from './helpers/explorerHarness';

jest.mock('../../services/mediaService', () => {
  const actual = jest.requireActual('../../services/mediaService');
  return {
    ...actual,
    isMediaStorageConfigured: jest.fn(() => true),
    uploadImage: jest.fn(async () => ({
      url: `https://cdn.example.com/fp-${Math.random().toString(36).slice(2)}.jpg`,
      publicId: `developments/x/scenes/${Math.random().toString(36).slice(2)}`,
      width: 1200,
      height: 800,
      format: 'jpeg',
      bytes: 1000,
    })),
    deleteImage: jest.fn(async () => undefined),
  };
});

jest.mock('../../services/engagementService', () => ({
  createNotificationWithPush: jest.fn(async () => undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const media = require('../../services/mediaService');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const engagement = require('../../services/engagementService');

const app = buildApp();
const DASH = '/api/dashboard/developments';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Minimal RFC 4180 parser for asserting round-trips. */
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\r' && text[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i += 1; }
    else cell += ch;
  }
  return rows;
};

describe('csvCell', () => {
  it('neutralises formula prefixes and quotes special characters', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-2')).toBe("'-2");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('line\nbreak')).toBe('"line\nbreak"');
    expect(csvCell(12.5)).toBe('12.5');
    expect(csvCell(null)).toBe('');
  });
});

describe('GET /units/export.csv', () => {
  it('returns an attachment whose cells are escaped and formula-safe', async () => {
    const t = await setupDevelopment();
    await createUnit(t.devId, {
      buildingId: t.building._id,
      floorId: t.floor._id,
      unitNumber: '=1+1',
      unitType: 'flat, "deluxe"',
      beds: 3,
      netArea: 81.5,
    });
    const listing = await makeListing(t.owner._id, { title: '@evil', status: 'pending' });
    await linkListing(t.unit, listing._id, true);

    const res = await request(app).get(`${DASH}/${t.devEnc}/units/export.csv`).set(auth(t.ownerToken));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/^attachment; filename="[a-z0-9-]+-units\.csv"$/);

    const text = res.text.replace(/^﻿/, '');
    const rows = parseCsv(text);
    expect(rows[0][0]).toBe('Unit number');
    expect(rows[0]).toHaveLength(13);
    const a1 = rows.find((r) => r[0] === 'A1')!;
    expect(a1[10]).toBe('reserved'); // effective availability from the pending listing
    expect(a1[12]).toBe("'@evil");
    const evil = rows.find((r) => r[0] === "'=1+1")!;
    expect(evil).toBeDefined();
    expect(evil[3]).toBe('flat, "deluxe"');
    expect(evil[6]).toBe('81.5');
    // No cell anywhere starts with a raw formula trigger.
    for (const r of rows.slice(1)) for (const c of r) expect(c).not.toMatch(/^[=+\-@]/);
  });
});

describe('POST /units/:unitId/floorplan', () => {
  it('stores the floorplan, deletes the replaced image, and audits', async () => {
    const t = await setupDevelopment();
    const url = `${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}/floorplan`;
    const png = Buffer.from('89504e470d0a1a0a', 'hex');

    const first = await request(app).post(url).set(auth(t.ownerToken)).attach('floorplan', png, { filename: 'a.png', contentType: 'image/png' });
    expect(first.status).toBe(200);
    expect(first.body.unit.floorplan.url).toMatch(/^https:\/\/cdn\.example\.com\//);
    expect(first.body.unit.floorplan.width).toBe(1200);
    const firstKey = (await DevelopmentUnit.findById(t.unit._id))!.floorplan!.publicId;

    const second = await request(app).post(url).set(auth(t.ownerToken)).attach('floorplan', png, { filename: 'b.png', contentType: 'image/png' });
    expect(second.status).toBe(200);
    expect(media.deleteImage).toHaveBeenCalledWith(firstKey);
    expect(media.uploadImage.mock.calls[0][1]).toMatchObject({ type: 'development-scene', developmentId: String(t.devId) });
    expect(await DevelopmentAuditLog.countDocuments({ developmentId: t.devId, action: 'unit.update' })).toBe(2);

    const missing = await request(app).post(url).set(auth(t.ownerToken));
    expect(missing.status).toBe(400);
  });

  it('404s another development’s unit before uploading', async () => {
    const t = await setupDevelopment();
    const other = await setupDevelopment();
    media.uploadImage.mockClear();
    const res = await request(app)
      .post(`${DASH}/${t.devEnc}/units/${other.enc(other.unit._id)}/floorplan`)
      .set(auth(t.ownerToken))
      .attach('floorplan', Buffer.from('x'), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(404);
    expect(media.uploadImage).not.toHaveBeenCalled();
  });
});

describe('follower alerts from PATCH and bulk', () => {
  const flush = () => new Promise((r) => setTimeout(r, 300));

  it('alerts followers when units become available (published development only)', async () => {
    const t = await setupDevelopment({ published: true });
    const buyer = await makeUser();
    await DevelopmentFollow.create({ developmentId: t.devId, userId: buyer._id });
    const u2 = await createUnit(t.devId, { buildingId: t.building._id, floorId: t.floor._id, unitNumber: 'B2', unitType: 'apartment' });
    const u3 = await createUnit(t.devId, { buildingId: t.building._id, floorId: t.floor._id, unitNumber: 'B3', unitType: 'apartment' });
    engagement.createNotificationWithPush.mockClear();

    const patch = await request(app)
      .patch(`${DASH}/${t.devEnc}/units/${t.enc(u2._id)}`)
      .set(auth(t.ownerToken))
      .send({ availability: 'available' });
    expect(patch.status).toBe(200);
    await flush();
    expect(engagement.createNotificationWithPush).toHaveBeenCalledTimes(1);

    // Bulk: u2 already available (no alert), u3 and A1(already available) → only u3 alerts.
    engagement.createNotificationWithPush.mockClear();
    const bulk = await request(app)
      .post(`${DASH}/${t.devEnc}/units/bulk`)
      .set(auth(t.ownerToken))
      .send({ unitIds: [t.enc(t.unit._id), t.enc(u2._id), t.enc(u3._id)], availability: 'available' });
    expect(bulk.status).toBe(200);
    await flush();
    expect(engagement.createNotificationWithPush).toHaveBeenCalledTimes(1);
    expect(engagement.createNotificationWithPush.mock.calls[0][0].message).toContain('B3');
  });
});
