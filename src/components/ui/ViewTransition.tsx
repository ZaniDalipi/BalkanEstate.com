import React, { memo, useRef, useCallback } from 'react';
import { installNavigationHistory } from '@/app/navigation/navHistory';
import { useSwipeBack } from '@/app/navigation/useSwipeBack';

// Patch history and start tracking direction before the router is created, so
// our popstate listener runs ahead of React Router's own.
installNavigationHistory();

// ============================================================================
// ViewTransition — the page wrapper
// ============================================================================

interface ViewTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper around the active page.
 *
 * It deliberately animates nothing. Pages used to arrive with an entrance
 * animation, and history steps ran through the browser's View Transitions API
 * so the outgoing page slid away under the incoming one. Both cost real time in
 * front of every navigation — the paired transition also held the document's
 * rendering suspended while it waited for the new view to commit — and a tap
 * that has visibly done nothing for a tenth of a second reads as a slow app,
 * however smooth the motion that follows. The view now swaps in the commit that
 * the navigation triggers, and nothing is played over it.
 *
 * What is left is the part that was never decoration: a stable node for the
 * edge-swipe back gesture to bind to. It takes no `viewKey` any more — with no
 * motion to resolve, nothing here needs to know which view it is holding.
 */
export const ViewTransition = memo(function ViewTransition({
  children,
  className = '',
}: ViewTransitionProps) {
  const nodeRef = useRef<HTMLDivElement>(null);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);
  useSwipeBack(nodeRef, goBack);

  return (
    // No `key` here on purpose: the wrapper must outlive the view so the swipe
    // listeners stay bound to a stable node. Remounting on view change is the
    // job of the keyed ErrorBoundary inside it.
    <div ref={nodeRef} className={`h-full ${className}`}>
      {children}
    </div>
  );
});

export default ViewTransition;
