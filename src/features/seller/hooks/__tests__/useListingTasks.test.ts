import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useListingTasks } from '../useListingTasks';

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};
const serverError = (statusCode: number, details: Record<string, unknown> = {}) =>
  Object.assign(new Error('x'), { statusCode, code: details.code ?? null, details });

afterEach(() => { vi.useRealTimers(); });

describe('useListingTasks', () => {
  it('marks the listing busy while the work runs, then confirms', async () => {
    const { result } = renderHook(() => useListingTasks());
    const work = deferred();
    act(() => { void result.current.run('a', 'renew', () => work.promise); });
    expect(result.current.pending).toEqual({ a: 'renew' });

    await act(async () => { work.resolve(); await work.promise; });
    await waitFor(() => expect(result.current.pending).toEqual({}));
    expect(result.current.feedback.a).toMatchObject({ kind: 'success', task: 'renew' });
  });

  it('ignores a second press on the same listing but not on another', async () => {
    const { result } = renderHook(() => useListingTasks());
    const first = deferred();
    const work = vi.fn(() => first.promise);
    let second = true;
    act(() => {
      void result.current.run('a', 'renew', work);
      void result.current.run('a', 'renew', work).then((ran) => { second = ran; });
      void result.current.run('b', 'markSold', work);
    });
    await act(async () => { first.resolve(); await first.promise; });
    await waitFor(() => expect(result.current.pending).toEqual({}));
    expect(second).toBe(false);
    expect(work).toHaveBeenCalledTimes(2);
  });

  it('shows why it failed and retries on request', async () => {
    const { result } = renderHook(() => useListingTasks());
    const work = vi.fn<() => Promise<void>>().mockRejectedValueOnce(serverError(500)).mockResolvedValueOnce(undefined);
    await act(async () => { await result.current.run('a', 'renew', work); });
    expect(result.current.feedback.a).toMatchObject({ kind: 'error', text: { key: 'seller:myListings.actionError.renew' } });
    expect(result.current.feedback.a.retry).toBeTypeOf('function');

    await act(async () => { result.current.feedback.a.retry?.(); });
    await waitFor(() => expect(result.current.feedback.a?.kind).toBe('success'));
    expect(work).toHaveBeenCalledTimes(2);
  });

  it('offers no retry when the server refused on principle, and reports the failure', async () => {
    const { result } = renderHook(() => useListingTasks());
    const onFailure = vi.fn();
    const refuse = () => Promise.reject(serverError(429, { code: 'RENEWAL_COOLDOWN', hoursRemaining: 2, minutesRemaining: 5 }));
    await act(async () => { await result.current.run('a', 'renew', refuse, { onFailure }); });
    expect(result.current.feedback.a.retry).toBeUndefined();
    expect(result.current.feedback.a.text.values).toEqual({ hours: 2, minutes: 5 });
    expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({ code: 'RENEWAL_COOLDOWN' }));
  });

  it('clears a confirmation by itself, and an error only when dismissed', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useListingTasks());
    await act(async () => { await result.current.run('a', 'renew', () => Promise.resolve()); });
    await act(async () => { await result.current.run('b', 'renew', () => Promise.reject(serverError(500))); });
    expect(result.current.feedback.a.kind).toBe('success');

    act(() => { vi.advanceTimersByTime(6000); });
    expect(result.current.feedback.a).toBeUndefined();
    expect(result.current.feedback.b.kind).toBe('error');

    act(() => { result.current.dismiss('b'); });
    expect(result.current.feedback.b).toBeUndefined();
  });
});
