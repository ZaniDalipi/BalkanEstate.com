import React from 'react';

export interface BandBadgeProps {
  label: string;
  /** Tailwind classes for the pill and its dot. */
  badge: string;
  dot: string;
}

/** A coloured pill naming the band a reading falls in ("Fair", "Noisy"…). */
const BandBadge: React.FC<BandBadgeProps> = ({ label, badge, dot }) => (
  <span className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${badge}`}>
    <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${dot}`} />
    {label}
  </span>
);

export default BandBadge;
