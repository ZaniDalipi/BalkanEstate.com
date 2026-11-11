process.env.SKIP_TEST_DB = 'true';

import { applyProgress, getImportJob, startImportJob, type ImportRunner } from '../../services/listingRunJobs';
import type { IListingSource } from '../../models/ListingSource';
import type { IngestStats } from '../../services/listingIngestService';

const source = (id: string) => ({ _id: id } as unknown as IListingSource);
const counts = { fetched: 3, processed: 0, imported: 0, updated: 0, failed: 0, deferred: 0 };
const stats = { sourceSlug: 's', fetched: 3, imported: 2, updated: 0, failed: 1, deferred: 0, errors: [], durationMs: 5 } as IngestStats;
const flush = () => new Promise((r) => setImmediate(r));

describe('import progress', () => {
  it('records each processed listing with what happened to it', () => {
    let p = applyProgress({ current: null, recentItems: [] }, counts);
    p = applyProgress(p, { ...counts, processed: 1, imported: 1, currentItem: { id: 'a', title: 'Villa' } });
    p = applyProgress(p, { ...counts, processed: 2, imported: 1, failed: 1, currentItem: { id: 'b', title: 'Flat' } });
    expect(p.recentItems).toEqual([
      { id: 'a', title: 'Villa', url: undefined, status: 'imported' },
      { id: 'b', title: 'Flat', url: undefined, status: 'failed' },
    ]);
    expect(p.current?.processed).toBe(2);
  });
});

describe('import jobs', () => {
  it('shows counts while running and the stats when done', async () => {
    let report: Parameters<ImportRunner>[2] = () => undefined;
    let finish: (s: IngestStats) => void = () => undefined;
    const run: ImportRunner = (_s, _r, onProgress) => {
      report = onProgress;
      return new Promise((resolve) => { finish = resolve; });
    };
    const job = startImportJob(source('i1'), 'u1', [], run);
    report({ ...counts, processed: 1, imported: 1, currentItem: { id: 'a' } });
    expect(getImportJob(job.jobId, 'u1', 'i1')).toMatchObject({ status: 'running', current: { processed: 1 }, recentItems: [{ id: 'a' }] });
    finish(stats);
    await flush();
    expect(getImportJob(job.jobId, 'u1', 'i1')).toMatchObject({ status: 'done', stats });
  });

  it('reports why it failed, and only to its owner', async () => {
    const job = startImportJob(source('i2'), 'u1', [], () => Promise.reject(new Error('database down')));
    await flush();
    expect(getImportJob(job.jobId, 'u1', 'i2')).toMatchObject({ status: 'failed', error: 'database down' });
    expect(getImportJob(job.jobId, 'u2', 'i2')).toBeUndefined();
  });
});
