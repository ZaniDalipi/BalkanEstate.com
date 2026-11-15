import React from 'react';

const SHIMMER = 'absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent';

/** Placeholder cards in the shape of BusinessCard while listings load. */
const BusinessGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="liquid-surface overflow-hidden rounded-[28px]">
        <div className="relative h-20 overflow-hidden bg-neutral-200 sm:h-24">
          <div className={SHIMMER} />
        </div>
        <div className="-mt-8 px-4 sm:px-5">
          <div className="relative h-14 w-14 overflow-hidden rounded-xl border-4 border-white bg-neutral-200">
            <div className={SHIMMER} style={{ animationDelay: `${i * 150}ms` }} />
          </div>
        </div>
        <div className="space-y-2.5 p-4 pt-3">
          <div className="relative h-5 w-3/4 overflow-hidden rounded-lg bg-neutral-200">
            <div className={SHIMMER} style={{ animationDelay: `${i * 150 + 100}ms` }} />
          </div>
          <div className="h-3 w-1/2 rounded bg-neutral-100" />
          <div className="h-3 w-full rounded bg-neutral-100" />
          <div className="h-3 w-2/3 rounded bg-neutral-100" />
        </div>
        <div className="flex justify-between border-t border-neutral-100 px-4 py-3">
          <div className="h-3 w-1/3 rounded bg-neutral-100" />
          <div className="h-3 w-1/4 rounded bg-neutral-100" />
        </div>
      </div>
    ))}
  </div>
);

export default BusinessGridSkeleton;
