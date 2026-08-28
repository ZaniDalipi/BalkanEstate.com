import React from 'react';
import { useTranslation } from 'react-i18next';
import { PhotoIcon } from '@/constants';

export type NoPhotoSize = 'sm' | 'md' | 'lg';
export type NoPhotoTone = 'light' | 'dark';

interface NoPhotoPlaceholderProps {
  /**
   * Controls icon size and whether the caption is rendered.
   * - `sm`: small thumbnails (icon only)
   * - `md`: listing cards and map popups
   * - `lg`: detail-page galleries and previews
   */
  size?: NoPhotoSize;
  /** `light` for white surfaces (default), `dark` for the detail-page gallery stage. */
  tone?: NoPhotoTone;
  /**
   * When true (default) the placeholder is absolutely positioned and fills the
   * nearest positioned ancestor — matching how <PropertyImage> renders. Set to
   * false to fill a plain block container instead.
   */
  fill?: boolean;
  className?: string;
}

const ICON_SIZE: Record<NoPhotoSize, string> = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-10 h-10',
};

const FRAME_SIZE: Record<NoPhotoSize, string> = {
  sm: 'w-9 h-9 rounded-lg',
  md: 'w-12 h-12 rounded-xl',
  lg: 'w-16 h-16 rounded-2xl',
};

const LABEL_SIZE: Record<NoPhotoSize, string> = {
  sm: '',
  md: 'text-[11px]',
  lg: 'text-sm',
};

const TONE_SURFACE: Record<NoPhotoTone, string> = {
  light: 'bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200',
  dark: 'bg-gradient-to-br from-neutral-700 to-neutral-900',
};

const TONE_FRAME: Record<NoPhotoTone, string> = {
  light: 'bg-white/70 ring-1 ring-neutral-200/80 shadow-sm',
  dark: 'bg-white/10 ring-1 ring-white/15',
};

const TONE_ICON: Record<NoPhotoTone, string> = {
  light: 'text-neutral-400',
  dark: 'text-neutral-300',
};

const TONE_LABEL: Record<NoPhotoTone, string> = {
  light: 'text-neutral-500',
  dark: 'text-neutral-300',
};

/**
 * The single "this listing has no photo" visual.
 *
 * Listings without uploaded photos deliberately show this neutral, branded
 * placeholder rather than a stock house photo: a generic exterior shot would
 * misrepresent the property to buyers.
 */
const NoPhotoPlaceholder: React.FC<NoPhotoPlaceholderProps> = ({
  size = 'md',
  tone = 'light',
  fill = true,
  className = '',
}) => {
  const { t } = useTranslation(['property']);
  const label = t('property:photos.none', 'No photo available');

  return (
    <div
      role="img"
      aria-label={label}
      className={`${fill ? 'absolute inset-0' : 'w-full h-full'} flex flex-col items-center justify-center gap-2 ${TONE_SURFACE[tone]} ${className}`}
    >
      <div className={`${FRAME_SIZE[size]} ${TONE_FRAME[tone]} flex items-center justify-center`}>
        <PhotoIcon className={`${ICON_SIZE[size]} ${TONE_ICON[tone]}`} />
      </div>
      {size !== 'sm' && (
        <span
          aria-hidden="true"
          className={`${LABEL_SIZE[size]} ${TONE_LABEL[tone]} font-medium tracking-wide px-2 text-center`}
        >
          {label}
        </span>
      )}
    </div>
  );
};

export default NoPhotoPlaceholder;
