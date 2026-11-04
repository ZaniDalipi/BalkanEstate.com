import React from 'react';
import { useTranslation } from 'react-i18next';
import { spinnerPhaseDelay } from './spinnerPhase';

export type CircleSpinnerSize = 'sm' | 'md' | 'lg';

interface CircleSpinnerProps {
  size?: CircleSpinnerSize;
  /** Accessible name; defaults to the translated "Loading...". */
  label?: string;
  className?: string;
}

/** Diameter in px, matched to the boot spinner in index.html (40px) at `md`. */
const SIZE_PX: Record<CircleSpinnerSize, number> = { sm: 28, md: 40, lg: 52 };

/**
 * The app's one loading indicator: a blue arc going round a light grey ring.
 *
 * It is the same circle the HTML boot screen shows before React loads, so a
 * cold start goes boot spinner → route spinner → page without the indicator
 * ever changing shape. Only `transform: rotate` is animated, which runs on the
 * compositor in Safari, Chrome and installed PWAs alike and never repaints,
 * even while the main thread is busy mounting the next page.
 */
export const CircleSpinner: React.FC<CircleSpinnerProps> = ({ size = 'md', label, className = '' }) => {
  const { t } = useTranslation('common');
  const px = SIZE_PX[size];
  // Seeded once per mount: a remount (route chunk → page data) carries on
  // from the same angle instead of jumping back to 12 o'clock.
  const delay = spinnerPhaseDelay();

  return (
    <span
      role="status"
      aria-label={label ?? t('loading', 'Loading...')}
      className={`be-circle-spinner inline-block shrink-0 ${className}`}
      style={{ width: px, height: px, borderWidth: Math.max(2, Math.round(px / 13)), animationDelay: delay }}
    />
  );
};

export default CircleSpinner;
