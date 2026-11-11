import { describe, it, expect, vi } from 'vitest';
import { runInChunks } from './chunkedWork';

/** A scheduler the test drives by hand. */
function manualScheduler() {
  const queue = new Map<number, () => void>();
  let next = 1;
  return {
    schedule: (cb: () => void) => { const id = next++; queue.set(id, cb); return id; },
    cancelSchedule: (id: number) => void queue.delete(id),
    tick: () => { const [id, cb] = [...queue][0] ?? []; if (id !== undefined) { queue.delete(id); cb!(); } },
    pending: () => queue.size,
  };
}

describe('runInChunks', () => {
  it('hands the items out a slice per tick and then reports done', () => {
    const s = manualScheduler();
    const seen: number[][] = [];
    const onDone = vi.fn();
    runInChunks({ items: [1, 2, 3, 4, 5], chunkSize: 2, processChunk: (c) => seen.push([...c]), onDone, onError: vi.fn(), ...s });

    expect(seen).toEqual([]);          // nothing happens inside the call itself
    s.tick(); expect(seen).toEqual([[1, 2]]);
    s.tick(); s.tick();
    expect(seen).toEqual([[1, 2], [3, 4], [5]]);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(s.pending()).toBe(0);
  });

  it('reports the start index of each slice', () => {
    const s = manualScheduler();
    const starts: number[] = [];
    runInChunks({ items: ['a', 'b', 'c'], chunkSize: 2, processChunk: (_c, start) => starts.push(start), onDone: vi.fn(), onError: vi.fn(), ...s });
    s.tick(); s.tick();
    expect(starts).toEqual([0, 2]);
  });

  it('finishes straight away for an empty list', () => {
    const onDone = vi.fn();
    runInChunks({ items: [], chunkSize: 10, processChunk: vi.fn(), onDone, onError: vi.fn(), ...manualScheduler() });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('stops and reports when a slice throws, instead of throwing into the page', () => {
    const s = manualScheduler();
    const onError = vi.fn();
    const onDone = vi.fn();
    const boom = new Error('boom');
    runInChunks({ items: [1, 2, 3], chunkSize: 1, processChunk: (c) => { if (c[0] === 2) throw boom; }, onDone, onError, ...s });
    s.tick(); s.tick();
    expect(onError).toHaveBeenCalledWith(boom);
    expect(s.pending()).toBe(0);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('cancel stops the run without calling done or error', () => {
    const s = manualScheduler();
    const processChunk = vi.fn();
    const onDone = vi.fn();
    const cancel = runInChunks({ items: [1, 2, 3], chunkSize: 1, processChunk, onDone, onError: vi.fn(), ...s });
    s.tick();
    cancel();
    s.tick();
    expect(processChunk).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
    expect(s.pending()).toBe(0);
  });

  it('treats a nonsense chunk size as one item at a time', () => {
    const s = manualScheduler();
    const seen: number[][] = [];
    runInChunks({ items: [1, 2], chunkSize: 0, processChunk: (c) => seen.push([...c]), onDone: vi.fn(), onError: vi.fn(), ...s });
    s.tick(); s.tick();
    expect(seen).toEqual([[1], [2]]);
  });
});
