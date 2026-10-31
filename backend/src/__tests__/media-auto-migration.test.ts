/**
 * MEDIA_MIGRATE_ON_START: the Cloudinary → R2 move runs from the server once
 * in total — never twice at a time, never again after it's done, and an
 * interrupted run is picked up by the next start.
 */
process.env.R2_ACCOUNT_ID = 'acct';
process.env.R2_ACCESS_KEY_ID = 'key';
process.env.R2_SECRET_ACCESS_KEY = 'secret';
process.env.R2_BUCKET = 'media';
process.env.R2_PUBLIC_URL = 'https://media.example.com';

import mongoose from 'mongoose';
import { startAutoMediaMigration, MIGRATION_STATE_COLLECTION } from '../services/media/autoMigration';
import type { Stats, MigrationOptions } from '../scripts/migrateCloudinaryToR2';

const stats = (migrated: number): Stats => ({
  migrated,
  alreadyMigrated: 0,
  failed: [{ publicId: 'gone', error: 'HTTP 404' }],
  docsUpdated: migrated,
  byKind: { property: migrated },
  leftOnCloudinary: 0,
  accessRecordsCreated: 0,
});

const state = () => mongoose.connection.db!.collection(MIGRATION_STATE_COLLECTION).findOne({ _id: 'cloudinary-to-r2' } as any);
const quick = { startDelayMs: 0, throttleMs: 0 };

beforeEach(async () => {
  process.env.MEDIA_MIGRATE_ON_START = 'true';
  await mongoose.connection.db!.collection(MIGRATION_STATE_COLLECTION).deleteMany({});
});

afterAll(() => {
  delete process.env.MEDIA_MIGRATE_ON_START;
});

describe('startAutoMediaMigration', () => {
  it('does nothing unless switched on', async () => {
    delete process.env.MEDIA_MIGRATE_ON_START;
    const run = jest.fn(async () => stats(1));
    await startAutoMediaMigration({ ...quick, run });
    expect(run).not.toHaveBeenCalled();
    expect(await state()).toBeNull();
  });

  it('accepts the switch however the dashboard stored it', async () => {
    process.env.MEDIA_MIGRATE_ON_START = ' "TRUE" ';
    const run = jest.fn(async () => stats(1));
    await startAutoMediaMigration({ ...quick, run });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('runs once with apply + throttle, records done, and never runs again', async () => {
    const run = jest.fn(async (_o: MigrationOptions) => stats(42));
    await startAutoMediaMigration({ startDelayMs: 0, throttleMs: 150, run });
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0]).toMatchObject({ apply: true, throttleMs: 150 });

    const done = await state();
    expect(done).toMatchObject({ status: 'done', stats: { migrated: 42, failedCount: 1 } });
    expect(done!.lockedUntil).toBeUndefined();

    await startAutoMediaMigration({ ...quick, run });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('runs on only one of two instances starting together', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const run = jest.fn(async () => {
      await gate;
      return stats(3);
    });
    const first = startAutoMediaMigration({ ...quick, run });
    const second = startAutoMediaMigration({ ...quick, run });
    // Let both reach the lock before the run finishes.
    await new Promise((resolve) => setTimeout(resolve, 200));
    release();
    await Promise.all([first, second]);
    expect(run).toHaveBeenCalledTimes(1);
    expect((await state())!.status).toBe('done');
  });

  it('continues on the next start after a failure', async () => {
    const failing = jest.fn(async (): Promise<Stats> => {
      throw new Error('connection reset');
    });
    await startAutoMediaMigration({ ...quick, run: failing });
    expect(await state()).toMatchObject({ status: 'failed', error: 'connection reset' });

    const run = jest.fn(async () => stats(5));
    await startAutoMediaMigration({ ...quick, run });
    expect(run).toHaveBeenCalledTimes(1);
    expect(await state()).toMatchObject({ status: 'done', runs: 2 });
  });

  it('is not done while Cloudinary refuses downloads — the next start retries', async () => {
    const refused = jest.fn(async (): Promise<Stats> => ({
      ...stats(0),
      failed: [
        { publicId: 'a', error: 'Image download failed: HTTP 401' },
        { publicId: 'b', error: 'Image download failed: HTTP 404' },
      ],
    }));
    await startAutoMediaMigration({ ...quick, run: refused });
    expect(await state()).toMatchObject({ status: 'failed', stats: { failedCount: 2 } });

    const run = jest.fn(async () => stats(2));
    await startAutoMediaMigration({ ...quick, run });
    expect(run).toHaveBeenCalledTimes(1);
    expect((await state())!.status).toBe('done');
  });

  it('re-runs a run recorded as done although downloads were refused', async () => {
    await mongoose.connection.db!.collection(MIGRATION_STATE_COLLECTION).insertOne({
      _id: 'cloudinary-to-r2',
      status: 'done',
      stats: { migrated: 0, failedCount: 1, failed: [{ publicId: 'a', error: 'Image download failed: HTTP 401' }] },
    } as any);
    const run = jest.fn(async () => stats(4));
    await startAutoMediaMigration({ ...quick, run });
    expect(run).toHaveBeenCalledTimes(1);
    expect(await state()).toMatchObject({ status: 'done', stats: { migrated: 4 } });
  });

  it('takes over a lock whose holder died, but not a live one', async () => {
    const col = mongoose.connection.db!.collection(MIGRATION_STATE_COLLECTION);
    const run = jest.fn(async () => stats(1));

    await col.insertOne({ _id: 'cloudinary-to-r2', status: 'running', owner: 'other', lockedUntil: new Date(Date.now() + 60_000) } as any);
    await startAutoMediaMigration({ ...quick, run });
    expect(run).not.toHaveBeenCalled();

    await col.updateOne({ _id: 'cloudinary-to-r2' } as any, { $set: { lockedUntil: new Date(Date.now() - 1000) } });
    await startAutoMediaMigration({ ...quick, run });
    expect(run).toHaveBeenCalledTimes(1);
    expect((await state())!.status).toBe('done');
  });
});
