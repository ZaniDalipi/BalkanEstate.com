import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';
import type { TeamFeedItem } from '../../types';

interface ActivityFeedProps {
  feed: TeamFeedItem[];
  isLoading: boolean;
  error: Error | null;
}

const typeIcons: Record<string, SoftIconName> = {
  listing_created: 'home',
  listing_updated: 'pencil',
  inquiry_received: 'envelope',
  inquiry_responded: 'chat',
  agent_joined: 'users',
  agent_left: 'user',
};

const ActivityFeed: React.FC<ActivityFeedProps> = ({ feed, isLoading, error }) => {
  const { t } = useTranslation(['agencyDashboard']);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
        <p className="text-red-700 text-sm">
          {t('agencyDashboard:team.feedError', 'Failed to load activity feed.')}
        </p>
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <SoftIcon name="clock" className="w-14 h-14 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">
          {t('agencyDashboard:team.noActivity', 'No recent activity.')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      {feed.map((item) => (
        <div key={item.id} className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors">
          <SoftIcon name={typeIcons[item.type] || 'clock'} className="w-9 h-9 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">
              <span className="font-medium">{item.agentName}</span>
              {' '}{item.description}
            </p>
            {item.propertyTitle && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {item.propertyTitle}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {new Date(item.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityFeed;
