import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { decideDrawStart, shouldResumeDraw } from '../../utils/drawLoginGate';

interface DrawLoginGateInput {
  isDrawing: boolean;
  isAuthenticated: boolean;
  /** The map's own Draw toggle (start / cancel drawing). */
  onDrawStart: () => void;
}

/**
 * Puts "log in first" in front of the Draw button for logged-out users.
 * Returns the Draw handler to give the map, and the prompt's state/actions.
 * Logging in from the prompt starts drawing straight away; "Draw Without
 * Saving" draws now and isn't asked again while the map is open.
 */
export function useDrawLoginGate({ isDrawing, isAuthenticated, onDrawStart }: DrawLoginGateInput) {
  const { state, dispatch } = useAppContext();
  const modalOpen = state.isAuthModalOpen;
  const [isPromptOpen, setPromptOpen] = useState(false);
  const [skipLogin, setSkipLogin] = useState(false);
  const pending = useRef(false);
  const closedAt = useRef<number | null>(null);
  const startDraw = useRef(onDrawStart);
  startDraw.current = onDrawStart;

  const requestDraw = useCallback(() => {
    if (decideDrawStart({ isDrawing, isAuthenticated, skipLogin }) === 'toggle') {
      startDraw.current();
      return;
    }
    setPromptOpen(true);
  }, [isDrawing, isAuthenticated, skipLogin]);

  const logIn = useCallback(() => {
    setPromptOpen(false);
    pending.current = true;
    closedAt.current = null;
    dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
  }, [dispatch]);

  const drawWithoutSaving = useCallback(() => {
    setPromptOpen(false);
    setSkipLogin(true);
    startDraw.current();
  }, []);

  const dismiss = useCallback(() => setPromptOpen(false), []);

  // Remember when the login dialog closes; a login just after still counts.
  useEffect(() => {
    if (!modalOpen && pending.current && closedAt.current === null) closedAt.current = Date.now();
  }, [modalOpen]);

  // Logged in from the prompt: carry on with what they wanted, drawing.
  useEffect(() => {
    const resume = shouldResumeDraw({
      pending: pending.current,
      isAuthenticated,
      isDrawing,
      modalOpen,
      closedAt: closedAt.current,
      now: Date.now(),
    });
    if (isAuthenticated || resume) pending.current = false;
    if (resume) startDraw.current();
  }, [isAuthenticated, isDrawing, modalOpen]);

  return { requestDraw, isPromptOpen, logIn, drawWithoutSaving, dismiss };
}
