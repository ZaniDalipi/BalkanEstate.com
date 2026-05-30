import React from 'react';
import AdUnit from './AdUnit';
import { AD_SLOTS } from '../types';

interface AdSidebarProps {
  className?: string;
}

/**
 * Sidebar rectangle ad (300×250) for property detail pages.
 * Stacks above the agent contact card on mobile; beside it on desktop.
 */
const AdSidebar: React.FC<AdSidebarProps> = ({ className = '' }) => (
  <div className={`rounded-xl overflow-hidden bg-gray-50 border border-gray-100 ${className}`}>
    <p className="text-[10px] text-center text-gray-400 pt-2 select-none">Advertisement</p>
    <AdUnit slot={AD_SLOTS.PROPERTY_DETAIL_SIDEBAR} />
  </div>
);

export default AdSidebar;
