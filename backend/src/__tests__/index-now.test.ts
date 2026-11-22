/**
 * IndexNow: which URLs a changed listing announces, how they are batched,
 * what is sent, and that the key the protocol checks is really served.
 */
process.env.SKIP_TEST_DB = 'true';

import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { INDEXNOW_KEY, isIndexNowEnabled } from '../config/indexNow';
import { listingUrls, marketUrlsFor, urlsForChangedListing } from '../services/indexNow/indexNowUrls';
import { createIndexNowQueue } from '../services/indexNow/indexNowQueue';
import { indexNowPayload, submitToIndexNow } from '../services/indexNow/indexNowService';

const notifyListingChanged = jest.fn();
jest.mock('../services/indexNow/indexNowService', () => {
  const actual = jest.requireActual('../services/indexNow/indexNowService');
  return { ...actual, notifyListingChanged: (...args: unknown[]) => notifyListingChanged(...args) };
});
import { indexNowOnSuccess, listingIdFromBody } from '../middleware/indexNowOnSuccess';

const SITE = 'https://balkanestateai.com';

describe('IndexNow URLs', () => {
  it('announces the listing page in every language', () => {
    const urls = listingUrls('AbCdEfGh12345678', SITE);
    expect(urls).toHaveLength(10);
    expect(urls).toContain(`${SITE}/en/property/AbCdEfGh12345678`);
    expect(urls).toContain(`${SITE}/me/property/AbCdEfGh12345678`);
  });

  it('adds the country and city pages it appears on, with the city\'s canonical slug', () => {
    expect(marketUrlsFor({ listingType: 'sale', country: 'Albania', city: 'Tiranë' }, SITE)).toEqual([
      `${SITE}/en/property-for-sale/albania`,
      `${SITE}/en/property-for-sale/albania/tirana`,
    ]);
    expect(marketUrlsFor({ listingType: 'rent', country: 'North Macedonia', city: '' }, SITE)).toEqual([
      `${SITE}/en/property-for-rent/north-macedonia`,
    ]);
    expect(marketUrlsFor({ listingType: 'sale', country: 'Italy', city: 'Rome' }, SITE)).toEqual([]);
    expect(urlsForChangedListing({ encodedId: 'x', country: 'Kosovo', city: 'Prishtina' }, SITE)).toHaveLength(12);
  });
});

describe('IndexNow queue', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('waits for more changes, drops duplicates and sends one batch', async () => {
    const submit = jest.fn().mockResolvedValue(undefined);
    const queue = createIndexNowQueue({ submit, delayMs: 60_000 });
    queue.add(['a', 'b']);
    queue.add(['b', 'c']);
    expect(submit).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(60_000);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith(['a', 'b', 'c']);
    expect(queue.size()).toBe(0);
  });

  it('sends a full batch at once, and splits what is over the limit', async () => {
    const submit = jest.fn().mockResolvedValue(undefined);
    const queue = createIndexNowQueue({ submit, delayMs: 60_000, maxBatch: 2 });
    queue.add(['a', 'b', 'c']);
    await jest.advanceTimersByTimeAsync(0);
    expect(submit.mock.calls).toEqual([[['a', 'b']], [['c']]]);
  });

  it('reports a failed submission and keeps working', async () => {
    const onError = jest.fn();
    const submit = jest.fn().mockRejectedValueOnce(new Error('429')).mockResolvedValue(undefined);
    const queue = createIndexNowQueue({ submit, delayMs: 10, onError });
    queue.add(['a']);
    await jest.advanceTimersByTimeAsync(10);
    expect(onError).toHaveBeenCalledTimes(1);
    queue.add(['b']);
    await jest.advanceTimersByTimeAsync(10);
    expect(submit).toHaveBeenLastCalledWith(['b']);
  });
});

describe('IndexNow request', () => {
  it('names the host, the key and where the key is served', () => {
    expect(indexNowPayload(['u'], SITE)).toEqual({
      host: 'balkanestateai.com',
      key: INDEXNOW_KEY,
      keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
      urlList: ['u'],
    });
  });

  it('accepts 200 and 202, and fails on anything else', async () => {
    const answer = (status: number) => jest.fn().mockResolvedValue(new Response(null, { status })) as unknown as typeof fetch;
    await expect(submitToIndexNow(['u'], answer(200))).resolves.toBeUndefined();
    await expect(submitToIndexNow(['u'], answer(202))).resolves.toBeUndefined();
    await expect(submitToIndexNow(['u'], answer(403))).rejects.toThrow('403');
    await expect(submitToIndexNow(['u'], answer(429))).rejects.toThrow('429');
  });

  it('the key file the protocol checks is served by the website, with the same key', () => {
    const file = path.resolve(__dirname, `../../../public/${INDEXNOW_KEY}.txt`);
    expect(fs.readFileSync(file, 'utf-8').trim()).toBe(INDEXNOW_KEY);
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
  });

  it('runs only in production, and can be switched off there', () => {
    expect(isIndexNowEnabled({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBe(true);
    expect(isIndexNowEnabled({ NODE_ENV: 'production', INDEXNOW_ENABLED: 'false' } as NodeJS.ProcessEnv)).toBe(false);
    expect(isIndexNowEnabled({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toBe(false);
    expect(isIndexNowEnabled({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe('IndexNow middleware', () => {
  const run = (params: Record<string, string>, status: number, body?: unknown) => {
    const res = Object.assign(new EventEmitter(), { statusCode: status, json: jest.fn(function (this: unknown) { return this; }) });
    const next = jest.fn();
    indexNowOnSuccess()({ params } as never, res as never, next);
    if (body !== undefined) (res.json as unknown as (b: unknown) => unknown)(body);
    res.emit('finish');
    return next;
  };
  const env = process.env.NODE_ENV;
  beforeEach(() => notifyListingChanged.mockReset());
  afterEach(() => { process.env.NODE_ENV = env; });

  it('reads the id of a created listing from the response', () => {
    expect(listingIdFromBody({ property: { id: 'Enc0ded' } })).toBe('Enc0ded');
    expect(listingIdFromBody({ property: { _id: '64b000000000000000000001' } })).toBe('64b000000000000000000001');
    expect(listingIdFromBody({ message: 'x' })).toBeUndefined();
    expect(listingIdFromBody(null)).toBeUndefined();
  });

  it('announces the listing after a successful write, not after a failed one', () => {
    process.env.NODE_ENV = 'production';
    expect(run({ id: 'Enc0ded' }, 200)).toHaveBeenCalled();
    expect(notifyListingChanged).toHaveBeenCalledWith('Enc0ded', {});
    notifyListingChanged.mockReset();
    run({ id: 'Enc0ded' }, 403);
    run({}, 201, { property: { id: 'NewOne' } });
    expect(notifyListingChanged.mock.calls).toEqual([['NewOne', {}]]);
  });

  it('does nothing outside production', () => {
    process.env.NODE_ENV = 'test';
    expect(run({ id: 'Enc0ded' }, 200)).toHaveBeenCalled();
    expect(notifyListingChanged).not.toHaveBeenCalled();
  });
});
