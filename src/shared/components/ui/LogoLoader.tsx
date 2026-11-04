import React from 'react';
import { useTranslation } from 'react-i18next';
import { CircleSpinner } from './CircleSpinner';

interface LogoLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  /** Show the BALKANESTATE wordmark under the spinner. */
  showText?: boolean;
}

/**
 * Full-area loader: the circular spinner, optionally with the wordmark.
 *
 * It used to be two buildings bouncing under an animated drop-shadow glow.
 * Animating `filter` repaints every frame, which on phones (Safari above all)
 * stuttered exactly when the next page was being mounted, and the bounce read
 * as the screen flickering. The name is kept so existing callers (Suspense
 * fallbacks, LoadingOverlay) all get the same circle without changes.
 */
export const LogoLoader: React.FC<LogoLoaderProps> = ({ size = 'md', showText = true }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-4">
      <CircleSpinner size={size} />
      {showText && (
        <span className="text-xs font-semibold tracking-[0.2em] text-blue-400" aria-hidden="true">
          {t('common:ui.logoLoader.balkanestate', 'BALKANESTATE')}
        </span>
      )}
    </div>
  );
};
