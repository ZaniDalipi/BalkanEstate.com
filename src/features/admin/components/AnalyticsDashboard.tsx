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

const AnalyticsDashboard: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('balkan_estate_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
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
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="text-center text-red-600">
          <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4" />
          <p className="font-semibold">Error loading dashboard</p>
          <p className="text-sm mt-2">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const mainStats = [
    {
      title: 'Total Users',
      value: stats?.overview.totalUsers || 0,
      icon: <UsersIcon className="w-6 h-6" />,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      trend: stats?.trends?.users,
    },
    {
      title: 'Properties',
      value: stats?.overview.totalProperties || 0,
      icon: <HomeIcon className="w-6 h-6" />,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      trend: stats?.trends?.properties,
    },
    {
      title: 'Agents',
      value: stats?.overview.totalAgents || 0,
      icon: <UserGroupIcon className="w-6 h-6" />,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'Agencies',
      value: stats?.overview.totalAgencies || 0,
      icon: <BuildingOfficeIcon className="w-6 h-6" />,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
  ];

  const alertStats = [
    {
      title: 'New Inquiries',
      value: stats?.overview.newInquiries || 0,
      icon: <EnvelopeIcon className="w-5 h-5" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      isAlert: (stats?.overview.newInquiries || 0) > 0,
    },
    {
      title: 'Unverified Users',
      value: stats?.overview.unverifiedUsers || 0,
      icon: <ShieldCheckIcon className="w-5 h-5" />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      isAlert: (stats?.overview.unverifiedUsers || 0) > 0,
    },
    {
      title: 'Active Discounts',
      value: stats?.overview.activeDiscountCodes || 0,
      icon: <TicketIcon className="w-5 h-5" />,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
  ];

  // Mock recent activity - in production this would come from the API
  const recentActivity = stats?.recentActivity || [
    { type: 'user', message: 'New user registration', timestamp: '2 minutes ago', user: 'john.doe@email.com' },
    { type: 'property', message: 'New property listed', timestamp: '15 minutes ago', user: 'Agent Smith' },
    { type: 'inquiry', message: 'New property inquiry received', timestamp: '1 hour ago' },
    { type: 'verification', message: 'Agent license verified', timestamp: '2 hours ago', user: 'Jane Agent' },
    { type: 'discount', message: 'Discount code created', timestamp: '3 hours ago' },
  ];

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
            <h2 className="text-2xl font-bold mb-2">Welcome to Admin Dashboard</h2>
            <p className="text-blue-100">
              Here's what's happening with your platform today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchStats}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <ChartBarIcon className="w-5 h-5" />
              <span>Refresh</span>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Requires Attention</h3>
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
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
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
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={fetchStats}
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
          >
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ChartBarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Refresh Data</div>
              <div className="text-xs text-gray-500">Update statistics</div>
            </div>
          </button>

          <button
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all text-left group"
          >
            <div className="p-2 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
              <HomeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Review Properties</div>
              <div className="text-xs text-gray-500">Pending approval</div>
            </div>
          </button>

          <button
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-left group"
          >
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <UsersIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Verify Users</div>
              <div className="text-xs text-gray-500">Pending verification</div>
            </div>
          </button>

          <button
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-pink-400 hover:bg-pink-50 transition-all text-left group"
          >
            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg group-hover:bg-pink-600 group-hover:text-white transition-colors">
              <TicketIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Create Discount</div>
              <div className="text-xs text-gray-500">New promo code</div>
            </div>
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Database</span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="font-semibold text-green-600">Connected</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">API Server</span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="font-semibold text-green-600">Running</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Email Service</span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="font-semibold text-green-600">Active</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Last Updated</span>
              <span className="font-semibold text-gray-900">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Info</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Version</span>
              <span className="font-semibold text-gray-900">2.0.0</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Environment</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-semibold rounded-full">
                Development
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Total Inquiries</span>
              <span className="font-semibold text-gray-900">
                {stats?.overview.totalInquiries?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Admin Panel</span>
              <span className="px-2 py-1 bg-green-100 text-green-600 text-xs font-semibold rounded-full">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
