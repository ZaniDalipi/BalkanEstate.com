import { describe, it, expect, beforeEach } from 'vitest';
import { hasOpenedMapOptions, markMapOptionsOpened, resetMapOptionsMemory, MAP_OPTIONS_SEEN_KEY } from './mapOptionsSeen';

const memoryStore = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};
const broken = {
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('blocked'); },
};

describe('mapOptionsSeen', () => {
  beforeEach(resetMapOptionsMemory);

  it('is unseen at first and seen once marked', () => {
    const store = memoryStore();
    expect(hasOpenedMapOptions(store)).toBe(false);
    markMapOptionsOpened(store);
    expect(store.getItem(MAP_OPTIONS_SEEN_KEY)).toBe('1');
    resetMapOptionsMemory();
    expect(hasOpenedMapOptions(store)).toBe(true);
  });

  it('never throws when storage is blocked or missing, and still remembers for this load', () => {
    expect(hasOpenedMapOptions(broken)).toBe(false);
    expect(() => markMapOptionsOpened(broken)).not.toThrow();
    expect(hasOpenedMapOptions(broken)).toBe(true);
    resetMapOptionsMemory();
    expect(hasOpenedMapOptions(null)).toBe(false);
  });
});
