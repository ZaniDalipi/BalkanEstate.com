import React from 'react';
import AdUnit from './AdUnit';
import { AD_SLOTS } from '../types';

interface AdBannerProps {
  /** Which named slot to render */
  placement: 'home-leaderboard' | 'footer-banner';
  className?: string;
}

/**
 * Horizontal banner ad — leaderboard (728×90) or footer strip.
 * Wraps AdUnit with a labelled container for visual context.
 */
const AdBanner: React.FC<AdBannerProps> = ({ placement, className = '' }) => {
  const slot =
    placement === 'home-leaderboard' ? AD_SLOTS.HOME_LEADERBOARD : AD_SLOTS.FOOTER_BANNER;

  return (
    <div className={`w-full ${className}`}>
      <p className="text-[10px] text-center text-gray-400 mb-0.5 select-none">Advertisement</p>
      <AdUnit slot={slot} />
    </div>
  );
};

export default AdBanner;
