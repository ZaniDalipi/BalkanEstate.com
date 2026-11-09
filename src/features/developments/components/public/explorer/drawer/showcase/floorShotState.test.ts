import { describe, expect, it, vi } from 'vitest';
import type { FloorShot } from './floorShot';
import { floorShotState } from './floorShotState';

const shot: FloorShot = { view: { viewKey: 'g', viewDirection: 'custom', sortOrder: 0, imageUrl: 'https://m/g.jpg', imageWidth: 1600, imageHeight: 900, hotspots: [] } };
const base = { shot: null, loading: false, failed: false, expected: true, retry: () => undefined };

describe('floorShotState', () => {
  it('is ready once there is a picture, even if a later refresh failed', () => {
    expect(floorShotState({ ...base, shot, failed: true })).toEqual({ status: 'ready', shot });
  });

  it('waits for, and reports, a picture the floor is known to have', () => {
    expect(floorShotState({ ...base, loading: true })).toEqual({ status: 'loading' });
    const retry = vi.fn();
    const failed = floorShotState({ ...base, failed: true, retry });
    expect(failed.status).toBe('failed');
    if (failed.status === 'failed') failed.retry();
    expect(retry).toHaveBeenCalledOnce();
  });

  it('stays quiet about a floor not known to have a picture', () => {
    expect(floorShotState({ ...base, expected: false, loading: true })).toEqual({ status: 'none' });
    expect(floorShotState({ ...base, expected: false, failed: true })).toEqual({ status: 'none' });
    expect(floorShotState(base)).toEqual({ status: 'none' });
  });
});
