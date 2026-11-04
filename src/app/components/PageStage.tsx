import React, { Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { NavigationPendingIndicator } from './NavigationPendingIndicator';
import { RouteLoader } from '@/src/shared/components/ui/RouteLoader';

interface PageStageProps {
  /** The page's identity; a new key gives the page a clean mount. */
  pageKey: string;
  children: React.ReactNode;
}

/**
 * Where the routed page is shown, and how one page hands over to the next.
 *
 * The Suspense boundary sits OUTSIDE the keyed ErrorBoundary on purpose. React
 * Router renders every navigation as a React transition, and a transition
 * never hides content an existing boundary is already showing: the current
 * page stays on screen until the next page's code has loaded, then the two
 * swap in one commit. With the boundary inside the keyed tree each page got a
 * brand-new boundary, which shows its fallback at once — the page went blank,
 * a loader blinked, then the page appeared. That blink was the flicker
 * between screens. Now only a cold start, with nothing to keep on screen,
 * shows the fallback; a slow navigation gets the small top spinner instead.
 */
export const PageStage: React.FC<PageStageProps> = ({ pageKey, children }) => (
  <>
    <NavigationPendingIndicator />
    <Suspense fallback={<RouteLoader />}>
      <ErrorBoundary level="route" key={pageKey}>
        {/* Fades the arriving page in (opacity only, see .be-page-fade). */}
        <div className="be-page-fade h-full">{children}</div>
      </ErrorBoundary>
    </Suspense>
  </>
);
