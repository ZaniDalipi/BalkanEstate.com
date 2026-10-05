/**
 * Agency property feeds: SSRF-safe fetching, completeness detection and the
 * pure sync planner (duplicate prevention, deactivation safeguards, limits).
 * No database; DNS and HTTP are injected.
 */
process.env.SKIP_TEST_DB = 'true';

import { Readable } from 'stream';
import { fetchFeed, FeedFetchError, type HttpTransport, type TransportRequest } from '../services/agencyFeeds/feedFetcher';
import { CANONICAL_MAPPING } from '../services/agencyFeeds/canonicalFormat';
import { planSync, findDuplicateIds, type PlanInput, type StagedInput } from '../services/agencyFeeds/syncPlanner';
import type { NormalizedListing } from '../services/agencyFeeds/feedTypes';

const publicDns = async () => [{ address: '93.184.216.34', family: 4 }];

const listingXml = (id: string) => `<listing><id>${id}</id></listing>`;
const feedXml = (ids: string[], attrs = '') => `<balkanestate-feed ${attrs}>${ids.map(listingXml).join('')}</balkanestate-feed>`;

/** A fake web server keyed by URL. */
const server = (pages: Record<string, { status?: number; body?: string; headers?: Record<string, string> }>) => {
  const requests: TransportRequest[] = [];
  const transport: HttpTransport = async (req) => {
    requests.push(req);
    const page = pages[req.url.toString()];
    if (!page) return { status: 404, headers: {}, body: Readable.from([]) };
    return {
      status: page.status ?? 200,
      headers: { 'content-type': 'application/xml', ...(page.headers ?? {}) },
      body: Readable.from(page.body ? [Buffer.from(page.body)] : []),
    };
  };
  return { transport, requests };
};

const fetchError = async (promise: Promise<unknown>): Promise<FeedFetchError> => {
  try {
    await promise;
  } catch (err) {
    expect(err).toBeInstanceOf(FeedFetchError);
    return err as FeedFetchError;
  }
  throw new Error('expected FeedFetchError');
};

