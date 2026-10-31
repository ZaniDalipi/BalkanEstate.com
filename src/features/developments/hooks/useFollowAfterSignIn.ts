import { useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { forgetIntent, forgetReturnPath, rememberIntent, rememberReturnPath, takeIntent } from '@/src/shared/auth/authReturn';

/**
 * "Sign in to follow" without losing the residence: opens the sign-in window
 * over the page and has sign-in come back to it (also after Google/Apple, see
 * authReturn), and once
 * the user is signed in, follows the residence they asked to follow. Closing
 * the sign-in window without signing in drops the request.
 */
interface FollowStatus {
  isAuthed: boolean;
  /** The server has said whether the user already follows it. */
  isKnown: boolean;
  following: boolean;
}

export function useFollowAfterSignIn(slug: string, { isAuthed, isKnown, following }: FollowStatus, follow: () => void) {
  const { state, dispatch } = useAppContext();
  const followRef = useRef(follow);
  followRef.current = follow;

  useEffect(() => {
    // Wait for the follow status, so an existing follow (and its settings) is never overwritten.
    if (!isAuthed || !isKnown) return;
    if (takeIntent('follow-residence', slug) && !following) followRef.current();
  }, [isAuthed, isKnown, following, slug]);

  const modalOpen = state.isAuthModalOpen;
  const wasOpen = useRef(modalOpen);
  useEffect(() => {
    if (wasOpen.current && !modalOpen && !isAuthed) {
      forgetIntent();
      forgetReturnPath();
    }
    wasOpen.current = modalOpen;
  }, [modalOpen, isAuthed]);

  return () => {
    rememberReturnPath();
    rememberIntent({ kind: 'follow-residence', key: slug });
    dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
  };
}
