import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClockIcon,
  UsersIcon,
  HomeIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  TicketIcon,
  ShieldCheckIcon,
  TrashIcon,
  PencilIcon,
  PlusIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@/constants';

interface ActivityItem {
  id: string;
  type: 'user' | 'property' | 'inquiry' | 'verification' | 'discount' | 'security' | 'system';
  action: 'create' | 'update' | 'delete' | 'verify' | 'login' | 'logout' | 'settings';
  message: string;
  details?: string;
  user?: {
    name: string;
    email: string;
    role: string;
  };
  timestamp: string;
  ipAddress?: string;
}

const ActivityLog: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('week');

  useEffect(() => {
    fetchActivities();
  }, [currentPage, filter, dateRange]);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      // Simulate API call - in production this would fetch from backend
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock data
      const mockActivities: ActivityItem[] = [
        {
          id: '1',
          type: 'user',
          action: 'create',
          message: 'New user registered',
          details: 'User john.doe@email.com created an account',
          user: { name: 'System', email: 'system@balkanestateai.com', role: 'system' },
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          ipAddress: '192.168.1.100'
        },
        {
          id: '2',
          type: 'verification',
          action: 'verify',
          message: 'Agent license verified',
          details: 'License for Agent Smith verified by admin',
          user: { name: 'Admin User', email: 'admin@balkanestateai.com', role: 'admin' },
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          ipAddress: '192.168.1.1'
        },
        {
          id: '3',
          type: 'property',
          action: 'create',
          message: 'New property listed',
          details: 'Property "Modern Apartment in Belgrade" added',
          user: { name: 'Agent Smith', email: 'agent@balkanestateai.com', role: 'agent' },
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          ipAddress: '192.168.1.50'
        },
        {
          id: '4',
          type: 'inquiry',
          action: 'create',
          message: 'New inquiry received',
          details: 'Inquiry for property #12345 from buyer@email.com',
          user: { name: 'System', email: 'system@balkanestateai.com', role: 'system' },
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: '5',
          type: 'discount',
          action: 'create',
          message: 'Discount code created',
          details: 'Code SUMMER2024 created with 20% off',
          user: { name: 'Admin User', email: 'admin@balkanestateai.com', role: 'admin' },
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
          ipAddress: '192.168.1.1'
        },
        {
          id: '6',
          type: 'security',
          action: 'login',
          message: 'Admin login',
          details: 'Admin user logged in to admin panel',
          user: { name: 'Super Admin', email: 'superadmin@balkanestateai.com', role: 'super_admin' },
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
          ipAddress: '10.0.0.1'
        },
        {
          id: '7',
          type: 'user',
          action: 'update',
          message: 'User profile updated',
          details: 'Email verification status changed for user@email.com',
          user: { name: 'Admin User', email: 'admin@balkanestateai.com', role: 'admin' },
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
          ipAddress: '192.168.1.1'
        },
        {
          id: '8',
          type: 'property',
          action: 'delete',
          message: 'Property removed',
          details: 'Property #54321 deleted by owner request',
          user: { name: 'Admin User', email: 'admin@balkanestateai.com', role: 'admin' },
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
          ipAddress: '192.168.1.1'
        },
        {
          id: '9',
          type: 'system',
          action: 'settings',
          message: 'System settings updated',
          details: 'Email notification settings modified',
          user: { name: 'Super Admin', email: 'superadmin@balkanestateai.com', role: 'super_admin' },
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
          ipAddress: '10.0.0.1'
        },
        {
          id: '10',
          type: 'verification',
          action: 'update',
          message: 'Verification request pending',
          details: 'Agent Jane Doe submitted license for verification',
          user: { name: 'Jane Doe', email: 'jane@agency.com', role: 'agent' },
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
          ipAddress: '192.168.1.75'
        },
      ];

      // Filter activities
      let filtered = mockActivities;
      if (filter !== 'all') {
        filtered = mockActivities.filter(a => a.type === filter);
      }

      setActivities(filtered);
      setTotalPages(Math.ceil(filtered.length / 10));
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'user': return <UsersIcon className="w-4 h-4" />;
      case 'property': return <HomeIcon className="w-4 h-4" />;
      case 'inquiry': return <EnvelopeIcon className="w-4 h-4" />;
      case 'verification': return <ShieldCheckIcon className="w-4 h-4" />;
      case 'discount': return <TicketIcon className="w-4 h-4" />;
      case 'security': return <ShieldCheckIcon className="w-4 h-4" />;
      case 'system': return <ClockIcon className="w-4 h-4" />;
      default: return <ClockIcon className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'user': return 'bg-blue-100 text-blue-600';
      case 'property': return 'bg-green-100 text-green-600';
      case 'inquiry': return 'bg-purple-100 text-purple-600';
      case 'verification': return 'bg-amber-100 text-amber-600';
      case 'discount': return 'bg-pink-100 text-pink-600';
      case 'security': return 'bg-red-100 text-red-600';
      case 'system': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <PlusIcon className="w-3 h-3" />;
      case 'update': return <PencilIcon className="w-3 h-3" />;
      case 'delete': return <TrashIcon className="w-3 h-3" />;
      case 'verify': return <CheckCircleIcon className="w-3 h-3" />;
      default: return null;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'text-green-600';
      case 'update': return 'text-blue-600';
      case 'delete': return 'text-red-600';
      case 'verify': return 'text-amber-600';
      default: return 'text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const filterOptions = [
    { value: 'all', label: 'All Activities' },
    { value: 'user', label: 'User Actions' },
    { value: 'property', label: 'Property Actions' },
    { value: 'inquiry', label: 'Inquiries' },
    { value: 'verification', label: 'Verifications' },
    { value: 'discount', label: 'Discounts' },
    { value: 'security', label: 'Security' },
    { value: 'system', label: 'System' },
  ];

  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Activity Log</h2>
            <p className="text-gray-500">Track all administrative actions and system events</p>
          </div>
          <button
            onClick={fetchActivities}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading activity log...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center">
            <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No activities found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Type Icon */}
                  <div className={`p-2 rounded-lg ${getTypeColor(activity.type)}`}>
                    {getTypeIcon(activity.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{activity.message}</span>
                      {getActionIcon(activity.action) && (
                        <span className={`${getActionColor(activity.action)}`}>
                          {getActionIcon(activity.action)}
                        </span>
                      )}
                    </div>
                    {activity.details && (
                      <p className="text-sm text-gray-500 mb-2">{activity.details}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                      {activity.user && (
                        <span className="flex items-center gap-1">
                          <UsersIcon className="w-3 h-3" />
                          {activity.user.name}
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            activity.user.role === 'super_admin' ? 'bg-red-100 text-red-600' :
                            activity.user.role === 'admin' ? 'bg-blue-100 text-blue-600' :
                            activity.user.role === 'agent' ? 'bg-green-100 text-green-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {activity.user.role.replace('_', ' ')}
                          </span>
                        </span>
                      )}
                      {activity.ipAddress && (
                        <span>IP: {activity.ipAddress}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Timestamp (larger screens) */}
                  <div className="hidden lg:block text-right">
                    <div className="text-sm text-gray-500">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Activity Log</h3>
        <div className="flex flex-wrap gap-4">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            Export as CSV
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            Export as PDF
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            Export as JSON
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityLog;
