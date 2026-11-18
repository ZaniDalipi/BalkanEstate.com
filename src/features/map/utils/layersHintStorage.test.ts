import { describe, it, expect, beforeEach } from 'vitest';
import { hasSeenLayersHint, markLayersHintSeen, resetLayersHintMemory, LAYERS_HINT_KEY } from './layersHintStorage';

const memoryStore = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};
const broken = {
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('blocked'); },
};

describe('layersHintStorage', () => {
  beforeEach(resetLayersHintMemory);

  it('is unseen at first and seen once marked', () => {
    const store = memoryStore();
    expect(hasSeenLayersHint(store)).toBe(false);
    markLayersHintSeen(store);
    expect(store.getItem(LAYERS_HINT_KEY)).toBe('1');
    resetLayersHintMemory();
    expect(hasSeenLayersHint(store)).toBe(true);
  });

  it('never throws when storage is blocked or missing, and still remembers for this load', () => {
    expect(hasSeenLayersHint(broken)).toBe(false);
    expect(() => markLayersHintSeen(broken)).not.toThrow();
    expect(hasSeenLayersHint(broken)).toBe(true);
    resetLayersHintMemory();
    expect(hasSeenLayersHint(null)).toBe(false);
  });
});
