import React from 'react';
import { CircleSpinner } from '@/src/shared/components/ui/CircleSpinner';
import { useNavigationActivity } from '@/src/app/navigation/useNavigationActivity';
import { usePageSpinnerVisible } from '@/src/shared/components/ui/pageSpinnerStore';

/**
 * A small spinning circle near the top of the screen whenever a page change
 * is loading: opening a listing, going back, switching section — from the tap
 * until the new page is showing and has fetched its data.
 *
 * The page underneath stays visible and usable; this only says work is going
 * on. It steps aside while the page shows its own big loader, sits just below
 * the mobile top bar (~4rem, plus the notch via `--floating-search-top-pad`)
 * so it never covers the title, and ignores touches so it never blocks the
 * page.
 */
export const NavigationPendingIndicator: React.FC = () => {
  const loading = useNavigationActivity();
  const pageSpinnerShown = usePageSpinnerVisible();
  if (!loading || pageSpinnerShown) return null;

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
