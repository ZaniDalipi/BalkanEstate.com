import React from 'react';
import { cn } from '@/src/lib/utils';
import { useCenteredScroll } from './useCenteredScroll';

interface PhonePanoramaProps {
  /** Changes with the picture on show; each new picture opens centred. */
  pictureKey: string;
  /** Off in full screen, where the picture fits the screen whole. */
  enabled: boolean;
  children: React.ReactNode;
}

/**
 * On phones the explorer picture is drawn taller than the screen is wide
 * (PHONE_CANVAS_WIDTH); this lets the buyer swipe sideways across it, starting
 * from the middle. From tablet up, and in full screen, it is a plain wrapper.
 */
export const PhonePanorama: React.FC<PhonePanoramaProps> = ({ pictureKey, enabled, children }) => {
  const ref = useCenteredScroll<HTMLDivElement>(enabled ? pictureKey : '');
  if (!enabled) return <>{children}</>;
  return (
    <div
      ref={ref}
      data-testid="phone-panorama"
      className={cn('max-sm:overflow-x-auto max-sm:overscroll-x-contain', '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden')}
    >
      {children}
    </div>
  );
};
