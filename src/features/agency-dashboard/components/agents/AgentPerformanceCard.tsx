import React from 'react';
import { useTranslation } from 'react-i18next';
import { ClockIcon, HomeIcon, EnvelopeIcon } from '@/constants';
import type { DashboardAgent } from '../../types';
import UserAvatar from '@/components/shared/UserAvatar';

interface AgentPerformanceCardProps {
  agent: DashboardAgent;
}

const AgentPerformanceCard: React.FC<AgentPerformanceCardProps> = ({ agent }) => {
  const { t } = useTranslation(['agencyDashboard']);

  const metrics = [
    {
      label: t('agencyDashboard:agents.perf.activeListings', 'Active Listings'),
      value: agent.activeListings,
      icon: <HomeIcon className="w-4 h-4" />,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: t('agencyDashboard:agents.perf.inquiriesHandled', 'Inquiries Handled'),
      value: agent.inquiriesHandled,
      icon: <EnvelopeIcon className="w-4 h-4" />,
      color: 'text-amber-600 bg-amber-50',
    },
  ];

  // Simple activity bar chart based on listings and inquiries
  const activityMax = Math.max(agent.activeListings, agent.inquiriesHandled, 1);
  const activityBars = [
    { label: t('agencyDashboard:agents.perf.listings', 'Listings'), value: agent.activeListings, color: 'bg-green-400' },
    { label: t('agencyDashboard:agents.perf.inquiries', 'Inquiries'), value: agent.inquiriesHandled, color: 'bg-amber-400' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-full overflow-hidden bg-indigo-50 flex-shrink-0">
          <UserAvatar
            src={agent.avatar || undefined}
            alt={agent.name}
            gender={agent.gender}
            seed={agent.userId || agent.name}
            avatarOptions={agent.avatarOptions}
            width={88}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">{agent.name}</h4>
          <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
            agent.status === 'active' ? 'bg-green-50 text-green-700'
              : agent.status === 'pending' ? 'bg-amber-50 text-amber-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {agent.status}
          </span>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
          'bg-blue-50 text-blue-700'
        }`}>
          <ClockIcon className="w-4 h-4" />
          <span>{agent.avgResponseTime}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {metrics.map((metric) => (
          <div key={metric.label} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${metric.color}`}>
            {metric.icon}
            <div>
              <div className="text-lg font-bold">{metric.value}</div>
              <div className="text-xs opacity-80">{metric.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {t('agencyDashboard:agents.perf.activityBreakdown', 'Activity Breakdown')}
        </h5>
        <div className="space-y-2.5">
          {activityBars.map((bar) => {
            const widthPercent = (bar.value / activityMax) * 100;
            return (
              <div key={bar.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">{bar.label}</span>
                  <span className="font-semibold text-gray-900">{bar.value}</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${bar.color} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(widthPercent, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AgentPerformanceCard;
