import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ASK_COOLDOWN_MS, MAX_QUESTIONS_PER_VISIT, errorReason, useAskBusiness } from './useAskBusiness';

const h = vi.hoisted(() => ({ askBusiness: vi.fn() }));
vi.mock('../api/businessExtrasApi', () => ({ askBusiness: (...a: unknown[]) => h.askBusiness(...a) }));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>
);

/** Let the mutation settle, then let the cooldown run out. */
const settleAndWait = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ASK_COOLDOWN_MS);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  h.askBusiness.mockReset().mockResolvedValue({ answer: 'Yes.', action: 'none' });
});
afterEach(() => vi.useRealTimers());

describe('errorReason', () => {
  it('tells a burst (wait) from a limit and from an outage', () => {
    expect(errorReason({ statusCode: 429, details: { reason: 'burst', retryAfterSeconds: 42 } })).toEqual({ reason: 'wait', retryAfterSeconds: 42 });
    expect(errorReason({ statusCode: 429, details: { reason: 'daily' } })).toEqual({ reason: 'limited' });
    expect(errorReason({ statusCode: 503, details: { reason: 'busy' } })).toEqual({ reason: 'unavailable' });
    expect(errorReason(new Error('network'))).toEqual({ reason: 'unavailable' });
  });
});

describe('useAskBusiness pacing', () => {
  it('ignores a second question during the cooldown', async () => {
    const { result } = renderHook(() => useAskBusiness('regina'), { wrapper });
    act(() => result.current.ask('Open Saturday?'));
    act(() => result.current.ask('Open Saturday?'));
    expect(result.current.canAsk).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(h.askBusiness).toHaveBeenCalledTimes(1);
    expect(result.current.canAsk).toBe(false); // answered, but still pausing
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ASK_COOLDOWN_MS);
    });
    expect(result.current.canAsk).toBe(true);
  });

  it(`stops after ${MAX_QUESTIONS_PER_VISIT} questions in one visit`, async () => {
    const { result } = renderHook(() => useAskBusiness('regina'), { wrapper });
    for (let i = 0; i < MAX_QUESTIONS_PER_VISIT; i++) {
      act(() => result.current.ask(`Question ${i}`));
      await settleAndWait();
    }
    expect(result.current.remaining).toBe(0);
    expect(result.current.canAsk).toBe(false);
    act(() => result.current.ask('One more?'));
    expect(h.askBusiness).toHaveBeenCalledTimes(MAX_QUESTIONS_PER_VISIT);
  });
});
