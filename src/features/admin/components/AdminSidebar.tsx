import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChartBarIcon,
  TicketIcon,
  UsersIcon,
  UserGroupIcon,
  HomeIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  CurrencyEuroIcon,
  EnvelopeIcon,
  Cog6ToothIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  XMarkIcon,
  PlayCircleIcon,
  RocketLaunchIcon,
} from '@/constants';
import type { AdminView } from './AdminLayout';

interface AdminSidebarProps {
  activeSection: AdminView;
  onSectionChange: (section: AdminView) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  stats?: {
    totalUsers?: number;
    totalProperties?: number;
    totalAgencies?: number;
    newInquiries?: number;
    unverifiedUsers?: number;
  };
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

interface NavItem {
  id: AdminView;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: string;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeSection,
  onSectionChange,
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileClose,
  stats
}) => {
  const { t } = useTranslation(['admin']);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['overview', 'content', 'marketing']);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const navGroups: NavGroup[] = [
    {
      id: 'overview',
      label: t('admin:sidebar.overview', 'Overview'),
      items: [
        {
          id: 'dashboard',
          label: t('admin:sidebar.dashboard'),
          icon: <ChartBarIcon className="w-5 h-5" />
        },
        {
          id: 'inquiries',
          label: t('admin:sidebar.inquiries', 'Inquiries'),
          icon: <EnvelopeIcon className="w-5 h-5" />,
          badge: stats?.newInquiries,
          badgeColor: 'bg-red-500'
        },
        {
          id: 'agentRequests',
          label: t('admin:sidebar.agentRequests', 'Agent Requests'),
          icon: <UserGroupIcon className="w-5 h-5" />
        },
        {
          id: 'activity',
          label: t('admin:sidebar.activityLog', 'Activity Log'),
          icon: <ClockIcon className="w-5 h-5" />
        },
      ]
    },
    {
      id: 'content',
      label: t('admin:sidebar.contentManagement', 'Content'),
      items: [
        {
          id: 'users',
          label: t('admin:sidebar.usersAndAgents'),
          icon: <UsersIcon className="w-5 h-5" />,
          badge: stats?.unverifiedUsers,
          badgeColor: 'bg-yellow-500'
        },
        {
          id: 'properties',
          label: t('admin:sidebar.properties'),
          icon: <HomeIcon className="w-5 h-5" />,
          badge: stats?.totalProperties
        },
        {
          id: 'agencies',
          label: t('admin:sidebar.agencies'),
          icon: <BuildingOfficeIcon className="w-5 h-5" />,
          badge: stats?.totalAgencies
        },
        {
          id: 'howItWorks',
          label: t('admin:sidebar.howItWorks', 'How It Works'),
          icon: <PlayCircleIcon className="w-5 h-5" />
        },
      ]
    },
    {
      id: 'marketing',
      label: t('admin:sidebar.marketing', 'Marketing'),
      items: [
        {
          id: 'pricing',
          label: t('admin:sidebar.pricing', 'Pricing & Plans'),
          icon: <CurrencyEuroIcon className="w-5 h-5" />
        },
        {
          id: 'promotionPlans',
          label: t('admin:sidebar.promotionPlans', 'Promotion Plans'),
          icon: <RocketLaunchIcon className="w-5 h-5" />
        },
        {
          id: 'discounts',
          label: t('admin:sidebar.discountCodes'),
          icon: <TicketIcon className="w-5 h-5" />
        },
        {
          id: 'promotionCoupons',
          label: t('admin:sidebar.promotionCoupons'),
          icon: <SparklesIcon className="w-5 h-5" />
        },
      ]
    },
    {
      id: 'system',
      label: t('admin:sidebar.system', 'System'),
      items: [
        {
          id: 'settings',
          label: t('admin:sidebar.settings', 'Settings'),
          icon: <Cog6ToothIcon className="w-5 h-5" />
        },
      ]
    }
  ];

  const sidebarContent = (
    <>
      {/* Logo/Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">BE</span>
            </div>
            <span className="font-bold text-white">Admin Panel</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 mx-auto bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">BE</span>
          </div>
        )}

        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navGroups.map((group) => (
          <div key={group.id} className="mb-2">
            {/* Group header */}
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-300"
              >
                {group.label}
                <ChevronDownIcon
                  className={`w-4 h-4 transition-transform ${
                    expandedGroups.includes(group.id) ? 'rotate-180' : ''
                  }`}
                />
              </button>
            )}

            {/* Group items */}
            {(collapsed || expandedGroups.includes(group.id)) && (
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all ${
                      activeSection === item.id
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    } ${collapsed ? 'justify-center' : ''}`}
                  >
                    <span className={activeSection === item.id ? 'text-white' : 'text-gray-400'}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left text-sm">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                              item.badgeColor || 'bg-gray-600'
                            } text-white`}
                          >
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Collapse toggle - desktop only */}
      <div className="hidden lg:block border-t border-gray-800 p-3">
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          {collapsed ? (
            <ChevronRightIcon className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeftIcon className="w-5 h-5" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-full bg-gray-900 transition-all duration-300 z-50 ${
          collapsed ? 'w-20' : 'w-72'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden flex flex-col fixed left-0 top-0 h-full w-72 bg-gray-900 z-50 transform transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default AdminSidebar;
