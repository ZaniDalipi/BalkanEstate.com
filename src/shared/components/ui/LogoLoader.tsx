import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDesktopPointer } from '@/src/hooks/useMediaQuery';
import { CircleSpinner } from './CircleSpinner';
import { FloatingLogoLoader } from './FloatingLogoLoader';

interface LogoLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  /** Show the BALKANESTATE wordmark. */
  showText?: boolean;
}

/**
 * Full-area loader, one per kind of device:
 *
 * - **Desktop:** the official logo floating (FloatingLogoLoader).
 * - **Phones and tablets:** the circular spinner, the same as the boot screen.
 *   A floating logo is heavier to draw, and on a phone a plain circle reads as
 *   "loading" at a glance.
 *
 * Every page loader (route fallbacks, Suspense fallbacks, LoadingOverlay)
 * goes through here, so the choice is made in one place.
 */
export const LogoLoader: React.FC<LogoLoaderProps> = ({ size = 'md', showText = true }) => {
  const { t } = useTranslation();
  const desktop = useDesktopPointer();
  if (desktop) return <FloatingLogoLoader size={size} showText={showText} />;

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
