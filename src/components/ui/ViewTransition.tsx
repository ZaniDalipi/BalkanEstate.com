import React, { memo, useEffect, useRef, useState, createContext, useContext, useCallback } from 'react';

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
 * Determine the best transition animation for a given navigation
 */
function resolveTransitionClass(
  direction: NavigationDirection,
  viewKey: string,
): string {
  // Check if entering a detail page
  const isDetail = DETAIL_VIEWS.has(viewKey) ||
    viewKey.startsWith('property-') ||
    viewKey.startsWith('agency-') ||
    viewKey.startsWith('agent-');

  if (isDetail) return 'animate-page-enter-up';

  // Check if entering a morph-style page
  if (MORPH_VIEWS.has(viewKey)) return 'animate-page-morph';

  // Direction-based
  if (direction === 'back') return 'animate-page-enter-back';
  if (direction === 'up') return 'animate-page-enter-up';
  if (direction === 'morph') return 'animate-page-morph';

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
  const [direction, setDirection] = useState<NavigationDirection>('forward');
  const historyLength = useRef(window.history.length);

  useEffect(() => {
    const handlePopState = () => {
      // Browser back/forward — determine direction by comparing history lengths
      const newLength = window.history.length;
      if (newLength <= historyLength.current) {
        setDirection('back');
      } else {
        setDirection('forward');
      }
      historyLength.current = newLength;
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSetDirection = useCallback((dir: NavigationDirection) => {
    setDirection(dir);
  }, []);

  return (
    <NavigationContext.Provider value={{ direction, setDirection: handleSetDirection }}>
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
  const [transitionClass, setTransitionClass] = useState('animate-page-enter');

  useEffect(() => {
    if (prevKeyRef.current !== viewKey) {
      // A navigation happened — resolve the right animation
      const animClass = resolveTransitionClass(direction, viewKey);
      setTransitionClass(animClass);
      prevKeyRef.current = viewKey;

      // Reset direction to forward after applying (so next programmatic nav defaults to forward)
      setDirection('forward');
    }
  }, [viewKey, direction, setDirection]);

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
