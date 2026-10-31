/**
 * Unsaved-changes protection for the region editor:
 * - `useBeforeUnloadGuard(dirty)` — the browser's own prompt on reload/close.
 * - `useConfirmDiscard()` — an in-app "discard changes?" confirmation.
 * - `<RouterLeaveGuard dirty />` — blocks in-app navigation while dirty. It is
 *   a no-op outside a data router (e.g. in tests), where `useBlocker` is
 *   unavailable.
 */
import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router-dom';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';

export function useBeforeUnloadGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);
}

/** Resolves true when the owner agrees to throw away unsaved region edits. */
export function useConfirmDiscard() {
  const { t } = useTranslation('developments');
  const { confirm } = useConfirmation();
  return useCallback(
    () =>
      confirm({
        title: t('editor.unsaved.title', 'Discard unsaved changes?'),
        message: t('editor.unsaved.message', 'You have region edits that are not saved. If you continue they will be lost.'),
        confirmLabel: t('editor.unsaved.discard', 'Discard changes'),
        cancelLabel: t('editor.unsaved.keep', 'Keep editing'),
        type: 'warning',
      }),
    [confirm, t]
  );
}

const BlockerPrompt: React.FC<{ dirty: boolean }> = ({ dirty }) => {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  const confirmDiscard = useConfirmDiscard();
  const live = useRef({ blocker, confirmDiscard });
  live.current = { blocker, confirmDiscard };
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    live.current.confirmDiscard().then((ok) => {
      const b = live.current.blocker;
      if (b.state !== 'blocked') return;
      if (ok) b.proceed();
      else b.reset();
    });
  }, [blocker.state]);
  return null;
};

export const RouterLeaveGuard: React.FC<{ dirty: boolean }> = ({ dirty }) => {
  const dataRouter = useContext(UNSAFE_DataRouterContext);
  return dataRouter ? <BlockerPrompt dirty={dirty} /> : null;
};
