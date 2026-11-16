// Runs the actions of "My listings" cards one at a time per listing, and keeps
// what each card should show meanwhile: which action is working, and the
// result (a short confirmation, or the reason it failed with a way to retry).

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TextRef } from '../utils/listingActions';
import {
  isRetryable, listingActionErrorText, listingActionSuccessText, readApiFailure,
  type ApiFailure, type ListingTaskId,
} from '../utils/listingActionFeedback';

export interface ListingFeedback {
  kind: 'success' | 'error';
  task: ListingTaskId;
  text: TextRef;
  /** Present when trying again can help. */
  retry?: () => void;
}

export interface RunOptions {
  /** Called with the parsed failure before the message is shown (e.g. to start a cooldown). */
  onFailure?: (failure: ApiFailure) => void;
}

const SUCCESS_VISIBLE_MS = 5000;

export function useListingTasks() {
  const [pending, setPending] = useState<Record<string, ListingTaskId>>({});
  const [feedback, setFeedback] = useState<Record<string, ListingFeedback>>({});
  // Read synchronously, so a second press before React re-renders is ignored.
  const inFlight = useRef(new Set<string>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const pendingTimers = timers.current;
    return () => {
      mounted.current = false;
      pendingTimers.forEach(clearTimeout);
      pendingTimers.clear();
    };
  }, []);

  const clearTimer = (listingId: string) => {
    const timer = timers.current.get(listingId);
    if (timer) clearTimeout(timer);
    timers.current.delete(listingId);
  };

  const without = <T,>(map: Record<string, T>, key: string): Record<string, T> => {
    if (!(key in map)) return map;
    const { [key]: _removed, ...rest } = map;
    return rest;
  };

  const dismiss = useCallback((listingId: string) => {
    clearTimer(listingId);
    setFeedback((prev) => without(prev, listingId));
  }, []);

  /** Returns false when the listing is already busy and the press was ignored. */
  const run = useCallback(
    async (listingId: string, task: ListingTaskId, work: () => Promise<void>, options?: RunOptions): Promise<boolean> => {
      if (inFlight.current.has(listingId)) return false;
      inFlight.current.add(listingId);
      clearTimer(listingId);
      setFeedback((prev) => without(prev, listingId));
      setPending((prev) => ({ ...prev, [listingId]: task }));

      let result: ListingFeedback | null = null;
      try {
        await work();
        const text = listingActionSuccessText(task);
        result = text ? { kind: 'success', task, text } : null;
      } catch (error: unknown) {
        const failure = readApiFailure(error);
        options?.onFailure?.(failure);
        result = {
          kind: 'error',
          task,
          text: listingActionErrorText(task, failure),
          retry: isRetryable(failure) ? () => { void run(listingId, task, work, options); } : undefined,
        };
      } finally {
        inFlight.current.delete(listingId);
      }

      if (!mounted.current) return true;
      setPending((prev) => without(prev, listingId));
      if (result) {
        const shown = result;
        setFeedback((prev) => ({ ...prev, [listingId]: shown }));
        if (shown.kind === 'success') {
          timers.current.set(listingId, setTimeout(() => {
            timers.current.delete(listingId);
            setFeedback((prev) => (prev[listingId] === shown ? without(prev, listingId) : prev));
          }, SUCCESS_VISIBLE_MS));
        }
      }
      return true;
    },
    []
  );

  return { pending, feedback, run, dismiss };
}
