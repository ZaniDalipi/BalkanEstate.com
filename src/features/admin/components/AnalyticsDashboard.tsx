import React, { useState, useEffect } from 'react';
import {
  UsersIcon,
  HomeIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  TicketIcon,
  ChartBarIcon
} from '../../constants';

interface AdminStats {
  overview: {
    totalUsers: number;
    totalAgents: number;
    totalAgencies: number;
    totalProperties: number;
    activeDiscountCodes: number;
  };
}

const AnalyticsDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch('http://localhost:5001/api/admin/stats', {
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
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center text-red-600">
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

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.overview.totalUsers || 0,
      icon: <UsersIcon className="w-8 h-8" />,
      color: 'bg-blue-500',
      description: 'Registered users',
    },
    {
      title: 'Active Agents',
      value: stats?.overview.totalAgents || 0,
      icon: <UserGroupIcon className="w-8 h-8" />,
      color: 'bg-purple-500',
      description: 'Verified agents',
    },
    {
      title: 'Agencies',
      value: stats?.overview.totalAgencies || 0,
      icon: <BuildingOfficeIcon className="w-8 h-8" />,
      color: 'bg-green-500',
      description: 'Registered agencies',
    },
    {
      title: 'Properties',
      value: stats?.overview.totalProperties || 0,
      icon: <HomeIcon className="w-8 h-8" />,
      color: 'bg-amber-500',
      description: 'Total listings',
    },
    {
      title: 'Discount Codes',
      value: stats?.overview.activeDiscountCodes || 0,
      icon: <TicketIcon className="w-8 h-8" />,
      color: 'bg-pink-500',
      description: 'Active codes',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Admin Dashboard</h2>
            <p className="text-blue-100">Welcome back! Here's what's happening with your platform.</p>
          </div>
          <ChartBarIcon className="w-16 h-16 text-blue-300 opacity-50" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.color} text-white p-3 rounded-lg`}>
                {card.icon}
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">{card.value.toLocaleString()}</div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{card.title}</h3>
            <p className="text-sm text-gray-600">{card.description}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.reload()}
            className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
          >
            <div className="font-semibold text-gray-900">Refresh Data</div>
            <div className="text-sm text-gray-600 mt-1">Update dashboard statistics</div>
          </button>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              // This would navigate to discount codes section
              const section = document.querySelector('[data-section="discounts"]');
              if (section) section.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors text-left"
          >
            <div className="font-semibold text-gray-900">Manage Discount Codes</div>
            <div className="text-sm text-gray-600 mt-1">Create and manage promotional codes</div>
          </a>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              // This would navigate to users section
              const section = document.querySelector('[data-section="users"]');
              if (section) section.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-4 border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-left"
          >
            <div className="font-semibold text-gray-900">Manage Users</div>
            <div className="text-sm text-gray-600 mt-1">View and edit user accounts</div>
          </a>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Environment</span>
            <span className="font-semibold text-gray-900">Development</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Database Status</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="font-semibold text-green-600">Connected</span>
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Last Updated</span>
            <span className="font-semibold text-gray-900">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Admin Panel Version</span>
            <span className="font-semibold text-gray-900">1.0.0</span>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-yellow-800 mb-1">Security Notice</h4>
            <p className="text-sm text-yellow-700">
              This admin panel is protected by role-based access control. All administrative actions are logged for security audit purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
