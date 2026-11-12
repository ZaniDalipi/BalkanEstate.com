/**
 * After the owner approves listings, the import runs on the server as a job.
 * The progress window must show real numbers while it runs — scanned, new,
 * failed and the listings as they are processed — without a live socket.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/shared/hooks/useSocket', () => ({ useSocket: () => null }));

const startPreview = vi.fn();
const confirmImport = vi.fn();
const getImportJob = vi.fn();
vi.mock('@/src/features/listing-sources/api/listingSourceApi', () => ({
  startMyListingSourcePreview: (...args: unknown[]) => startPreview(...args),
  getMyListingSourcePreviewJob: vi.fn(),
  confirmMyListingSourceImport: (...args: unknown[]) => confirmImport(...args),
  getMyListingSourceImportJob: (...args: unknown[]) => getImportJob(...args),
}));

import {
  ListingIngestProgressProvider,
  useListingIngestProgressContext,
  type SyncSession,
} from '@/src/features/listing-sources/context/ListingIngestProgressContext';
import { sessionFromImportJob } from '@/src/features/listing-sources/utils/importJobSession';
import type { ImportJob } from '@/src/features/listing-sources/api/listingSourceApi';

const base = { jobId: 'job-9', sourceId: 'src-1', startedAt: 0 };
const counts = (processed: number, imported: number, failed = 0) => ({ fetched: 3, processed, imported, updated: 0, failed, deferred: 0, reviewMode: true });
const stats = { sourceSlug: 's', fetched: 3, imported: 2, updated: 0, failed: 1, deferred: 0, errors: [], durationMs: 9, reviewMode: true };

const session = (over: Partial<SyncSession> = {}): SyncSession => ({
  sourceId: 'src-1', sourceName: 'Agency', startedAt: 0, current: null, recentItems: [], isDone: false, notified: false, ...over,
});

describe('sessionFromImportJob', () => {
  it('carries the counts and processed listings of a running job', () => {
    const job: ImportJob = { ...base, status: 'running', current: counts(1, 1), recentItems: [{ id: 'a', title: 'Villa', status: 'imported' }] };
    const out = sessionFromImportJob(session(), job);
    expect(out).toMatchObject({ jobId: 'job-9', isDone: false, current: { fetched: 3, processed: 1, imported: 1 } });
    expect(out.recentItems).toHaveLength(1);
  });

  it('finishes with the final stats, or with the reason it failed', () => {
    expect(sessionFromImportJob(session(), { ...base, status: 'done', current: counts(3, 2, 1), recentItems: [], stats }))
      .toMatchObject({ isDone: true, finalStats: stats, current: { done: true } });
    expect(sessionFromImportJob(session(), { ...base, status: 'failed', current: null, recentItems: [], error: 'database down' }))
      .toMatchObject({ isDone: true, current: { done: true, message: 'database down', processed: 0 } });
  });
});

/** Shows what the dock and progress window read from the context. */
const Probe: React.FC = () => {
  const { sessions, pendingPreview, confirmPreview } = useListingIngestProgressContext();
  const s = sessions.get('src-1');
  return (
    <div>
      <button onClick={() => confirmPreview(['a', 'b', 'c'])} disabled={!pendingPreview}>approve</button>
      {s && <p data-testid="counts">{`${s.current?.processed ?? 0}/${s.current?.fetched ?? 0} new ${s.current?.imported ?? 0} failed ${s.current?.failed ?? 0} items ${s.recentItems.length} done ${s.isDone}`}</p>}
    </div>
  );
};

describe('importing approved listings', () => {
  beforeEach(() => {
    startPreview.mockReset();
    confirmImport.mockReset();
    getImportJob.mockReset();
  });

  it('shows counts while the import runs, then the result', async () => {
    confirmImport.mockResolvedValue({ job: { ...base, status: 'running', current: null, recentItems: [] } });
    getImportJob
      .mockResolvedValueOnce({ ...base, status: 'running', current: counts(1, 1), recentItems: [{ id: 'a', status: 'imported' }] })
      .mockResolvedValue({
        ...base, status: 'done', current: counts(3, 2, 1), stats,
        recentItems: [{ id: 'a', status: 'imported' }, { id: 'b', status: 'imported' }, { id: 'c', status: 'failed' }],
      });

    // A finished fetch opens the review; approving starts the import.
    startPreview.mockResolvedValue({
      jobId: 'p', sourceId: 'src-1', startedAt: 0, status: 'done', found: 3, detailsFetched: 3,
      result: { previewId: 'prev', items: [], fetched: 3 },
    });
    const Starter: React.FC = () => {
      const { startPreview: start } = useListingIngestProgressContext();
      return <button onClick={() => void start('src-1', 'Agency')}>fetch</button>;
    };

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ListingIngestProgressProvider>
          <Starter />
          <Probe />
        </ListingIngestProgressProvider>
      </QueryClientProvider>
    );

    act(() => screen.getByText('fetch').click());
    await waitFor(() => expect(screen.getByText('approve')).not.toBeDisabled());
    act(() => screen.getByText('approve').click());

    await waitFor(() => expect(screen.getByTestId('counts')).toHaveTextContent('1/3 new 1 failed 0 items 1 done false'), { timeout: 4000 });
    await waitFor(() => expect(screen.getByTestId('counts')).toHaveTextContent('3/3 new 2 failed 1 items 3 done true'), { timeout: 4000 });
    expect(confirmImport).toHaveBeenCalledWith('src-1', 'prev', ['a', 'b', 'c']);
  }, 15_000);
});
