import React from 'react';
import AdSlot from './AdSlot';
import { AdPlacement } from '../adsConfig';

interface AdBannerProps {
  placement: AdPlacement;
  /** Vertical rhythm around the banner. `none` lets the caller own the spacing. */
  spacing?: 'none' | 'compact' | 'section';
  /** Widest the banner may grow; keeps it aligned with the page's content column. */
  maxWidth?: string;
  className?: string;
}

const SPACING: Record<NonNullable<AdBannerProps['spacing']>, string> = {
  none: '',
  compact: 'my-4 sm:my-6',
  section: 'my-8 sm:my-12',
};

/**
 * A horizontal ad in the flow of the page.
 *
 * In the flow is the point: it takes its own row inside the content column, so
 * it can only ever sit between two sections — never across one. The width cap
 * keeps it inside the same column as the text around it, which is what makes it
 * pick a normal banner size rather than a screen-wide strip.
 */
const AdBanner: React.FC<AdBannerProps> = ({
  placement,
  spacing = 'section',
  maxWidth = '970px',
  className = '',
}) => (
  <div className={`w-full px-4 ${SPACING[spacing]} ${className}`}>
    <div className="mx-auto w-full" style={{ maxWidth }}>
      <AdSlot placement={placement} shape="horizontal" />
    </div>
  </div>
);

export default AdBanner;
