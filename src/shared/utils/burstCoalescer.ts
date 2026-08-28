/**
 * Collapses a burst of events into a single, jittered action.
 *
 * Real-time listing events are broadcast to every connected client, and each
 * client reacted by refetching its property lists immediately. One listing edit
 * therefore produced one refetch per open tab, all within the same few
 * milliseconds — a thundering herd that grows with the audience, exactly when
 * the site is busiest.
 *
 * Two properties fix that:
 *
 * - **Coalescing**: while a refresh is pending, further events join it instead
 *   of scheduling their own, so a bulk import is one refresh rather than
 *   hundreds.
 * - **Jitter**: each client waits a random fraction of a second, so a broadcast
 *   arrives at the server spread over a window instead of as a spike.
 *
 * Both are invisible to the user: the affected item is patched into the cache
 * synchronously by the caller, and this only governs the background list
 * refresh behind it.
 */

export interface BurstCoalescerOptions {
  /** Minimum spacing between two runs. */
  minIntervalMs?: number;
  /** Upper bound of the random delay added to every run. */
  jitterMs?: number;
  /** Injectable for deterministic tests. */
  random?: () => number;
  /** Injectable for deterministic tests. */
  now?: () => number;
}

export interface BurstCoalescer {
  /** Requests a run. Repeated calls inside one window collapse into one. */
  schedule: () => void;
  /** Drops any pending run — call this on unmount. */
  cancel: () => void;
  /** True while a run is waiting to fire. */
  readonly isPending: boolean;
}

export function createBurstCoalescer(
  action: () => void,
  options: BurstCoalescerOptions = {}
): BurstCoalescer {
  const {
    minIntervalMs = 15_000,
    jitterMs = 2_000,
    random = Math.random,
    now = Date.now,
  } = options;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastRunAt = Number.NEGATIVE_INFINITY;

  const run = () => {
    timer = null;
    lastRunAt = now();
    action();
  };

  return {
    schedule() {
      if (timer !== null) return; // Already pending — this event joins it.

      const sinceLastRun = now() - lastRunAt;
      const cooldown = Math.max(0, minIntervalMs - sinceLastRun);
      timer = setTimeout(run, cooldown + Math.floor(random() * jitterMs));
    },

    cancel() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },

    get isPending() {
      return timer !== null;
    },
  };
}
