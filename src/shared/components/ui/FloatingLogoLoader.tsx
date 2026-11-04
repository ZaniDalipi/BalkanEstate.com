import React from 'react';
import { useTranslation } from 'react-i18next';
import { spinnerPhaseDelay } from './spinnerPhase';

/** One float up and back, in seconds. Keep in step with `.be-logo-loader` in index.css. */
export const LOGO_FLOAT_S = 1.8;

/** The official logo: two 3D buildings over the BALKANESTATE wordmark. */
export const OFFICIAL_LOGO_SRC = '/icons/logo-3d-256.webp';

const SIZE_PX = { sm: 80, md: 120, lg: 160 } as const;

interface FloatingLogoLoaderProps {
  size?: keyof typeof SIZE_PX;
  /** Show the wordmark under the buildings. */
  showText?: boolean;
}

/**
 * The desktop page loader: the official logo, its buildings floating up and
 * down over a soft blue glow while the wordmark breathes underneath — the old
 * loader's motion, on the real logo instead of a hand-drawn copy.
 *
 * The logo is one image, drawn twice and clipped: the top 69% (the buildings)
 * floats, the rest (the wordmark) stays put. Only `transform` and `opacity`
 * animate, so it never repaints. Without the wordmark, the box is cropped to
 * the buildings so they sit centred.
 */
export const FloatingLogoLoader: React.FC<FloatingLogoLoaderProps> = ({ size = 'md', showText = false }) => {
  const { t } = useTranslation('common');
  const px = SIZE_PX[size];
  // Seeded once per mount: a remount carries on mid-float instead of jumping.
  const delay = spinnerPhaseDelay(undefined, LOGO_FLOAT_S);
  const image = { width: px, height: px, top: showText ? 0 : -px * 0.1, animationDelay: delay };

  return (
    <span
      role="status"
      aria-label={t('loading', 'Loading...')}
      className="be-logo-loader"
      style={{ width: px, height: showText ? px : px * 0.62 }}
    >
      <span className="be-logo-loader__glow" style={{ animationDelay: delay }} aria-hidden="true" />
      <img src={OFFICIAL_LOGO_SRC} alt="" aria-hidden="true" draggable={false} className="be-logo-loader__buildings" style={image} />
      {showText && (
        <img src={OFFICIAL_LOGO_SRC} alt="" aria-hidden="true" draggable={false} className="be-logo-loader__word" style={image} />
      )}
    </span>
  );
};

export default FloatingLogoLoader;
