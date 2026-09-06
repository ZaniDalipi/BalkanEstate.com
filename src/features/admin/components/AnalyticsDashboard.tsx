import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UsersIcon,
  HomeIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  TicketIcon,
  ChartBarIcon,
  EnvelopeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from '@/constants';
import { API_URL } from '@/src/shared/api/config';
import { tokenService } from '@/src/shared/api/tokenService';
import UserAvatar from '@/components/shared/UserAvatar';

interface AdminStats {
  overview: {
    totalUsers: number;
    totalAgents: number;
    totalAgencies: number;
    totalProperties: number;
    activeDiscountCodes: number;
    totalInquiries?: number;
    newInquiries?: number;
    unverifiedUsers?: number;
    pendingProperties?: number;
  };
  recentActivity?: {
    type: string;
    message: string;
    timestamp: string;
    user?: string;
  }[];
  trends?: {
    users: number;
    properties: number;
    inquiries: number;
  };
}

interface PendingLicenseAgent {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  /** Their generated character, shown when there is no uploaded photo. */
  avatarOptions?: string;
  gender?: 'male' | 'female' | 'other';
  createdAt: string;
}

const AnalyticsDashboard: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingLicenseAgents, setPendingLicenseAgents] = useState<PendingLicenseAgent[]>([]);
  const [pendingLicenseError, setPendingLicenseError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    fetchPendingLicenses();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const token = tokenService.getAccessToken();
      const response = await fetch(`${API_URL}/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError('Failed to load statistics');
      // Error removed
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingLicenses = async () => {
    try {
      const token = tokenService.getAccessToken();
      const response = await fetch(`${API_URL}/admin/users?role=agent&licenseVerified=false&limit=10&sortBy=createdAt&order=desc`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setPendingLicenseAgents(data.users || []);
      setPendingLicenseError(null);
    } catch {
      setPendingLicenseError(t('analyticsDashboard.failedToLoadLicenses', 'Failed to load pending licenses'));
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('analyticsDashboard.loadingDashboard')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="text-center text-red-600">
          <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4" />
          <p className="font-semibold">{t('analyticsDashboard.errorLoadingDashboard')}</p>
          <p className="text-sm mt-2">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('common.refresh')}
          </button>
        </div>
      </div>
    );
  }

  const mainStats = [
    {
      title: t('dashboard.totalUsers'),
      value: stats?.overview.totalUsers || 0,
      icon: <UsersIcon className="w-6 h-6" />,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      trend: stats?.trends?.users,
    },
    {
      title: t('dashboard.totalProperties'),
      value: stats?.overview.totalProperties || 0,
      icon: <HomeIcon className="w-6 h-6" />,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      trend: stats?.trends?.properties,
    },
    {
      title: t('analyticsDashboard.totalAgents'),
      value: stats?.overview.totalAgents || 0,
      icon: <UserGroupIcon className="w-6 h-6" />,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: t('sidebar.agencies'),
      value: stats?.overview.totalAgencies || 0,
      icon: <BuildingOfficeIcon className="w-6 h-6" />,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
  ];

  const alertStats = [
    {
      title: t('analyticsDashboard.newInquiries'),
      value: stats?.overview.newInquiries || 0,
      icon: <EnvelopeIcon className="w-5 h-5" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      isAlert: (stats?.overview.newInquiries || 0) > 0,
    },
    {
      title: t('analyticsDashboard.unverifiedUsers'),
      value: stats?.overview.unverifiedUsers || 0,
      icon: <ShieldCheckIcon className="w-5 h-5" />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      isAlert: (stats?.overview.unverifiedUsers || 0) > 0,
    },
    {
      title: t('analyticsDashboard.activeDiscounts'),
      value: stats?.overview.activeDiscountCodes || 0,
      icon: <TicketIcon className="w-5 h-5" />,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
  ];

  // Recent activity from API (no mock fallback in production)
  const recentActivity = stats?.recentActivity || [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return <UsersIcon className="w-4 h-4" />;
      case 'property': return <HomeIcon className="w-4 h-4" />;
      case 'inquiry': return <EnvelopeIcon className="w-4 h-4" />;
      case 'verification': return <CheckCircleIcon className="w-4 h-4" />;
      case 'discount': return <TicketIcon className="w-4 h-4" />;
      default: return <ClockIcon className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user': return 'bg-blue-100 text-blue-600';
      case 'property': return 'bg-green-100 text-green-600';
      case 'inquiry': return 'bg-red-100 text-red-600';
      case 'verification': return 'bg-purple-100 text-purple-600';
      case 'discount': return 'bg-pink-100 text-pink-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">{t('analyticsDashboard.welcomeTitle')}</h2>
            <p className="text-blue-100">
              {t('analyticsDashboard.todayDescription')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchStats}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <ChartBarIcon className="w-5 h-5" />
              <span>{t('common.refresh')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainStats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.bgColor} ${stat.textColor} p-3 rounded-xl`}>
                {stat.icon}
              </div>
              {stat.trend !== undefined && (
                <div className={`flex items-center gap-1 text-sm ${stat.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trend >= 0 ? (
                    <ArrowTrendingUpIcon className="w-4 h-4" />
                  ) : (
                    <ArrowTrendingDownIcon className="w-4 h-4" />
                  )}
                  <span>{Math.abs(stat.trend)}%</span>
                </div>
              )}
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {stat.value.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">{stat.title}</div>
          </div>
        ))}
      </div>

      {/* Alert Stats & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alert Stats */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('analyticsDashboard.requiresAttention')}</h3>
          <div className="space-y-4">
            {alertStats.map((stat, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-xl ${stat.bgColor} ${stat.isAlert ? 'ring-2 ring-offset-2 ring-red-200' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className={stat.color}>{stat.icon}</span>
                  <span className="font-medium text-gray-900">{stat.title}</span>
                </div>
                <span className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.recentActivity')}</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              {t('dashboard.viewAll')}
            </button>
          </div>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.message}
                    </p>
                    {activity.user && (
                      <p className="text-xs text-gray-500 truncate">{activity.user}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {activity.timestamp}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">{t('analyticsDashboard.noRecentActivity')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('analyticsDashboard.quickActions')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={fetchStats}
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
          >
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ChartBarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">{t('analyticsDashboard.refreshData')}</div>
              <div className="text-xs text-gray-500">{t('analyticsDashboard.updateStatistics')}</div>
            </div>
          </button>

          <button
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all text-left group"
          >
            <div className="p-2 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
              <HomeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">{t('analyticsDashboard.reviewProperties')}</div>
              <div className="text-xs text-gray-500">{t('analyticsDashboard.pendingApprovalDesc')}</div>
            </div>
          </button>

          <button
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-left group"
          >
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <UsersIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">{t('analyticsDashboard.verifyUsers')}</div>
              <div className="text-xs text-gray-500">{t('analyticsDashboard.pendingVerificationDesc')}</div>
            </div>
          </button>

          <button
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-pink-400 hover:bg-pink-50 transition-all text-left group"
          >
            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg group-hover:bg-pink-600 group-hover:text-white transition-colors">
              <TicketIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">{t('analyticsDashboard.createDiscount')}</div>
              <div className="text-xs text-gray-500">{t('analyticsDashboard.newPromoCode')}</div>
            </div>
          </button>
        </div>
      </div>

      {/* Pending License Verifications */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('analyticsDashboard.pendingLicenseVerifications', 'Pending License Verifications')}</h3>
            <p className="text-sm text-gray-500">
              {t('analyticsDashboard.agentsAwaitingReview', '{{count}} agents awaiting license review', { count: pendingLicenseAgents.length })}
            </p>
          </div>
          <ShieldCheckIcon className="w-6 h-6 text-purple-500" />
        </div>
        {pendingLicenseError ? (
          <div className="text-center py-6 text-red-500">
            <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">{pendingLicenseError}</p>
            <button
              onClick={fetchPendingLicenses}
              className="mt-3 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('common.retry', 'Retry')}
            </button>
          </div>
        ) : pendingLicenseAgents.length > 0 ? (
          <div className="space-y-3">
            {pendingLicenseAgents.map((agent) => (
              <div
                key={agent._id}
                className="flex items-center justify-between p-3 bg-purple-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-purple-100">
                    <UserAvatar
                      src={agent.avatarUrl}
                      alt={agent.name || agent.email}
                      gender={agent.gender}
                      seed={agent._id || agent.email}
                      avatarOptions={agent.avatarOptions}
                      width={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{agent.name || agent.email}</p>
                    <p className="text-xs text-gray-500">{agent.email}</p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                  {t('analyticsDashboard.pendingReview', 'Pending Review')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400">
            <ShieldCheckIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">{t('analyticsDashboard.noPendingLicenses', 'No pending license verifications')}</p>
          </div>
        )}
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('analyticsDashboard.systemStatus')}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">{t('analyticsDashboard.database')}</span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="font-semibold text-green-600">{t('analyticsDashboard.connected')}</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">{t('analyticsDashboard.apiServer')}</span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="font-semibold text-green-600">{t('analyticsDashboard.running')}</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">{t('analyticsDashboard.emailService')}</span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="font-semibold text-green-600">{t('common.active')}</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">{t('analyticsDashboard.lastUpdated')}</span>
              <span className="font-semibold text-gray-900">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('analyticsDashboard.platformInfo')}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">{t('analyticsDashboard.version')}</span>
              <span className="font-semibold text-gray-900">2.0.0</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">{t('analyticsDashboard.environment')}</span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                import.meta.env.MODE === 'production'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-blue-100 text-blue-600'
              }`}>
                {import.meta.env.MODE === 'production' ? t('analyticsDashboard.production') : t('analyticsDashboard.development')}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">{t('analyticsDashboard.totalInquiries')}</span>
              <span className="font-semibold text-gray-900">
                {stats?.overview.totalInquiries?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">{t('analyticsDashboard.adminPanel')}</span>
              <span className="px-2 py-1 bg-green-100 text-green-600 text-xs font-semibold rounded-full">
                {t('common.active')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
