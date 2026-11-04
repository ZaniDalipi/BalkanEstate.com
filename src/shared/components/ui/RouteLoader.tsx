import React, { useEffect, useState } from 'react';
import { CircleSpinner } from './CircleSpinner';

interface RouteLoaderProps {
  /** Fill the viewport rather than the content area. */
  fullScreen?: boolean;
  /** Override the grace period, in ms. */
  delayMs?: number;
}

/**
 * The one loader every route transition uses.
 *
 * 1. **It waits.** A route whose chunk is already cached resolves in a frame or
 *    two, and a spinner shown for 80ms reads as a glitch, not as progress.
 *    Nothing renders until the grace period is up, so a fast navigation goes
 *    straight from one page to the next.
 * 2. **It is the same circle everywhere** — the boot screen, the route
 *    fallback and the page's own data loading — so the indicator never changes
 *    shape mid-load.
 */
export const RouteLoader: React.FC<RouteLoaderProps> = ({ fullScreen = false, delayMs = 200 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  return (
    <div
      className={`flex items-center justify-center ${fullScreen ? 'w-screen h-screen bg-white' : 'min-h-[50vh] w-full'}`}
      aria-busy="true"
    >
      {visible && (
        <div className="animate-fade-in">
          <CircleSpinner size="md" />
        </div>
      )}
    </div>
  );
};

export default RouteLoader;
