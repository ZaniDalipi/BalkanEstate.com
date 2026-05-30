import React from 'react';
import AdUnit from './AdUnit';
import { AD_SLOTS } from '../types';

interface AdInFeedProps {
  className?: string;
}

/**
 * In-feed native ad — designed to sit between property cards in a grid or list.
 * Matches the card height so it doesn't break the visual rhythm.
 */
const AdInFeed: React.FC<AdInFeedProps> = ({ className = '' }) => (
  <div className={`rounded-xl overflow-hidden bg-gray-50 border border-gray-100 ${className}`}>
    <p className="text-[10px] text-center text-gray-400 pt-2 select-none">Advertisement</p>
    <AdUnit slot={AD_SLOTS.SEARCH_IN_FEED} />
  </div>
);

export default AdInFeed;
