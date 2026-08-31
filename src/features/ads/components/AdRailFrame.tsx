import React, { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdSlot from './AdSlot';
import { AdPlacement } from '../adsConfig';

/**
 * A rail is 600px of ad plus its padding. A section shorter than that cannot
 * contain one: the rail would hang out of its own box and end up drawn over the
 * next section — or, when a section renders nothing at all, over the rail of the
 * section after it. Below this height the rails are simply not shown.
 */
const MIN_FRAME_HEIGHT = 680;

interface AdRailFrameProps {
  children: React.ReactNode;
  /**
   * Width of the content column the section centres. The rails are given the
   * leftover gutter on each side and nothing more, so they cannot reach the
   * content however wide the window gets.
   */
  contentWidth?: string;
  leftPlacement?: AdPlacement;
  rightPlacement?: AdPlacement;
  className?: string;
}

/**
 * Wraps a full-width section with a skyscraper in each side gutter.
 *
 * The rails live in the empty margin either side of the centred content, sized
 * from `calc((100% - contentWidth) / 2)`. Below 1536px there is no gutter worth
 * the name, so they are not rendered at all — and even above it, a rail that
 * cannot fit its narrowest standard unit (120x600) draws nothing rather than
 * squeezing itself over the section.
 */
const AdRailFrame: React.FC<AdRailFrameProps> = ({
  children,
  contentWidth = '72rem',
  leftPlacement = 'homeRailLeft',
  rightPlacement = 'homeRailRight',
  className = '',
}) => {
  const { t } = useTranslation(['common']);
  const frameRef = useRef<HTMLDivElement>(null);
  const [isTallEnough, setIsTallEnough] = useState(false);

  // A lazy section starts empty and grows once its data lands, so the height is
  // watched rather than read once.
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const measure = () => setIsTallEnough(el.offsetHeight >= MIN_FRAME_HEIGHT);
    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const gutter = `calc((100% - ${contentWidth}) / 2)`;
  const railLabel = t('common:advertisement.label', 'Advertisement');

  const rail = (side: 'left' | 'right', placement: AdPlacement) => (
    <aside
      className={`pointer-events-none absolute inset-y-0 ${side === 'left' ? 'left-0' : 'right-0'} hidden 2xl:flex justify-center`}
      style={{ width: gutter }}
      aria-label={railLabel}
    >
      {/* Sticky so the rail stays beside the section while it scrolls past,
          self-start so it never stretches the row it sits in. */}
      <div className="pointer-events-auto sticky top-24 w-full self-start py-10">
        <AdSlot placement={placement} shape="vertical" />
      </div>
    </aside>
  );

  return (
    <div ref={frameRef} className={`relative ${className}`}>
      {isTallEnough && rail('left', leftPlacement)}
      {isTallEnough && rail('right', rightPlacement)}
      {children}
    </div>
  );
};

export default AdRailFrame;
