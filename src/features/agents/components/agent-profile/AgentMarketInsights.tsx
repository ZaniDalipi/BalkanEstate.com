// Agent Market Insights Component
// Displays market data relevant to the agent's area

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClockIcon,
  ArrowTrendingUpIcon,
  FireIcon,
} from '@/constants';

export interface MarketInsightsData {
  avgDaysOnMarket: number;
  priceGrowth: number;
  activityLevel: 'Low' | 'Moderate' | 'High' | 'Very High';
  daysDescription: string;
  growthDescription: string;
  activityDescription: string;
}

interface AgentMarketInsightsProps {
  insights: MarketInsightsData;
  agentCity?: string;
}

const AgentMarketInsights: React.FC<AgentMarketInsightsProps> = ({ insights, agentCity }) => {
  const { t } = useTranslation(['agents']);

  const getActivityColor = (level: string) => {
    switch (level) {
      case 'Very High':
        return 'text-red-600 bg-red-50';
      case 'High':
        return 'text-orange-600 bg-orange-50';
      case 'Moderate':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const insightItems = [
    {
      icon: ClockIcon,
      title: t('agents:profilePage.marketInsights.avgDaysTitle'),
      value: `${insights.avgDaysOnMarket} ${t('agents:profilePage.marketInsights.days')}`,
      description: t(insights.daysDescription),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: ArrowTrendingUpIcon,
      title: t('agents:profilePage.marketInsights.priceGrowthTitle'),
      value: `${insights.priceGrowth > 0 ? '+' : ''}${insights.priceGrowth}%`,
      description: t(insights.growthDescription),
      color: insights.priceGrowth > 0 ? 'text-green-600' : 'text-red-600',
      bgColor: insights.priceGrowth > 0 ? 'bg-green-50' : 'bg-red-50',
    },
    {
      icon: FireIcon,
      title: t('agents:profilePage.marketInsights.activityTitle'),
      value: insights.activityLevel,
      description: t(insights.activityDescription),
      color: getActivityColor(insights.activityLevel).split(' ')[0],
      bgColor: getActivityColor(insights.activityLevel).split(' ')[1],
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('agents:profilePage.marketInsights.title')}
        {agentCity && <span className="text-gray-500 font-normal"> - {agentCity}</span>}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insightItems.map((item, index) => (
          <div
            key={index}
            className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`${item.bgColor} w-8 h-8 rounded-lg flex items-center justify-center`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <span className="text-sm text-gray-600">{item.title}</span>
            </div>
            <div className={`text-xl font-bold ${item.color} mb-1`}>
              {item.value}
            </div>
            <p className="text-xs text-gray-500">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentMarketInsights;
