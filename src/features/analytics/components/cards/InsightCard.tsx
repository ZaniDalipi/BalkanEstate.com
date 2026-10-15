import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';
import { Insight } from '@/src/data/api/ViewStatsApiClient';
import { INSIGHT_PRIORITY_CONFIG } from '@/src/features/analytics/constants';
import { truncateText } from '@/src/features/analytics/utils/helpers';

export interface InsightCardProps {
  insight: Insight;
  onAction?: (propertyId: string) => void;
}

/**
 * Icon mapping for insight types
 */
const ICON_MAP: Record<string, SoftIconName> = {
  sparkles: 'sparkles',
  trophy: 'trophy',
  'trending-up': 'trendUp',
  exclamation: 'warning',
  clock: 'clock',
  currency: 'cash',
  fire: 'flame',
};

/**
 * Insight card component
 * Displays a smart insight with icon, message and action buttons
 */
const InsightCard: React.FC<InsightCardProps> = ({ insight, onAction }) => {
  const { t } = useTranslation(['analytics']);
  const config = INSIGHT_PRIORITY_CONFIG[insight.priority];
  const icon = ICON_MAP[insight.icon] || 'lightbulb';

  return (
    <div
      className={`rounded-2xl border ${config.border} ${config.bg} backdrop-blur-sm p-4 relative overflow-hidden`}
    >
      {/* Accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.accent}`} />

      <div className="flex items-start gap-3 pl-2">
        {/* Icon */}
        <SoftIcon name={icon} className="w-9 h-9 flex-shrink-0" />

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
                  className="text-xs px-2 py-1 bg-white/80 backdrop-blur-sm rounded-full border border-white/50 hover:border-primary hover:text-primary transition-colors truncate max-w-[120px]"
                >
                  {truncateText(prop.title, 15)}
                </button>
              ))}
              {insight.properties.length > 2 && (
                <span className="text-xs px-2 py-1 text-neutral-500">
                  {t('analytics:insights.moreProperties', { count: insight.properties.length - 2 })}
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
