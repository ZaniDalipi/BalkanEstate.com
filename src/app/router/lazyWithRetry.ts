import { lazy, type ComponentType } from 'react';
import { recoverFromStaleChunk } from '@/src/utils/chunkRecovery';

/**
 * `React.lazy` that survives a deploy.
 *
 * A stale build requests a chunk whose hashed filename no longer exists; the
 * SPA fallback then returns index.html (text/html) and the module fails to
 * parse. We retry once for a transient blip, then hand off to
 * recoverFromStaleChunk, which tears down the service worker + caches and
 * reloads to a clean bundle (the only thing that reliably fixes a precached-SW
 * stale HTML).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(importFn: () => Promise<{ default: T }>) {
  return lazy(() =>
    importFn().catch(() =>
      importFn().catch((err) => {
        void recoverFromStaleChunk();
        throw err;
      })
    )
  );
}
