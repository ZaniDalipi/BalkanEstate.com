import React from 'react';
import {
  SparklesIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CurrencyEuroIcon,
  FireIcon,
  LightBulbIcon,
} from '../../../../../constants';
import { Insight } from '../../../../data/api/ViewStatsApiClient';
import { INSIGHT_PRIORITY_CONFIG } from '../../constants';
import { truncateText } from '../../utils/helpers';

export interface InsightCardProps {
  insight: Insight;
  onAction?: (propertyId: string) => void;
}

/**
 * Icon mapping for insight types
 */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  sparkles: SparklesIcon,
  trophy: TrophyIcon,
  'trending-up': ArrowTrendingUpIcon,
  exclamation: ExclamationTriangleIcon,
  clock: ClockIcon,
  currency: CurrencyEuroIcon,
  fire: FireIcon,
};

/**
 * Insight card component
 * Displays a smart insight with icon, message and action buttons
 */
const InsightCard: React.FC<InsightCardProps> = ({ insight, onAction }) => {
  const config = INSIGHT_PRIORITY_CONFIG[insight.priority];
  const Icon = ICON_MAP[insight.icon] || LightBulbIcon;

  return (
    <div
      className={`rounded-xl border ${config.border} ${config.bg} p-4 relative overflow-hidden`}
    >
      {/* Accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.accent}`} />

      <div className="flex items-start gap-3 pl-2">
        {/* Icon */}
        <div className={`p-2 rounded-lg bg-white shadow-sm ${config.icon}`}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-neutral-900 text-sm">{insight.title}</h4>
          <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
            {insight.message}
          </p>

          {/* Property action buttons */}
          {insight.properties && insight.properties.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {insight.properties.slice(0, 2).map((prop) => (
                <button
                  key={prop.id}
                  onClick={() => onAction?.(prop.id)}
                  className="text-xs px-2 py-1 bg-white rounded-full border border-neutral-200 hover:border-primary hover:text-primary transition-colors truncate max-w-[120px]"
                >
                  {truncateText(prop.title, 15)}
                </button>
              ))}
              {insight.properties.length > 2 && (
                <span className="text-xs px-2 py-1 text-neutral-500">
                  +{insight.properties.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightCard;
