import React from 'react';
import { useTranslation } from 'react-i18next';
import { ClockIcon } from '@/constants';
import type { TeamFeedItem } from '../../types';

interface ActivityFeedProps {
  feed: TeamFeedItem[];
  isLoading: boolean;
  error: Error | null;
}

const typeColors: Record<string, string> = {
  listing_created: 'bg-green-100 text-green-700',
  listing_updated: 'bg-blue-100 text-blue-700',
  inquiry_received: 'bg-amber-100 text-amber-700',
  inquiry_responded: 'bg-indigo-100 text-indigo-700',
  agent_joined: 'bg-purple-100 text-purple-700',
  agent_left: 'bg-red-100 text-red-700',
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
        <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
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
          <div className={`p-2 rounded-full flex-shrink-0 ${typeColors[item.type] || 'bg-gray-100 text-gray-700'}`}>
            <ClockIcon className="w-4 h-4" />
          </div>
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
