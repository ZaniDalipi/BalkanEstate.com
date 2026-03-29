import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ExclamationTriangleIcon,
  ClockIcon,
} from '@/constants';
import { API_URL } from '@/src/shared/api/config';
import { tokenService } from '@/src/shared/api/tokenService';

interface NavigationHeatmapData {
  pageViews: Array<{ path: string; views: number; uniqueVisitors: number }>;
  buttonClicks: Array<{ button: string; page: string; clicks: number }>;
  userFlows: Array<{ flow: string; count: number }>;
  deviceBreakdown: Record<string, number>;
  subscriptionFunnel: {
    pricingPageViews: number;
    subscribeButtonClicks: number;
    modalOpened: number;
    checkoutStarted: number;
    completed: number;
  };
  dateRange: string;
}

const InteractionHeatmap: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [data, setData] = useState<NavigationHeatmapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    fetchHeatmapData();
  }, [dateRange]);

  const fetchHeatmapData = async () => {
    try {
      setIsLoading(true);
      const token = tokenService.getAccessToken();
      const response = await fetch(
        `${API_URL}/analytics/heatmap?dateRange=${dateRange}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch heatmap data');

      const heatmapData = await response.json();
      setData(heatmapData);
      setError(null);
    } catch (err) {
      setError(t('admin:errors.failedToLoadAnalytics', 'Failed to load analytics data'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('admin:loading.loadingHeatmap')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="text-center text-red-600">
          <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4" />
          <p className="font-semibold">{error}</p>
          <button
            onClick={fetchHeatmapData}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('common.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  const getConversionRate = () => {
    if (!data?.subscriptionFunnel.subscribeButtonClicks) return 0;
    return (
      (data.subscriptionFunnel.completed / data.subscriptionFunnel.subscribeButtonClicks) * 100
    ).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {t('admin:analytics.interactionHeatmap', 'Interaction Heatmap')}
        </h2>
        <div className="flex gap-2">
          {(['today', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {t(`admin:analytics.${range}`, range.charAt(0).toUpperCase() + range.slice(1))}
            </button>
          ))}
        </div>
      </div>

      {/* Subscription Funnel */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('admin:analytics.subscriptionFunnel', 'Subscription Funnel')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {data?.subscriptionFunnel.pricingPageViews || 0}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {t('admin:analytics.pricingPageViews', 'Pricing Page Views')}
            </div>
            <div className="text-xs text-gray-500 mt-1">1</div>
          </div>

          <div className="flex items-center justify-center text-gray-400">→</div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {data?.subscriptionFunnel.subscribeButtonClicks || 0}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {t('admin:analytics.subscribeButtonClicks', 'Subscribe Button Clicks')}
            </div>
            <div className="text-xs text-gray-500 mt-1">2</div>
          </div>

          <div className="flex items-center justify-center text-gray-400">→</div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {data?.subscriptionFunnel.modalOpened || 0}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {t('admin:analytics.modalOpened', 'Modal Opened')}
            </div>
            <div className="text-xs text-gray-500 mt-1">3</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {data?.subscriptionFunnel.checkoutStarted || 0}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {t('admin:analytics.checkoutStarted', 'Checkout Started')}
            </div>
            <div className="text-xs text-gray-500 mt-1">4</div>
          </div>

          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {data?.subscriptionFunnel.completed || 0}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {t('admin:analytics.completed', 'Completed')}
            </div>
            <div className="text-xs text-gray-500 mt-1">5</div>
          </div>

          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">
              {getConversionRate()}%
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {t('admin:analytics.conversionRate', 'Conversion Rate')}
            </div>
            <div className="text-xs text-gray-500 mt-1">Clicks to Completion</div>
          </div>
        </div>
      </div>

      {/* Top Pages and Button Clicks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin:analytics.topPages', 'Top Pages')}
          </h3>
          {data?.pageViews && data.pageViews.length > 0 ? (
            <div className="space-y-3">
              {data.pageViews.map((page, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {page.path}
                    </div>
                    <div className="text-xs text-gray-500">
                      {page.uniqueVisitors} unique visitors
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">{page.views}</div>
                    <div className="text-xs text-gray-500">views</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">{t('admin:analytics.noPageData', 'No page view data available')}</p>
            </div>
          )}
        </div>

        {/* Top Button Clicks */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin:analytics.topButtonClicks', 'Top Button Clicks')}
          </h3>
          {data?.buttonClicks && data.buttonClicks.length > 0 ? (
            <div className="space-y-3">
              {data.buttonClicks.map((btn, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {btn.button}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      on {btn.page}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">{btn.clicks}</div>
                    <div className="text-xs text-gray-500">clicks</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">{t('admin:analytics.noButtonData', 'No button click data available')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Device Breakdown and User Flows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin:analytics.deviceBreakdown', 'Device Breakdown')}
          </h3>
          {data?.deviceBreakdown && Object.keys(data.deviceBreakdown).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(data.deviceBreakdown).map(([device, count]) => {
                const total = Object.values(data.deviceBreakdown).reduce((a, b) => a + b, 0);
                const percentage = ((count / total) * 100).toFixed(1);
                return (
                  <div key={device} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 capitalize">
                        {device}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{count}</div>
                        <div className="text-xs text-gray-500">{percentage}%</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">{t('admin:analytics.noDeviceData', 'No device data available')}</p>
            </div>
          )}
        </div>

        {/* Common User Flows */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin:analytics.commonUserFlows', 'Common User Flows')}
          </h3>
          {data?.userFlows && data.userFlows.length > 0 ? (
            <div className="space-y-3">
              {data.userFlows.map((flow, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {flow.flow}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-600">{flow.count}</div>
                    <div className="text-xs text-gray-500">sessions</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">{t('admin:analytics.noFlowData', 'No user flow data available')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractionHeatmap;
