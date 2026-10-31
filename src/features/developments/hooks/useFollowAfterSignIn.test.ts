import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const ctx = vi.hoisted(() => ({ state: { isAuthModalOpen: false }, dispatch: vi.fn() }));
vi.mock('@/context/AppContext', () => ({ useAppContext: () => ctx }));

import { useFollowAfterSignIn } from './useFollowAfterSignIn';

// The test setup stubs sessionStorage with vi.fn()s; back it with a real map here.
const store = new Map<string, string>();
const storage = window.sessionStorage as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  store.clear();
  storage.getItem.mockImplementation((k: string) => store.get(k) ?? null);
  storage.setItem.mockImplementation((k: string, v: string) => void store.set(k, v));
  storage.removeItem.mockImplementation((k: string) => void store.delete(k));
  ctx.state.isAuthModalOpen = false;
  ctx.dispatch.mockReset();
});

type Props = { isAuthed: boolean; isKnown: boolean; following: boolean };
const setup = (follow: () => void, initial: Props) =>
  renderHook((p: Props) => useFollowAfterSignIn('plaza', p, follow), { initialProps: initial });

describe('useFollowAfterSignIn', () => {
  it('opens sign-in over the page, then follows once the user is signed in', () => {
    const follow = vi.fn();
    const { result, rerender } = setup(follow, { isAuthed: false, isKnown: false, following: false });
    act(() => result.current());
    expect(ctx.dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
    expect(JSON.parse(store.get('be:authReturn') as string).value).toBe(window.location.pathname + window.location.search);

    rerender({ isAuthed: true, isKnown: false, following: false });
    expect(follow).not.toHaveBeenCalled(); // waits for the follow status
    rerender({ isAuthed: true, isKnown: true, following: false });
    expect(follow).toHaveBeenCalledTimes(1);
    rerender({ isAuthed: true, isKnown: true, following: false });
    expect(follow).toHaveBeenCalledTimes(1);
  });

  it('never overwrites a follow that already exists', () => {
    const follow = vi.fn();
    const { result, rerender } = setup(follow, { isAuthed: false, isKnown: false, following: false });
    act(() => result.current());
    rerender({ isAuthed: true, isKnown: true, following: true });
    expect(follow).not.toHaveBeenCalled();
  });

  it('closing sign-in without signing in drops the request', () => {
    const follow = vi.fn();
    const { result, rerender } = setup(follow, { isAuthed: false, isKnown: false, following: false });
    act(() => result.current());
    ctx.state.isAuthModalOpen = true;
    rerender({ isAuthed: false, isKnown: false, following: false });
    ctx.state.isAuthModalOpen = false;
    rerender({ isAuthed: false, isKnown: false, following: false });
    rerender({ isAuthed: true, isKnown: true, following: false });
    expect(follow).not.toHaveBeenCalled();
    expect(store.has('be:authReturn')).toBe(false);
  });
});
