/**
 * Collects changed URLs and submits them in batches: an agent editing ten
 * listings in a minute makes one IndexNow request, not ten. Duplicates are
 * dropped, a full batch goes out at once, and a failed submission is logged
 * and dropped (the sitemap still lists the pages; nothing is retried in a
 * loop against a search engine).
 */
import { INDEXNOW_MAX_URLS } from '../../config/indexNow';

export type SubmitUrls = (urls: string[]) => Promise<void>;

export interface IndexNowQueue {
  add(urls: readonly string[]): void;
  /** Submit what is queued now (tests, shutdown). */
  flush(): Promise<void>;
  size(): number;
}

interface QueueOptions {
  submit: SubmitUrls;
  /** How long to wait for more changes before submitting. */
  delayMs: number;
  maxBatch?: number;
  onError?: (error: unknown) => void;
}

export function createIndexNowQueue({ submit, delayMs, maxBatch = INDEXNOW_MAX_URLS, onError }: QueueOptions): IndexNowQueue {
  let pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = async (): Promise<void> => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending.size === 0) return;
    const batch = [...pending];
    pending = new Set();
    for (let i = 0; i < batch.length; i += maxBatch) {
      try {
        await submit(batch.slice(i, i + maxBatch));
      } catch (error) {
        onError?.(error);
      }
    }
  };

  return {
    add(urls) {
      for (const url of urls) pending.add(url);
      if (pending.size >= maxBatch) {
        void flush();
      } else if (!timer && pending.size > 0) {
        timer = setTimeout(() => void flush(), delayMs);
        // Never keep the process alive just to ping a search engine.
        timer.unref?.();
      }
    },
    flush,
    size: () => pending.size,
  };
}
