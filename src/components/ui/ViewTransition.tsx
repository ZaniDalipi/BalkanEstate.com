import React, { memo, useRef, useState, createContext, useContext, useCallback, useMemo, useEffect, useLayoutEffect } from 'react';
import {
  installNavigationHistory,
  setNavigationDirection,
  consumeNavigationDirection,
  type NavigationDirection,
} from '@/app/navigation/navHistory';
import {
  isPageTransitionRunning,
  notifyViewCommitted,
  setPageTransitionMotion,
} from '@/app/navigation/pageTransition';
import { useSwipeBack } from '@/app/navigation/useSwipeBack';

// Patch history and start tracking direction before React renders anything, so
// our popstate listener is ahead of the app's own routing listener.
installNavigationHistory();

// ============================================================================
// Navigation Direction Tracking
// ============================================================================

interface NavigationContextType {
  setDirection: (dir: NavigationDirection) => void;
}

const NavigationContext = createContext<NavigationContextType>({
  setDirection: setNavigationDirection,
});

export function useNavigationDirection() {
  return useContext(NavigationContext);
}

/**
 * Form-like views presented as a sheet: they slide up from the bottom, the way
 * a modal composer does, because they are a task you finish and dismiss rather
 * than a place you navigated to.
 */
const SHEET_VIEWS = new Set([
  'create-listing',
  'create-rental',
  'edit-listing',
]);

/** Views that are a change of context rather than a step deeper — cross-fade. */
const MORPH_VIEWS = new Set([
  'account',
  'admin',
  'agency-dashboard',
  'city-dashboard',
  'inbox',
]);

/**
 * Pick the motion for a navigation: how the arriving view should move, and —
 * when the browser is animating the pair — how the one it replaces should
 * leave.
 *
 * Detail views (a listing, an agency, an agent) deliberately fall through to
 * the default horizontal push: it is the platform convention for "a level
 * deeper", it pairs with the edge swipe that takes you back out, and its
 * reverse is unambiguous. They used to slide up, which read as a modal and left
 * the back gesture with no matching motion.
 */
function resolveMotion(direction: NavigationDirection, viewKey: string): NavigationDirection {
  if (direction !== 'forward') return direction;
  if (SHEET_VIEWS.has(viewKey)) return 'up';
  if (MORPH_VIEWS.has(viewKey)) return 'morph';
  return 'forward';
}

const MOTION_CLASS: Record<NavigationDirection, string> = {
  forward: 'animate-page-enter',
  back: 'animate-page-enter-back',
  up: 'animate-page-enter-up',
  morph: 'animate-page-morph',
};

/**
 * The class that animates this arrival, or none when a paired transition is
 * already animating it: the browser is holding a snapshot of the outgoing page
 * against one of this one, and the page underneath has to sit still while they
 * move. An entrance on top of that animates the same arrival twice, half a
 * frame apart.
 */
function resolveTransitionClass(motion: NavigationDirection): string {
  return isPageTransitionRunning() ? '' : MOTION_CLASS[motion];
}

// ============================================================================
// NavigationProvider — exposes the direction setter
// ============================================================================

export const NavigationProvider = memo(function NavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Stable for the life of the app: setting a direction writes to module state
  // (see navHistory) instead of React state, so telling the app which way to
  // animate no longer costs a full re-render on top of the navigation itself.
  const contextValue = useMemo(() => ({ setDirection: setNavigationDirection }), []);

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
});

// ============================================================================
// ViewTransition — animated wrapper for page-level transitions
// ============================================================================

interface ViewTransitionProps {
  children: React.ReactNode;
  viewKey: string;
  className?: string;
}

/** Longest page keyframe, plus a margin. Backstop for a missed animationend. */
const MAX_TRANSITION_MS = 600;

export const ViewTransition = memo(function ViewTransition({
  children,
  viewKey,
  className = '',
}: ViewTransitionProps) {
  const nodeRef = useRef<HTMLDivElement>(null);

  // Derived-from-props state: resolve the animation in the same render that
  // sees the new key, so the first paint already carries it. Anything later
  // (an effect, a microtask) paints one frame of the new page at its resting
  // position first, which is the flicker this is here to avoid.
  const [transition, setTransition] = useState(() => ({
    key: viewKey,
    animation: '' as string,
  }));

  // Resolving consumes the pending direction, so it must happen exactly once
  // per key even though React can call a render more than once for the same
  // state — StrictMode does so on every render in development, and the second
  // pass would otherwise find the direction already spent and fall back to
  // 'forward'. The refs memoise the answer for the key currently being
  // resolved, which is the standard shape for a render-phase computation with a
  // one-shot input.
  const resolvedKeyRef = useRef<string | null>(null);
  const resolvedAnimationRef = useRef('');
  const motionRef = useRef<NavigationDirection>('forward');

  if (transition.key !== viewKey) {
    if (resolvedKeyRef.current !== viewKey) {
      resolvedKeyRef.current = viewKey;
      motionRef.current = resolveMotion(consumeNavigationDirection(), viewKey);
      resolvedAnimationRef.current = resolveTransitionClass(motionRef.current);
    }
    setTransition({ key: viewKey, animation: resolvedAnimationRef.current });
  }

  // Drop the class once the animation is over. While it is on, the wrapper
  // carries a transform, which makes it a containing block for every
  // `position: fixed` child — the property page's contact bar, the sticky ad,
  // any modal — and its own compositing layer. Clearing it puts those back
  // against the viewport the moment the motion is done.
  const clearAnimation = useCallback(() => {
    setTransition((current) => (current.animation ? { ...current, animation: '' } : current));
  }, []);

  useEffect(() => {
    if (!transition.animation) return;
    const timer = window.setTimeout(clearAnimation, MAX_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [transition.animation, transition.key, clearAnimation]);

  // Hand a paired transition the motion this arrival calls for, then tell it the
  // view is on screen so it can capture and start animating. A navigation opens
  // before anything knows which view it lands on, so this is where a page
  // presented as a sheet asks to rise rather than to slide.
  //
  // Layout effect, not passive: the capture happens as soon as this returns, and
  // a passive effect can be deferred past a frame. Effect, not render: a render
  // React discards must not leave a direction behind on the document.
  useLayoutEffect(() => {
    setPageTransitionMotion(motionRef.current);
    notifyViewCommitted();
  }, [transition.key]);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);
  useSwipeBack(nodeRef, goBack);

  return (
    // No `key` here on purpose: the wrapper must outlive the view so the swipe
    // listeners stay bound to a stable node. Remounting on view change is the
    // job of the keyed ErrorBoundary inside it.
    <div
      ref={nodeRef}
      className={`h-full ${transition.animation} ${className}`}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) clearAnimation();
      }}
    >
      {children}
    </div>
  );
});

export default ViewTransition;
