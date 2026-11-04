import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import {
  FORM_DRAFT_TTL_MS,
  readFormDraft,
  removeFormDraft,
  sameFormData,
  writeFormDraft,
} from '../utils/formDraftStorage';

export interface FormDraft<T> {
  /** Storage key, or null while drafts are off for this form */
  key: string | null;
  /** What was saved last time, read once when the form mounted */
  restored: T | null;
  /** When the restored draft was saved; null once dismissed or when there was none */
  restoredAt: number | null;
  /** Forget the draft (the caller resets its fields); saving carries on as they type */
  discard: () => void;
  /** The form was sent: forget the draft and stop saving for this mount */
  finish: () => void;
  /** @internal shared with useDraftAutosave */
  stoppedRef: MutableRefObject<boolean>;
}

/**
 * Reads a form's saved draft once, so its fields can start from it:
 *
 *   const draft = useFormDraft<Snapshot>(formDraftKey('contact', userId));
 *   const [name, setName] = useState(draft.restored?.name ?? '');
 *   useDraftAutosave(draft, { name }, { name: '' });
 *   // after a successful submit:  draft.finish();
 */
export function useFormDraft<T>(key: string | null): FormDraft<T> {
  const [initial] = useState(() => (key ? readFormDraft<T>(key) : null));
  const [restoredAt, setRestoredAt] = useState<number | null>(initial?.savedAt ?? null);
  const stoppedRef = useRef(false);
  const keyRef = useRef(key);
  keyRef.current = key;

  const discard = useCallback(() => {
    stoppedRef.current = false;
    if (keyRef.current) removeFormDraft(keyRef.current);
    setRestoredAt(null);
  }, []);

  const finish = useCallback(() => {
    stoppedRef.current = true;
    if (keyRef.current) removeFormDraft(keyRef.current);
    setRestoredAt(null);
  }, []);

  return useMemo(
    () => ({ key, restored: initial?.data ?? null, restoredAt, discard, finish, stoppedRef }),
    [key, initial, restoredAt, discard, finish],
  );
}

interface AutosaveOptions {
  /** Wait this long after the last change before writing */
  delayMs?: number;
  ttlMs?: number;
}

/**
 * Keeps `value` saved under the draft's key while the person types. Writes
 * right away when the page is hidden or closed (the app is quit, the phone
 * locks, the tab is closed) and when the form unmounts, so nothing typed is
 * lost to the debounce. A value equal to `empty` removes the draft instead.
 *
 * Returns true while the form holds something worth keeping (it differs from
 * `empty`): pass it to <FormLeaveGuard dirty /> to ask before leaving.
 */
export function useDraftAutosave<T>(draft: FormDraft<T>, value: T, empty: T, options: AutosaveOptions = {}): boolean {
  const { delayMs = 500, ttlMs = FORM_DRAFT_TTL_MS } = options;
  const serialized = useMemo(() => JSON.stringify(value), [value]);
  const latest = useRef({ value, empty, key: draft.key, ttlMs });
  latest.current = { value, empty, key: draft.key, ttlMs };
  const { stoppedRef } = draft;
  const emptySerialized = useMemo(() => JSON.stringify(empty), [empty]);

  const persist = useCallback(() => {
    const { value: current, empty: blank, key, ttlMs: ttl } = latest.current;
    if (!key || stoppedRef.current) return;
    if (sameFormData(current, blank)) removeFormDraft(key);
    else writeFormDraft(key, current, ttl);
  }, [stoppedRef]);

  // Debounced save after each change
  useEffect(() => {
    const timer = window.setTimeout(persist, delayMs);
    return () => window.clearTimeout(timer);
  }, [serialized, delayMs, persist]);

  // Immediate save when the page goes away, and when the form unmounts
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') persist();
    };
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', onHide);
      persist();
    };
  }, [persist]);

  return serialized !== emptySerialized;
}
