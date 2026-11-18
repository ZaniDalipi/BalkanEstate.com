import { describe, it, expect } from 'vitest';
import { decideDrawStart, shouldResumeDraw, RESUME_GRACE_MS } from './drawLoginGate';

describe('decideDrawStart', () => {
  it('asks a logged-out user to log in before drawing', () => {
    expect(decideDrawStart({ isDrawing: false, isAuthenticated: false, skipLogin: false })).toBe('ask-login');
  });
  it('lets logged-in users, cancels and "draw without saving" through', () => {
    expect(decideDrawStart({ isDrawing: false, isAuthenticated: true, skipLogin: false })).toBe('toggle');
    expect(decideDrawStart({ isDrawing: true, isAuthenticated: false, skipLogin: false })).toBe('toggle');
    expect(decideDrawStart({ isDrawing: false, isAuthenticated: false, skipLogin: true })).toBe('toggle');
  });
});

describe('shouldResumeDraw', () => {
  const base = { pending: true, isAuthenticated: true, isDrawing: false, modalOpen: true, closedAt: null, now: 10_000 };
  it('starts drawing after logging in from the prompt', () => {
    expect(shouldResumeDraw(base)).toBe(true);
    expect(shouldResumeDraw({ ...base, modalOpen: false, closedAt: 10_000 - RESUME_GRACE_MS })).toBe(true);
  });
  it('does nothing without a pending request, before login, or while drawing', () => {
    expect(shouldResumeDraw({ ...base, pending: false })).toBe(false);
    expect(shouldResumeDraw({ ...base, isAuthenticated: false })).toBe(false);
    expect(shouldResumeDraw({ ...base, isDrawing: true })).toBe(false);
  });
  it('ignores a login long after the dialog was closed', () => {
    expect(shouldResumeDraw({ ...base, modalOpen: false, closedAt: 10_000 - RESUME_GRACE_MS - 1 })).toBe(false);
  });
});
