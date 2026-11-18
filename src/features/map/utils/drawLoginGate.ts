/**
 * Drawing a search area while logged out: ask to log in first, because only a
 * logged-in user can save the area. These rules are pure so they are tested
 * without rendering.
 */

/** How long after the login dialog closes a fresh login still counts as "from the prompt". */
export const RESUME_GRACE_MS = 3000;

export type DrawStartDecision = 'toggle' | 'ask-login';

/**
 * What tapping Draw does. Cancelling a drawing, a logged-in user, or someone
 * who already chose "Draw Without Saving" goes straight through.
 */
export function decideDrawStart(s: { isDrawing: boolean; isAuthenticated: boolean; skipLogin: boolean }): DrawStartDecision {
  return s.isDrawing || s.isAuthenticated || s.skipLogin ? 'toggle' : 'ask-login';
}

/**
 * Whether to start drawing now that the user is logged in: only when they
 * asked to log in from the prompt, and the login came while the dialog was
 * open or just after it closed (it closes itself on success). A login much
 * later, from somewhere else, must not start drawing out of the blue.
 */
export function shouldResumeDraw(s: {
  pending: boolean;
  isAuthenticated: boolean;
  isDrawing: boolean;
  modalOpen: boolean;
  closedAt: number | null;
  now: number;
}): boolean {
  if (!s.pending || !s.isAuthenticated || s.isDrawing) return false;
  if (s.modalOpen || s.closedAt === null) return true;
  return s.now - s.closedAt <= RESUME_GRACE_MS;
}