describe('fetchFeed — SSRF protection', () => {
  it.each([
    ['http://127.0.0.1/feed.xml'],
    ['http://169.254.169.254/latest/meta-data/'],
    ['http://[::1]/feed.xml'],
    ['http://10.0.0.8/feed.xml'],
    ['https://agency.example:8443/feed.xml'],
    ['ftp://agency.example/feed.xml'],
    ['file:///etc/passwd'],
    ['https://user:pass@agency.example/feed.xml'],
  ])('refuses %s', async (url) => {
    const { transport, requests } = server({});
    const err = await fetchError(fetchFeed(url, { mapping: CANONICAL_MAPPING, transport, resolver: publicDns }));
    expect(err.code).toBe('unsafe_url');
    expect(requests).toHaveLength(0);
  });

  it('refuses a public name that resolves to a private address (DNS rebinding)', async () => {
    const { transport } = server({});
    const err = await fetchError(
      fetchFeed('https://evil.example/feed.xml', { mapping: CANONICAL_MAPPING, transport, resolver: async () => [{ address: '192.168.0.10', family: 4 }] })
    );
    expect(err.code).toBe('unsafe_url');
  });

  it('re-validates redirects and refuses one into the metadata service', async () => {
    const { transport, requests } = server({
      'https://agency.example/feed.xml': { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data/' } },
    });
    const err = await fetchError(fetchFeed('https://agency.example/feed.xml', { mapping: CANONICAL_MAPPING, transport, resolver: publicDns }));
    expect(err.code).toBe('unsafe_url');
    expect(requests).toHaveLength(1);
  });

  it('pins the connection to the vetted address', async () => {
    const { transport, requests } = server({ 'https://agency.example/feed.xml': { body: feedXml(['A']) } });
    await fetchFeed('https://agency.example/feed.xml', { mapping: CANONICAL_MAPPING, transport, resolver: publicDns });
    await new Promise<void>((done) =>
      requests[0].lookup('agency.example', {}, (_err, address) => {
        expect(address).toBe('93.184.216.34');
        done();
      })
    );
  });

  it('sends credentials only to the configured https origin', async () => {
    const { transport, requests } = server({
      'https://agency.example/feed.xml': { status: 301, headers: { location: 'https://cdn.other.example/feed.xml' } },
      'https://cdn.other.example/feed.xml': { body: feedXml(['A']) },
    });
    await fetchFeed('https://agency.example/feed.xml', {
      mapping: CANONICAL_MAPPING,
      transport,
      resolver: publicDns,
      credentials: { type: 'basic', username: 'u', secret: 's3cret' },
    });
    expect(requests[0].headers.Authorization).toMatch(/^Basic /);
    expect(requests[1].headers.Authorization).toBeUndefined();
    const err = await fetchError(
      fetchFeed('http://agency.example/feed.xml', { mapping: CANONICAL_MAPPING, transport, resolver: publicDns, credentials: { type: 'header', headerName: 'X-Key', secret: 'k' } })
    );
    expect(err.code).toBe('insecure_credentials');
  });
});

describe('fetchFeed — failures and completeness', () => {
  it('reports HTTP failures, wrong content and oversized bodies as errors', async () => {
    const { transport } = server({
      'https://a.example/500': { status: 503 },
      'https://a.example/login': { body: '<html></html>', headers: { 'content-type': 'text/html' } },
      'https://a.example/big': { body: feedXml(Array.from({ length: 50 }, (_, i) => `ID-${i}`)) },
    });
    const opts = { mapping: CANONICAL_MAPPING, transport, resolver: publicDns };
    const failed = await fetchError(fetchFeed('https://a.example/500', opts));
    expect(failed).toMatchObject({ code: 'server_error', retryable: true });
    expect((await fetchError(fetchFeed('https://a.example/login', opts))).code).toBe('not_xml');
    expect((await fetchError(fetchFeed('https://a.example/big', { ...opts, limits: { maxBytes: 200 } }))).code).toBe('too_large');
  });

  it('treats a truncated body as a retryable failure, never as a short feed', async () => {
    const { transport } = server({ 'https://a.example/f': { body: feedXml(['A', 'B']).slice(0, 60) } });
    const err = await fetchError(fetchFeed('https://a.example/f', { mapping: CANONICAL_MAPPING, transport, resolver: publicDns }));
    expect(err).toMatchObject({ code: 'truncated', retryable: true });
  });

  it('follows pagination and checks the declared total', async () => {
    const { transport } = server({
      'https://a.example/p1': { body: feedXml(['A', 'B'], 'total="3" next-page="/p2"') },
      'https://a.example/p2': { body: feedXml(['C']) },
    });
    const result = await fetchFeed('https://a.example/p1', { mapping: CANONICAL_MAPPING, transport, resolver: publicDns });
    expect(result).toMatchObject({ pages: 2, declaredTotal: 3, complete: true });
    expect(result.records).toHaveLength(3);
  });

  it('marks the snapshot incomplete when listings are missing or pages loop', async () => {
    const short = server({ 'https://a.example/f': { body: feedXml(['A'], 'total="5"') } });
    const r1 = await fetchFeed('https://a.example/f', { mapping: CANONICAL_MAPPING, transport: short.transport, resolver: publicDns });
    expect(r1.complete).toBe(false);
    expect(r1.incompleteReason).toContain('declares 5');

    const loop = server({ 'https://a.example/f': { body: feedXml(['A'], 'next-page="https://a.example/f"') } });
    const r2 = await fetchFeed('https://a.example/f', { mapping: CANONICAL_MAPPING, transport: loop.transport, resolver: publicDns });
    expect(r2.complete).toBe(false);

    const capped = server({
      'https://a.example/1': { body: feedXml(['A'], 'next-page="/2"') },
      'https://a.example/2': { body: feedXml(['B'], 'next-page="/3"') },
    });
    const r3 = await fetchFeed('https://a.example/1', { mapping: CANONICAL_MAPPING, transport: capped.transport, resolver: publicDns, limits: { maxPages: 2 } });
    expect(r3.complete).toBe(false);
  });

  it('fails the whole fetch when a later page fails', async () => {
    const { transport } = server({ 'https://a.example/1': { body: feedXml(['A'], 'next-page="/missing"') } });
    expect((await fetchError(fetchFeed('https://a.example/1', { mapping: CANONICAL_MAPPING, transport, resolver: publicDns }))).code).toBe('not_found');
  });
});

describe('planSync', () => {
  const listing = (id: string, extra: Partial<NormalizedListing> = {}): NormalizedListing => ({
    externalId: id, feedStatus: 'active', title: `T ${id}`, description: 'D', listingType: 'sale', propertyType: 'apartment',
    price: 1, isNegotiable: false, country: 'C', city: 'X', address: 'A', addressPrivate: false, amenities: [], imageUrls: [], floorplans: [], ...extra,
  });
  const staged = (ids: string[]): StagedInput[] => ids.map((id, ordinal) => ({ ordinal, externalId: id, valid: true, listing: listing(id), hash: `h-${id}` }));
  const existing = (ids: string[], overrides: Partial<PlanInput['existing'][number]> = {}) =>
    ids.map((id) => ({ externalId: id, sourceHash: `h-${id}`, deactivated: false, statusLocked: false, hasFailedImages: false, ...overrides }));
  const base = (over: Partial<PlanInput>): PlanInput => ({
    records: [], existing: [], mode: 'snapshot', complete: true, safeguards: { maxRemovalRatio: 0.3, minRemovalsForReview: 2 }, remainingCreates: 100, ...over,
  });
  const ids = Array.from({ length: 10 }, (_, i) => `L${i}`);

  it('creates new, skips unchanged, updates changed', () => {
    const records = staged(['L0', 'L1', 'NEW']);
    records[1].hash = 'changed';
    const plan = planSync(base({ records, existing: existing(['L0', 'L1']) }));
    expect(Array.from(plan.actions.values())).toEqual(['unchanged', 'update', 'create']);
  });

  it('deactivates listings missing from a complete snapshot', () => {
    const plan = planSync(base({ records: staged(ids.slice(0, 9)), existing: existing(ids) }));
    expect(plan.deactivation).toMatchObject({ candidates: ['L9'], allowed: true, held: false });
  });

  it('never deactivates from an empty or incomplete snapshot', () => {
    expect(planSync(base({ records: [], existing: existing(ids) })).deactivation.allowed).toBe(false);
    const partial = planSync(base({ records: staged(ids.slice(0, 5)), existing: existing(ids), complete: false, incompleteReason: 'pagination' }));
    expect(partial.deactivation.allowed).toBe(false);
    expect(partial.deactivation.blockedReason).toContain('incomplete');
  });

  it('holds a suspicious drop for review', () => {
    const plan = planSync(base({ records: staged(ids.slice(0, 4)), existing: existing(ids) }));
    expect(plan.deactivation).toMatchObject({ allowed: true, held: true });
    expect(plan.deactivation.candidates).toHaveLength(6);
  });

  it('holds when the feed shrank sharply since the last snapshot', () => {
    const plan = planSync(base({ records: staged(ids.slice(0, 7)), existing: existing(ids), previousSnapshotCount: 40, safeguards: { maxRemovalRatio: 0.5, minRemovalsForReview: 2 } }));
    expect(plan.deactivation.held).toBe(true);
  });

  it('in delta mode only explicit removals deactivate', () => {
    const records = staged(['L0']);
    records.push({ ordinal: 1, externalId: 'L1', valid: true, listing: listing('L1', { feedStatus: 'removed' }), hash: 'x' });
    const plan = planSync(base({ records, existing: existing(['L0', 'L1', 'L2']), mode: 'delta' }));
    expect(plan.actions.get(1)).toBe('remove');
    expect(plan.deactivation.candidates).toEqual([]);
  });

  it('treats IDs of invalid or duplicated records as present', () => {
    const records = staged(['L0']);
    records.push({ ordinal: 1, externalId: 'L1', valid: false });
    const plan = planSync(base({ records, existing: existing(['L0', 'L1']) }));
    expect(plan.deactivation.candidates).toEqual([]);
    expect(findDuplicateIds(['a', 'b', 'a', undefined, 'c', 'b'])).toEqual(new Set(['a', 'b']));
  });

  it('stops creating at the listing allowance and lists what was left out', () => {
    const plan = planSync(base({ records: staged(['N1', 'N2', 'N3']), remainingCreates: 2 }));
    expect(Array.from(plan.actions.values())).toEqual(['create', 'create', 'skip_limit']);
    expect(plan.excess).toEqual([{ externalId: 'N3', title: 'T N3' }]);
    expect(plan.newListings).toBe(3);
  });

  it('respects a locked status: never deactivated by absence', () => {
    const plan = planSync(base({ records: staged(['L0']), existing: [...existing(['L0']), ...existing(['L1'], { statusLocked: true })] }));
    expect(plan.deactivation.candidates).toEqual([]);
  });
});
