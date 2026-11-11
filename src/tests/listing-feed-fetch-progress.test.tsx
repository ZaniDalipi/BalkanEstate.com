/**
 * Fetching a whole feed takes minutes, so it runs on the server as a job and
 * the page polls it. While it runs the owner sees how far it is — listings
 * found so far, then listing pages read — and the review opens when it's done.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      `${key.split(':').pop()}${opts && 'count' in opts ? ` ${opts.count}` : ''}${opts && 'read' in opts ? ` ${opts.read}/${opts.found}` : ''}`,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));
vi.mock('@/shared/hooks/useSocket', () => ({ useSocket: () => null }));

const startPreview = vi.fn();
const getJob = vi.fn();
vi.mock('@/src/features/listing-sources/api/listingSourceApi', () => ({
  startMyListingSourcePreview: (...args: unknown[]) => startPreview(...args),
  getMyListingSourcePreviewJob: (...args: unknown[]) => getJob(...args),
  confirmMyListingSourceImport: vi.fn(),
  getMyListingSourceImportJob: vi.fn(),
}));

import {
  ListingIngestProgressProvider,
  useListingIngestProgressContext,
} from '@/src/features/listing-sources/context/ListingIngestProgressContext';
import PreviewFetchProgress from '@/src/features/listing-sources/components/PreviewFetchProgress';
import { previewProgress } from '@/src/features/listing-sources/utils/previewProgress';

const base = { jobId: 'job-1', sourceId: 'src-1', startedAt: 0 };

describe('previewProgress', () => {
  it('moves from starting to finding to reading', () => {
    expect(previewProgress(undefined)).toEqual({ phase: 'starting' });
    expect(previewProgress({ found: 48, detailsFetched: 0 })).toEqual({ phase: 'finding', found: 48 });
    expect(previewProgress({ found: 48, detailsFetched: 12 })).toEqual({ phase: 'reading', found: 48, read: 12, percent: 25 });
    expect(previewProgress({ found: 10, detailsFetched: 30 })).toMatchObject({ read: 10, percent: 100 });
  });
});

describe('PreviewFetchProgress', () => {
  it('shows the counts and a filling bar', () => {
    render(<PreviewFetchProgress fetching={{ found: 48, detailsFetched: 12 }} />);
    expect(screen.getByRole('status')).toHaveTextContent('progressReading 12/48');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  });
});

/** Shows what the feeds page and dock read from the context. */
const Probe: React.FC = () => {
  const { fetchingPreviews, pendingPreview, startPreview } = useListingIngestProgressContext();
  const f = fetchingPreviews.get('src-1');
  return (
    <div>
      <button onClick={() => void startPreview('src-1', 'Agency').catch(() => undefined)}>fetch</button>
      {f && <PreviewFetchProgress fetching={f} />}
      {pendingPreview && <p>review {pendingPreview.items.length}</p>}
    </div>
  );
};

const renderWithProviders = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ListingIngestProgressProvider>
        <Probe />
      </ListingIngestProgressProvider>
    </QueryClientProvider>
  );

describe('fetching a feed', () => {
  beforeEach(() => {
    startPreview.mockReset();
    getJob.mockReset();
  });

  it('shows found and read counts while the job runs, then opens the review', async () => {
    startPreview.mockResolvedValue({ ...base, status: 'running', found: 0, detailsFetched: 0 });
    getJob
      .mockResolvedValueOnce({ ...base, status: 'running', found: 27, detailsFetched: 0 })
      .mockResolvedValueOnce({ ...base, status: 'running', found: 54, detailsFetched: 20 })
      .mockResolvedValue({ ...base, status: 'done', found: 54, detailsFetched: 54, result: { previewId: 'p', items: [{ rawId: 'a', isNew: true }], fetched: 1 } });

    renderWithProviders();
    act(() => screen.getByText('fetch').click());

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('progressFound 27'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('progressReading 20/54'), { timeout: 4000 });
    await waitFor(() => expect(screen.getByText('review 1')).toBeInTheDocument(), { timeout: 4000 });
    expect(screen.queryByRole('status')).toBeNull();
  }, 15_000);

  it('stops showing progress when the job fails', async () => {
    startPreview.mockResolvedValue({ ...base, status: 'running', found: 0, detailsFetched: 0 });
    getJob.mockResolvedValue({ ...base, status: 'failed', found: 0, detailsFetched: 0, error: 'blocked' });
    renderWithProviders();
    act(() => screen.getByText('fetch').click());
    await waitFor(() => expect(getJob).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });
});
