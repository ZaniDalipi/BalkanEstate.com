import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  HomeIcon,
  UsersIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
} from '@/constants';

interface AdminHeaderProps {
  stats?: {
    totalUsers?: number;
    totalProperties?: number;
    totalAgencies?: number;
    newInquiries?: number;
    unverifiedUsers?: number;
  };
  isLoadingStats: boolean;
  onMenuClick: () => void;
  onBackToSite: () => void;
  userName: string;
  userRole: string;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  stats,
  isLoadingStats,
  onMenuClick,
  onBackToSite,
  userName,
  userRole
}) => {
  const { t } = useTranslation(['admin']);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const quickStats = [
    {
      label: 'Users',
      value: stats?.totalUsers || 0,
      icon: <UsersIcon className="w-4 h-4" />,
      color: 'text-blue-600'
    },
    {
      label: 'Properties',
      value: stats?.totalProperties || 0,
      icon: <HomeIcon className="w-4 h-4" />,
      color: 'text-green-600'
    },
    {
      label: 'Agencies',
      value: stats?.totalAgencies || 0,
      icon: <BuildingOfficeIcon className="w-4 h-4" />,
      color: 'text-purple-600'
    },
    {
      label: 'Inquiries',
      value: stats?.newInquiries || 0,
      icon: <EnvelopeIcon className="w-4 h-4" />,
      color: 'text-red-600',
      isAlert: (stats?.newInquiries || 0) > 0
    }
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left side */}
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>

            {/* Quick stats - hidden on mobile */}
            <div className="hidden md:flex items-center gap-6">
              {quickStats.map((stat, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className={stat.color}>{stat.icon}</span>
                  <div className="text-sm">
                    <span className="text-gray-500">{stat.label}:</span>
                    <span className={`ml-1 font-semibold ${stat.isAlert ? 'text-red-600' : 'text-gray-900'}`}>
                      {isLoadingStats ? '...' : stat.value.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Back to site button */}
            <button
              onClick={onBackToSite}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <HomeIcon className="w-4 h-4" />
              <span>{t('admin:sidebar.backToSite')}</span>
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <BellIcon className="w-6 h-6" />
                {(stats?.newInquiries || 0) > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                )}
              </button>

              {/* Notifications dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {(stats?.newInquiries || 0) > 0 ? (
                      <div className="p-4 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <EnvelopeIcon className="w-5 h-5 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {stats?.newInquiries} new {stats?.newInquiries === 1 ? 'inquiry' : 'inquiries'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Pending review in Inquiries section
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {(stats?.unverifiedUsers || 0) > 0 ? (
                      <div className="p-4 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-yellow-100 rounded-lg">
                            <UsersIcon className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {stats?.unverifiedUsers} unverified users
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Review in Users section
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {(!stats?.newInquiries && !stats?.unverifiedUsers) && (
                      <div className="p-8 text-center">
                        <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">No new notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <UserCircleIcon className="w-8 h-8 text-gray-400" />
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-gray-900">{userName}</div>
                  <div className="text-xs text-gray-500 capitalize">{userRole.replace('_', ' ')}</div>
                </div>
                <ChevronDownIcon className="w-4 h-4 text-gray-400 hidden sm:block" />
              </button>

              {/* User dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="text-sm font-medium text-gray-900">{userName}</p>
                    <p className="text-xs text-gray-500 capitalize">{userRole.replace('_', ' ')}</p>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        // Navigate to settings
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Cog6ToothIcon className="w-5 h-5 text-gray-400" />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onBackToSite();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <HomeIcon className="w-5 h-5 text-gray-400" />
                      Back to Site
                    </button>
                    <hr className="my-2" />
                    <button
                      onClick={() => {
                        localStorage.removeItem('balkan_estate_token');
                        window.location.reload();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <ArrowRightOnRectangleIcon className="w-5 h-5" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
