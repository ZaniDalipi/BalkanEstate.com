import React, { lazy, Suspense } from 'react';

const NotificationCenter = lazy(() => import('@/src/shared/components/NotificationCenter'));

/**
 * The notification bell on the phone home page, which has no top bar: a
 * floating round button in the top-right corner, matching the menu button
 * opposite it. Signed-in users only (the caller decides). No backdrop blur
 * here: it would make this wrapper the box the list's `position: fixed` is
 * measured from, squeezing the list into the button's width.
 */
export const MobileHomeBell: React.FC = () => (
  <div
    className="md:hidden fixed z-[200] rounded-full border border-neutral-200/60 bg-white shadow-lg"
    style={{
      top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
      right: 'calc(env(safe-area-inset-right, 0px) + 12px)',
    }}
  >
    <Suspense fallback={<span className="block h-11 w-11" aria-hidden="true" />}>
      <NotificationCenter />
    </Suspense>
  </div>
);
