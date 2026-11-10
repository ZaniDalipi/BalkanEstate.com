/**
 * The warm-up queue works out new listings' noise and traffic ahead of their
 * first visitor: one lookup at a time, each home once, and no more than the
 * daily cap (public Overpass servers ask for about 100 automated queries a day).
 */
process.env.SKIP_TEST_DB = 'true';

import axios, { type AxiosResponse } from 'axios';
import { resetWarmer, warmDailyCap, warmQueueSize, warmSurroundings } from '../services/surroundings/surroundingsWarmer';
import { clearSurroundingsCache } from '../services/surroundings/surroundingsService';

const settle = () => new Promise((r) => setTimeout(r, 20));

let postSpy: jest.SpyInstance;
const env = { ...process.env };
beforeEach(() => {
  resetWarmer();
  clearSurroundingsCache();
  process.env.NODE_ENV = 'development'; // the warmer stays off under tests unless told otherwise
  process.env.OVERPASS_URL = 'https://one.example/api/interpreter';
  process.env.SURROUNDINGS_WARM_INTERVAL_MS = '0';
  postSpy = jest.spyOn(axios, 'post').mockResolvedValue({ data: { elements: [] } } as AxiosResponse);
});
afterEach(() => {
  postSpy.mockRestore();
  process.env = { ...env };
});

describe('warmSurroundings', () => {
  it('looks a new home up in the background, once', async () => {
    warmSurroundings(40.6186, 20.7808);
    warmSurroundings(40.6186, 20.7808);
    await settle();
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(warmQueueSize()).toBe(0);
  });

  it('stops at the daily cap and leaves the rest for first visits', async () => {
    process.env.SURROUNDINGS_WARM_DAILY_CAP = '2';
    warmSurroundings(41.1, 20.1);
    warmSurroundings(41.2, 20.2);
    warmSurroundings(41.3, 20.3);
    await settle();
    expect(postSpy).toHaveBeenCalledTimes(2);
  });

  it('ignores homes without a usable location and does nothing under tests', async () => {
    warmSurroundings(0, 0);
    warmSurroundings(undefined, 20);
    process.env.NODE_ENV = 'test';
    warmSurroundings(42.1, 21.1);
    await settle();
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('allows about 100 lookups a day on the public servers, more on your own', () => {
    delete process.env.OVERPASS_URL;
    expect(warmDailyCap()).toBe(100);
    process.env.OVERPASS_URL = 'https://mine.example/api/interpreter';
    expect(warmDailyCap()).toBe(5000);
  });
});
