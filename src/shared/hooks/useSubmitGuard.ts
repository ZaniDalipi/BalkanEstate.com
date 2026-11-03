import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Lets a form send only once at a time. A double click, a double tap or Enter
 * pressed twice lands before React has re-rendered the button as disabled, so
 * a state flag alone is not enough: the lock is a ref, set synchronously.
 * `isSubmitting` stays true for the whole flow (including uploads that run
 * after the main request), so the button stays disabled until it is all done.
 *
 *   const { run, isSubmitting } = useSubmitGuard();
 *   const handleSubmit = (e) => { e.preventDefault(); void run(async () => { ... }); };
 *   <button disabled={isSubmitting}>
 */
export function useSubmitGuard() {
  const lockRef = useRef(false);
  const mountedRef = useRef(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Runs `task` unless one is already running; resolves to `undefined` when skipped. */
  const run = useCallback(async <R,>(task: () => Promise<R> | R): Promise<R | undefined> => {
    if (lockRef.current) return undefined;
    lockRef.current = true;
    setIsSubmitting(true);
    try {
      return await task();
    } finally {
      lockRef.current = false;
      if (mountedRef.current) setIsSubmitting(false);
    }
  }, []);

  return { run, isSubmitting, isLocked: () => lockRef.current };
}

export default useSubmitGuard;
