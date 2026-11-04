import React from 'react';
import { CircleSpinner } from '@/src/shared/components/ui/CircleSpinner';
import { useNavigationPending } from '@/src/app/navigation/useNavigationPending';

/**
 * A small spinning circle at the top of the screen while the next page loads.
 *
 * The current page stays visible and usable underneath; this only says the
 * tap was heard. It sits just below the mobile top bar (~4rem, plus the notch
 * via `--floating-search-top-pad`) so it never covers the title, and ignores
 * touches so it never blocks the page.
 */
export const NavigationPendingIndicator: React.FC = () => {
  const pending = useNavigationPending();
  if (!pending) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[9998] flex justify-center animate-fade-in"
      style={{ top: 'calc(var(--floating-search-top-pad) + 4rem)' }}
      data-testid="navigation-pending"
    >
      <span className="rounded-full bg-white/95 p-2 shadow-lg ring-1 ring-black/5">
        <CircleSpinner size="sm" />
      </span>
    </div>
  );
};
