/**
 * Overpass is asked across mirrors: a failure moves on at once, a slow
 * mirror is joined by the next after HEDGE_DELAY_MS, the first good answer
 * wins and the others are cancelled.
 */
process.env.SKIP_TEST_DB = 'true';

import axios, { type AxiosResponse } from 'axios';
import { HEDGE_DELAY_MS, overpassUrls, queryOverpass, DEFAULT_OVERPASS_URLS } from '../services/surroundings/overpassClient';

const URLS = ['https://a.example', 'https://b.example', 'https://c.example'];
const ok = (elements: unknown[]) => ({ data: { elements } }) as AxiosResponse;

/** A request that only ends when it is cancelled. */
const hang = (_url: string, _body: unknown, config?: { signal?: AbortSignal }) =>
  new Promise<AxiosResponse>((_resolve, reject) => {
    config?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  });

let postSpy: jest.SpyInstance;
beforeEach(() => {
  postSpy = jest.spyOn(axios, 'post');
});
afterEach(() => {
  postSpy.mockRestore();
  jest.useRealTimers();
  delete process.env.OVERPASS_URL;
});

describe('queryOverpass', () => {
  it('answers from the first mirror when it is quick', async () => {
    postSpy.mockResolvedValueOnce(ok([{ id: 1 }]));
    await expect(queryOverpass('q', URLS)).resolves.toEqual([{ id: 1 }]);
    expect(postSpy).toHaveBeenCalledTimes(1);
  });

  it('moves to the next mirror at once when one fails', async () => {
    postSpy
      .mockRejectedValueOnce(new Error('429'))
      .mockResolvedValueOnce(ok([{ id: 2 }]));
    await expect(queryOverpass('q', URLS)).resolves.toEqual([{ id: 2 }]);
    expect(postSpy.mock.calls.map((c) => c[0])).toEqual(['https://a.example', 'https://b.example']);
  });

  it('asks the next mirror too while one is slow, and cancels the slow one', async () => {
    jest.useFakeTimers();
    let firstSignal: AbortSignal | undefined;
    postSpy
      .mockImplementationOnce((url: string, body: unknown, config: { signal: AbortSignal }) => {
        firstSignal = config.signal;
        return hang(url, body, config);
      })
      .mockResolvedValueOnce(ok([{ id: 3 }]));

    const answer = queryOverpass('q', URLS);
    expect(postSpy).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(HEDGE_DELAY_MS);
    await expect(answer).resolves.toEqual([{ id: 3 }]);
    expect(postSpy).toHaveBeenCalledTimes(2);
    expect(firstSignal?.aborted).toBe(true);
  });

  it('fails only once every mirror has failed', async () => {
    postSpy.mockRejectedValue(new Error('down'));
    await expect(queryOverpass('q', URLS)).rejects.toThrow('unavailable');
    expect(postSpy).toHaveBeenCalledTimes(3);
  });

  it('treats a runtime remark as that mirror failing', async () => {
    postSpy
      .mockResolvedValueOnce({ data: { elements: [], remark: 'runtime error: Query timed out' } } as AxiosResponse)
      .mockResolvedValueOnce(ok([]));
    await expect(queryOverpass('q', URLS)).resolves.toEqual([]);
  });
});

describe('overpassUrls', () => {
  it('uses the public mirrors by default and OVERPASS_URL when set', () => {
    expect(overpassUrls()).toEqual([...DEFAULT_OVERPASS_URLS]);
    process.env.OVERPASS_URL = 'https://mine.example/api/interpreter, not-a-url ,https://two.example';
    expect(overpassUrls()).toEqual(['https://mine.example/api/interpreter', 'https://two.example']);
  });
});
