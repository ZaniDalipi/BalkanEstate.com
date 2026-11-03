/**
 * Do a long loop a slice at a time, so it can never own the main thread.
 *
 * Building a map pin is a DOM node plus a Google marker; building one for every
 * listing in a single loop is one long task and one memory spike, at the very
 * moment a phone is switching to the map. This hands the same work out
 * `chunkSize` items per scheduled callback instead, and reports how it ended:
 * finished, failed (a throwing chunk stops the run rather than the page), or
 * cancelled (a newer run replaced it).
 *
 * The scheduler is injectable so the runner is testable without a browser.
 */
export interface ChunkedWorkOptions<T> {
  items: readonly T[];
  chunkSize: number;
  /** Handle one slice. `start` is the index of its first item in `items`. */
  processChunk: (chunk: readonly T[], start: number) => void;
  /** Every item was handled. */
  onDone: () => void;
  /** A slice threw: the run stops, and what was done so far stays done. */
  onError: (error: unknown) => void;
  schedule?: (callback: () => void) => number;
  cancelSchedule?: (handle: number) => void;
}

const defaultSchedule = (cb: () => void) => window.requestAnimationFrame(() => cb());
const defaultCancel = (handle: number) => window.cancelAnimationFrame(handle);

/** Starts the run (first slice on the next tick) and returns its `cancel`. */
export function runInChunks<T>({
  items,
  chunkSize,
  processChunk,
  onDone,
  onError,
  schedule = defaultSchedule,
  cancelSchedule = defaultCancel,
}: ChunkedWorkOptions<T>): () => void {
  const size = Math.max(1, Math.floor(chunkSize) || 1);
  let index = 0;
  let handle: number | null = null;
  let cancelled = false;

  const step = () => {
    handle = null;
    if (cancelled) return;
    try {
      processChunk(items.slice(index, index + size), index);
    } catch (error) {
      cancelled = true;
      onError(error);
      return;
    }
    index += size;
    if (index >= items.length) {
      onDone();
      return;
    }
    handle = schedule(step);
  };

  if (items.length === 0) {
    onDone();
    return () => {};
  }
  handle = schedule(step);

  return () => {
    cancelled = true;
    if (handle !== null) cancelSchedule(handle);
    handle = null;
  };
}
