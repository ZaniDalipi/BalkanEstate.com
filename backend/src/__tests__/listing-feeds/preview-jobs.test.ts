process.env.SKIP_TEST_DB = 'true';

import { getPreviewJob, startPreviewJob, type PreviewRunner } from '../../services/listingPreviewJobs';
import type { IListingSource } from '../../models/ListingSource';

const source = (id: string) => ({ _id: id } as unknown as IListingSource);
const result = { previewId: 'prev-1', items: [], fetched: 3 };

/** A runner the test advances by hand. */
const controllable = () => {
  let progress: Parameters<PreviewRunner>[2] = () => undefined;
  let finish: (ok: boolean) => void = () => undefined;
  const run: PreviewRunner = (_s, _l, onProgress) => {
    progress = onProgress;
    return new Promise((resolve, reject) => {
      finish = (ok) => (ok ? resolve(result) : reject(new Error('site unreachable')));
    });
  };
  return { run, progress: (a: number, b: number) => progress(a, b), finish: (ok: boolean) => finish(ok) };
};

const flush = () => new Promise((r) => setImmediate(r));

describe('preview jobs', () => {
  it('reports listings found and pages read while running, then the result', async () => {
    const c = controllable();
    const job = startPreviewJob(source('s1'), 'u1', 100, c.run);
    expect(job).toMatchObject({ status: 'running', found: 0, detailsFetched: 0 });

    c.progress(24, 0);
    c.progress(48, 0);
    c.progress(48, 10);
    expect(getPreviewJob(job.jobId, 'u1', 's1')).toMatchObject({ status: 'running', found: 48, detailsFetched: 10 });

    c.finish(true);
    await flush();
    expect(getPreviewJob(job.jobId, 'u1', 's1')).toMatchObject({ status: 'done', result });
  });

  it('reports why it failed', async () => {
    const c = controllable();
    const job = startPreviewJob(source('s2'), 'u1', 100, c.run);
    c.finish(false);
    await flush();
    expect(getPreviewJob(job.jobId, 'u1', 's2')).toMatchObject({ status: 'failed', error: 'site unreachable' });
  });

  it('reuses the running job of the same source instead of crawling twice', () => {
    const c = controllable();
    const a = startPreviewJob(source('s3'), 'u1', 100, c.run);
    const b = startPreviewJob(source('s3'), 'u1', 100, c.run);
    expect(b.jobId).toBe(a.jobId);
  });

  it("never shows a job to another user or under another source", () => {
    const c = controllable();
    const job = startPreviewJob(source('s4'), 'u1', 100, c.run);
    expect(getPreviewJob(job.jobId, 'u2', 's4')).toBeUndefined();
    expect(getPreviewJob(job.jobId, 'u1', 'other')).toBeUndefined();
    expect(JSON.stringify(getPreviewJob(job.jobId, 'u1', 's4'))).not.toContain('u1');
  });
});
