import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRememberSignInOrigin } from './useRememberSignInOrigin';
import { takeReturnPath } from '@/src/shared/auth/authReturn';

// The test setup stubs sessionStorage with vi.fn()s; back it with a real map here.
const store = new Map<string, string>();
const storage = window.sessionStorage as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  store.clear();
  storage.getItem.mockImplementation((k: string) => store.get(k) ?? null);
  storage.setItem.mockImplementation((k: string, v: string) => void store.set(k, v));
  storage.removeItem.mockImplementation((k: string) => void store.delete(k));
});

describe('useRememberSignInOrigin', () => {
  it('remembers the page the sign-in window opens over, so sign-in returns there', () => {
    window.history.replaceState(null, '', '/en/property/KMq8VER?photo=3');
    renderHook(() => useRememberSignInOrigin());
    expect(takeReturnPath()).toBe('/en/property/KMq8VER?photo=3');
  });

  it('remembers nothing when opened by the /login entry point', () => {
    window.history.replaceState(null, '', '/en/login');
    renderHook(() => useRememberSignInOrigin());
    expect(takeReturnPath()).toBeNull();
  });
});
