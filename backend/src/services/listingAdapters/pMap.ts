/**
 * Run `worker` over `items` with at most `concurrency` in flight at once.
 * Maintains input order in the result array. Failures are mapped to `undefined`
 * — the caller decides how to treat them (we don't want one slow detail page
 * to abort the whole adapter run).
 */
export const pMap = async <T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<(R | undefined)[]> => {
  const results = new Array<R | undefined>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try {
        results[i] = await worker(items[i], i);
      } catch {
        results[i] = undefined;
      }
    }
  });
  await Promise.all(runners);
  return results;
};
