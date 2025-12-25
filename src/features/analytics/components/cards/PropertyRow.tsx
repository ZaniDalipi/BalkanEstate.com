import React from 'react';
import { SparklesIcon } from '../../../../../constants';
import { formatPrice } from '../../../../../utils/currency';
import { ProgressBar } from '../charts';
import { truncateText, getPerformanceColor } from '../../utils/helpers';

export interface PropertyRowData {
  propertyId: string;
  title: string;
  status?: string;
  isPromoted?: boolean;
  price?: number;
  periodViews: number;
  periodUniqueViews?: number;
  totalViews: number;
}

export interface PropertyRowProps {
  property: PropertyRowData;
  rank: number;
  maxViews: number;
  onClick?: () => void;
}

/**
 * Gets the rank badge display
 */
const getRankBadge = (rank: number): { emoji?: string; className: string } => {
  const medals = ['🥇', '🥈', '🥉'];
  if (rank <= 3) {
    return {
      emoji: medals[rank - 1],
      className:
        rank === 1
          ? 'bg-yellow-100 text-yellow-700'
          : rank === 2
          ? 'bg-neutral-200 text-neutral-600'
          : 'bg-orange-100 text-orange-700',
    };
  }
  return { className: 'bg-neutral-100 text-neutral-500' };
};

/**
 * Property row component
 * Displays a property with rank, stats and progress bar
 */
const PropertyRow: React.FC<PropertyRowProps> = ({ property, rank, maxViews, onClick }) => {
  const performanceLevel = maxViews > 0 ? property.periodViews / maxViews : 0;
  const { text: performanceColor, bar: barColor } = getPerformanceColor(performanceLevel);
  const rankBadge = getRankBadge(rank);

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 cursor-pointer transition-all group"
    >
      {/* Rank Badge */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${rankBadge.className}`}
      >
        {rankBadge.emoji || rank}
      </div>

      {/* Property Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-neutral-900 text-sm truncate max-w-[180px] group-hover:text-primary transition-colors">
            {truncateText(property.title, 28)}
          </h4>
          {property.isPromoted && (
            <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-purple-100 text-purple-700 flex items-center gap-0.5">
              <SparklesIcon className="h-2.5 w-2.5" />
              PRO
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 max-w-[120px]">
            <ProgressBar value={property.periodViews} max={maxViews} color={barColor} />
          </div>
          {property.price && (
            <span className="text-[10px] text-neutral-400">
              {formatPrice(property.price, 'Serbia')}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 text-right">
        <p className={`text-lg font-bold ${performanceColor}`}>{property.periodViews}</p>
        <p className="text-[10px] text-neutral-400">{property.totalViews} total</p>
      </div>
    </div>
  );
};

export default PropertyRow;
