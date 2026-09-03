import React, { useEffect, useState } from 'react';
import { LogoLoader } from './LogoLoader';

interface RouteLoaderProps {
  /** Fill the viewport rather than the content area. */
  fullScreen?: boolean;
  /** Override the grace period, in ms. */
  delayMs?: number;
}

/**
 * The one loader every route transition uses.
 *
 * Two things it does that a bare `<LogoLoader />` fallback did not:
 *
 * 1. **It waits.** A route whose chunk is already cached resolves in a frame or
 *    two, and showing a full-screen logo for 80ms reads as a glitch, not as
 *    progress. Nothing renders until the grace period is up, so a fast
 *    navigation goes straight from one page to the next.
 * 2. **It is the same component everywhere.** Route loading used to hand off
 *    between three different configurations — `md` with text, `md` without,
 *    `lg` with — so the logo changed size and the wordmark appeared and
 *    vanished mid-load. One component, one size, one appearance.
 */
export const RouteLoader: React.FC<RouteLoaderProps> = ({ fullScreen = false, delayMs = 200 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  return (
    <div
      className={`flex items-center justify-center ${fullScreen ? 'w-screen h-screen bg-neutral-50' : 'min-h-[50vh] w-full'}`}
      aria-busy="true"
      aria-live="polite"
    >
      {visible && (
        <div className="animate-fade-in">
          <LogoLoader size="md" showText={false} />
        </div>
      )}
    </div>
  );
};

export default RouteLoader;
