import React, { memo, useRef, useState, createContext, useContext, useCallback, useMemo } from 'react';

// ============================================================================
// Navigation Direction Tracking
// ============================================================================

type NavigationDirection = 'forward' | 'back' | 'up' | 'morph';

interface NavigationContextType {
  direction: NavigationDirection;
  setDirection: (dir: NavigationDirection) => void;
}

const NavigationContext = createContext<NavigationContextType>({
  direction: 'forward',
  setDirection: () => {},
});

export function useNavigationDirection() {
  return useContext(NavigationContext);
}

// Detail views that should animate from bottom (slide up)
const DETAIL_VIEWS = new Set([
  'property-detail',
  'agent-detail',
  'agency-detail',
  'edit-listing',
  'city-dashboard',
]);

// Views that should use morph (scale from center) animation
const MORPH_VIEWS = new Set([
  'account',
  'admin',
  'agency-dashboard',
  'create-listing',
  'create-rental',
  'inbox',
]);

/**
 * Determine the best transition animation for a given navigation.
 * Priority: explicit direction > view-type auto-detection > default forward
 */
function resolveTransitionClass(
  direction: NavigationDirection,
  viewKey: string,
): string {
  // Explicit back direction always wins (e.g., back button pressed)
  if (direction === 'back') return 'animate-page-enter-back';

  // Explicit direction from caller
  if (direction === 'up') return 'animate-page-enter-up';
  if (direction === 'morph') return 'animate-page-morph';

  // Auto-detect based on view type when direction is 'forward' (default)
  const isDetail = DETAIL_VIEWS.has(viewKey) ||
    viewKey.startsWith('property-') ||
    viewKey.startsWith('agency-') ||
    viewKey.startsWith('agent-');

  if (isDetail) return 'animate-page-enter-up';
  if (MORPH_VIEWS.has(viewKey)) return 'animate-page-morph';

  return 'animate-page-enter';
}

// ============================================================================
// NavigationProvider — Tracks navigation direction globally
// ============================================================================

export const NavigationProvider = memo(function NavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use a ref so popstate reads the latest direction synchronously
  const directionRef = useRef<NavigationDirection>('forward');
  const [direction, setDirectionState] = useState<NavigationDirection>('forward');

  const setDirection = useCallback((dir: NavigationDirection) => {
    directionRef.current = dir;
    setDirectionState(dir);
  }, []);

  // Track our own position in the history stack to detect back vs forward.
  // We intercept pushState/replaceState to maintain a counter, and compare
  // on popstate to reliably determine direction.
  const historyIndexRef = useRef(0);

  // One-time setup: monkey-patch pushState/replaceState and listen to popstate
  const setupDone = useRef(false);
  if (!setupDone.current) {
    setupDone.current = true;

    // Store our position index in history.state so popstate can read it
    const currentState = window.history.state;
    const initialIndex = (currentState && typeof currentState.__navIdx === 'number')
      ? currentState.__navIdx
      : 0;
    historyIndexRef.current = initialIndex;

    // If current state doesn't have our index, inject it
    if (!currentState || typeof currentState.__navIdx !== 'number') {
      window.history.replaceState({ ...currentState, __navIdx: initialIndex }, '');
    }

    // Intercept pushState to track forward navigation index
    const origPush = window.history.pushState.bind(window.history);
    window.history.pushState = function(state: any, title: string, url?: string | URL | null) {
      historyIndexRef.current += 1;
      const augmented = { ...state, __navIdx: historyIndexRef.current };
      return origPush(augmented, title, url);
    };

    // Intercept replaceState to keep index in sync
    const origReplace = window.history.replaceState.bind(window.history);
    window.history.replaceState = function(state: any, title: string, url?: string | URL | null) {
      const augmented = { ...state, __navIdx: historyIndexRef.current };
      return origReplace(augmented, title, url);
    };

    // Listen for popstate (browser back/forward buttons)
    window.addEventListener('popstate', (e) => {
      const prevIdx = historyIndexRef.current;
      const newIdx = (e.state && typeof e.state.__navIdx === 'number')
        ? e.state.__navIdx
        : prevIdx - 1; // Assume back if no index found

      historyIndexRef.current = newIdx;

      // Only auto-set direction if no explicit direction was set programmatically
      // (i.e., this was triggered by browser back/forward button)
      if (directionRef.current === 'forward') {
        if (newIdx < prevIdx) {
          setDirection('back');
        }
        // If newIdx > prevIdx, keep 'forward' (which is already default)
      }
    });
  }

  const contextValue = useMemo(() => ({ direction, setDirection }), [direction, setDirection]);

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
});

// ============================================================================
// ViewTransition — Animated wrapper for page-level transitions
// ============================================================================

interface ViewTransitionProps {
  children: React.ReactNode;
  viewKey: string;
  className?: string;
}

export const ViewTransition = memo(function ViewTransition({
  children,
  viewKey,
  className = '',
}: ViewTransitionProps) {
  const { direction, setDirection } = useNavigationDirection();
  const prevKeyRef = useRef(viewKey);

  // Resolve animation class synchronously during render (not in useEffect)
  // so the first paint already has the correct animation applied.
  let transitionClass: string;
  if (prevKeyRef.current !== viewKey) {
    transitionClass = resolveTransitionClass(direction, viewKey);
    prevKeyRef.current = viewKey;
    // Schedule direction reset after this render cycle completes
    // so subsequent navigations default back to 'forward'
    queueMicrotask(() => setDirection('forward'));
  } else {
    // Same view — use current direction (initial render or no navigation)
    transitionClass = resolveTransitionClass(direction, viewKey);
  }

  return (
    <div
      key={viewKey}
      className={`h-full will-animate ${transitionClass} ${className}`}
    >
      {children}
    </div>
  );
});

export default ViewTransition;
