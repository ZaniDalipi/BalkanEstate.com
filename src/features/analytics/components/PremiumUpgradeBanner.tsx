import React from 'react';
import { LockClosedIcon } from '../../../constants';

interface PremiumUpgradeBannerProps {
  onUpgradeClick: () => void;
}

/**
 * Premium upgrade banner component
 * Displays a call-to-action for users to upgrade their subscription
 */
const PremiumUpgradeBanner: React.FC<PremiumUpgradeBannerProps> = ({ onUpgradeClick }) => (
  <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-xl p-5 text-white relative overflow-hidden">
    {/* Background pattern */}
    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjIiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9nPjwvc3ZnPg==')] opacity-30" />

    <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
      {/* Icon */}
      <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm w-fit">
        <LockClosedIcon className="h-6 w-6" />
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="font-bold">Unlock Premium Analytics</h3>
        <p className="text-white/80 text-sm mt-0.5">
          Get insights, traffic sources, device stats & CSV exports
        </p>
      </div>

      {/* CTA Button */}
      <button
        onClick={onUpgradeClick}
        className="px-5 py-2.5 bg-white text-purple-600 font-semibold rounded-lg hover:bg-neutral-100 transition-colors text-sm"
      >
        Upgrade Now
      </button>
    </div>
  </div>
);

export default PremiumUpgradeBanner;
