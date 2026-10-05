/**
 * Property Imports — section render with a mocked API: a draft feed shows its
 * preview report and the authorization gate; an active feed with a held
 * removal shows the review prompt.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PropertyImportsSection from '../features/agency-dashboard/components/imports/PropertyImportsSection';
import type { AgencyFeed, FeedRun } from '../features/agency-dashboard/types/propertyImports';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>, options?: Record<string, unknown>) => {
      const text = typeof fallback === 'string' ? fallback : key;
      const values = (typeof fallback === 'object' ? fallback : options) ?? {};
      return text.replace(/\{\{(\w+)\}\}/g, (_, k) => String(values[k] ?? ''));
    },
  }),
}));

vi.mock('../features/agency-dashboard/hooks', () => ({
  useAgencyAgents: () => ({ agents: [{ userId: 'a1', name: 'Ana' }] }),
}));

const api = vi.hoisted(() => ({
  getFeedMeta: vi.fn(),
  listFeeds: vi.fn(),
  listFeedRuns: vi.fn(),
  getFeedRun: vi.fn(),
  activateFeed: vi.fn(),
}));
vi.mock('../features/agency-dashboard/api/propertyImportsApi', () => api);

const counts = { received: 3, valid: 2, created: 0, updated: 0, unchanged: 0, rejected: 1, deactivated: 0, reactivated: 0, skippedLimit: 0, localEditsKept: 0, imagesDownloaded: 0, imagesReused: 0, imagesFailed: 0 };
const baseFeed: AgencyFeed = {
  id: 'f1', name: 'Website feed', url: 'https://agency.example/feed.xml', format: 'canonical', mapping: null, mode: 'snapshot',
  state: 'draft', assignedAgentId: 'a1', credentials: { type: 'none', hasSecret: false }, safeguards: { maxRemovalRatio: 0.3, minRemovalsForReview: 5 },
  authorization: null, configVersion: 1, lastPreviewRunId: 'r1', lastRunId: null, lastRunAt: null, lastSuccessfulSyncAt: null, nextSyncAt: null,
  consecutiveFailures: 0, lastError: null, activatedAt: null, activeJob: false, pendingReviewRunId: null, createdAt: '', updatedAt: '',
};
const preview: FeedRun = {
  id: 'r1', trigger: 'preview', dryRun: true, status: 'previewed', startedAt: null, finishedAt: '2026-10-01T10:00:00Z', createdAt: '2026-10-01T10:00:00Z',
  counts, snapshot: { mode: 'snapshot', complete: true, pages: 1, bytes: 1000 }, error: null,
  deactivation: { candidates: 0, allowed: true, held: false, blockedReason: null, resolution: null },
  limit: { checked: true, remaining: 1, allowance: 30, newListings: 2, wouldExceed: true, excess: [{ externalId: 'AG-2', title: 'Second' }] },
  issueCount: 1, issues: [{ severity: 'error', code: 'missing_title', message: 'Title is missing', externalId: 'AG-3' }], issuesTruncated: false,
  samples: [{ externalId: 'AG-1', title: 'Sea view flat', listingType: 'sale', propertyType: 'apartment', price: 185000, city: 'Split', country: 'Croatia', address: 'Bačvice, Split', addressPrivate: true, imageUrls: ['https://agency.example/1.jpg'] }],
};

const renderSection = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PropertyImportsSection agencyId="ag1" />
    </QueryClientProvider>
  );

beforeEach(() => {
  api.getFeedMeta.mockResolvedValue({
    canonical: { version: '1.0', mapping: { recordElement: 'listing', fields: {} } }, fields: [], propertyTypes: [],
    sourceManagedFields: ['title', 'price'], lockableFields: [], localOnly: ['promotions and badges'],
    authorizationStatement: 'I confirm that this agency is authorized.', supportedCurrencies: ['EUR'],
  });
  api.listFeedRuns.mockResolvedValue([preview]);
  api.getFeedRun.mockResolvedValue(preview);
});

describe('PropertyImportsSection', () => {
  it('shows the preview report, the listing-limit warning and gates activation', async () => {
    api.listFeeds.mockResolvedValue([baseFeed]);
    api.activateFeed.mockResolvedValue({ feed: { ...baseFeed, state: 'active' }, runId: 'r2' });
    renderSection();

    expect(await screen.findByText('Sea view flat')).toBeTruthy();
    expect(screen.getByText(/exact address hidden/)).toBeTruthy();
    expect(screen.getByText('Title is missing')).toBeTruthy();
    expect(screen.getByText(/Your plan allows 1 more listings, but the feed has 2 new ones/)).toBeTruthy();

    const activate = screen.getByText('Activate and import now') as HTMLButtonElement;
    expect(activate.disabled).toBe(true);
    fireEvent.click(screen.getByText('I confirm that this agency is authorized.'));
    expect(activate.disabled).toBe(true); // the plan limit must also be acknowledged
    fireEvent.click(screen.getByText(/Import only up to my plan allowance/));
    expect(activate.disabled).toBe(false);
    fireEvent.click(activate);
    await waitFor(() => expect(api.activateFeed).toHaveBeenCalledWith('ag1', 'f1', { confirmAuthorized: true, acceptListingLimit: true }));
  });

  it('flags a held removal for review on an active feed', async () => {
    const held: FeedRun = { ...preview, id: 'r9', dryRun: false, trigger: 'scheduled', status: 'awaiting_review', samples: [], issues: [], deactivation: { candidates: 6, allowed: true, held: true, blockedReason: null, resolution: null }, limit: { ...preview.limit, wouldExceed: false } };
    api.listFeeds.mockResolvedValue([{ ...baseFeed, state: 'active', pendingReviewRunId: 'r9', lastSuccessfulSyncAt: '2026-10-02T03:00:00Z', nextSyncAt: '2026-10-03T03:00:00Z' }]);
    api.listFeedRuns.mockResolvedValue([held]);
    api.getFeedRun.mockResolvedValue(held);
    renderSection();

    expect(await screen.findByText(/Many listings disappeared from the feed/)).toBeTruthy();
    expect(await screen.findByText('Deactivate 6 listings')).toBeTruthy();
    expect(screen.getByText('Keep them active')).toBeTruthy();
    expect(screen.getByText('Daily sync on')).toBeTruthy();
  });
});
