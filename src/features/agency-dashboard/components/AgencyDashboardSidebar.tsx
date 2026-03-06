import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChartBarIcon,
  UsersIcon,
  HomeIcon,
  EnvelopeIcon,
  ArrowTrendingUpIcon,
  CurrencyEuroIcon,
  BuildingOfficeIcon,
  ChatBubbleLeftRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
} from '@/constants';
import type { AgencyDashboardSection } from '@/types';
import type { OverviewData } from '../types';

interface AgencyDashboardSidebarProps {
  activeSection: AgencyDashboardSection;
  onSectionChange: (section: AgencyDashboardSection) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  overview: OverviewData | null;
  pendingJoinRequests?: number;
  onBrowseProperties?: () => void;
  onBackToAgency?: () => void;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

interface NavItem {
  id: AgencyDashboardSection;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: string;
}

const AgencyDashboardSidebar: React.FC<AgencyDashboardSidebarProps> = ({
  activeSection,
  onSectionChange,
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileClose,
  overview,
  pendingJoinRequests = 0,
  onBrowseProperties,
  onBackToAgency,
}) => {
  const { t } = useTranslation(['agencyDashboard']);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['main', 'management', 'settings']);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const navGroups: NavGroup[] = [
    {
      id: 'main',
      label: t('agencyDashboard:sidebar.main', 'Main'),
      items: [
        {
          id: 'overview',
          label: t('agencyDashboard:sidebar.overview', 'Overview'),
          icon: <ChartBarIcon className="w-5 h-5" />,
        },
        {
          id: 'agents',
          label: t('agencyDashboard:sidebar.agents', 'Agents'),
          icon: <UsersIcon className="w-5 h-5" />,
          badge: pendingJoinRequests > 0 ? pendingJoinRequests : overview?.totalAgents,
          badgeColor: pendingJoinRequests > 0 ? 'bg-red-500 animate-pulse' : undefined,
        },
        {
          id: 'leads',
          label: t('agencyDashboard:sidebar.leads', 'Leads & Inquiries'),
          icon: <EnvelopeIcon className="w-5 h-5" />,
          badge: overview?.inquiriesThisMonth,
          badgeColor: overview?.inquiriesThisMonth ? 'bg-red-500' : undefined,
        },
      ],
    },
    {
      id: 'management',
      label: t('agencyDashboard:sidebar.management', 'Management'),
      items: [
        {
          id: 'properties',
          label: t('agencyDashboard:sidebar.properties', 'Properties'),
          icon: <HomeIcon className="w-5 h-5" />,
          badge: overview?.activeListings,
        },
        {
          id: 'analytics',
          label: t('agencyDashboard:sidebar.analytics', 'Analytics'),
          icon: <ArrowTrendingUpIcon className="w-5 h-5" />,
        },
        {
          id: 'financial',
          label: t('agencyDashboard:sidebar.financial', 'Financial'),
          icon: <CurrencyEuroIcon className="w-5 h-5" />,
        },
      ],
    },
    {
      id: 'settings',
      label: t('agencyDashboard:sidebar.settingsGroup', 'Settings'),
      items: [
        {
          id: 'profile',
          label: t('agencyDashboard:sidebar.profile', 'Agency Profile'),
          icon: <BuildingOfficeIcon className="w-5 h-5" />,
        },
        {
          id: 'team',
          label: t('agencyDashboard:sidebar.team', 'Team'),
          icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />,
        },
      ],
    },
  ];

  const sidebarContent = (
    <>
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center">
              <BuildingOfficeIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">
              {t('agencyDashboard:sidebar.title', 'Agency Dashboard')}
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 mx-auto bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center">
            <BuildingOfficeIcon className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
          aria-label="Close sidebar"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Agency dashboard navigation">
        {navGroups.map((group) => (
          <div key={group.id} className="mb-2">
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

            {(collapsed || expandedGroups.includes(group.id)) && (
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all ${
                      activeSection === item.id
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    } ${collapsed ? 'justify-center' : ''}`}
                    aria-current={activeSection === item.id ? 'page' : undefined}
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
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-800 p-3 space-y-1">
        {onBrowseProperties && (
          <button
            onClick={onBrowseProperties}
            title={collapsed ? t('agencyDashboard:sidebar.browseProperties', 'Browse Properties') : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-emerald-400 hover:bg-emerald-900/30 hover:text-emerald-300 transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
            {!collapsed && (
              <span className="text-sm font-medium">
                {t('agencyDashboard:sidebar.browseProperties', 'Browse Properties')}
              </span>
            )}
          </button>
        )}
        {onBackToAgency && (
          <button
            onClick={onBackToAgency}
            title={collapsed ? t('agencyDashboard:sidebar.viewAgencyPage', 'View Agency Page') : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <ArrowTopRightOnSquareIcon className="w-5 h-5" />
            {!collapsed && (
              <span className="text-sm font-medium">
                {t('agencyDashboard:sidebar.viewAgencyPage', 'View Agency Page')}
              </span>
            )}
          </button>
        )}
        <div className="hidden lg:block">
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRightIcon className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeftIcon className="w-5 h-5" />
                <span className="text-sm">{t('agencyDashboard:sidebar.collapse', 'Collapse')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-full bg-gray-900 transition-all duration-300 z-50 ${
          collapsed ? 'w-20' : 'w-72'
        }`}
      >
        {sidebarContent}
      </aside>

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

export default AgencyDashboardSidebar;
