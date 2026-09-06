import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bars3Icon,
  HomeIcon,
  UsersIcon,
  EnvelopeIcon,
  ChartBarIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
} from '@/constants';
import { useAppContext } from '@/context/AppContext';
import UserAvatar from '@/components/shared/UserAvatar';
import type { OverviewData } from '../types';

interface AgencyDashboardHeaderProps {
  overview: OverviewData | null;
  isLoadingOverview: boolean;
  onMenuClick: () => void;
  onBackToSite: () => void;
  onBackToAgency?: () => void;
  onBrowseProperties?: () => void;
  userName: string;
}

const AgencyDashboardHeader: React.FC<AgencyDashboardHeaderProps> = ({
  overview,
  isLoadingOverview,
  onMenuClick,
  onBackToSite,
  onBackToAgency,
  onBrowseProperties,
  userName,
}) => {
  const { t } = useTranslation(['agencyDashboard']);
  // The signed-in owner, for the avatar beside their name in the corner.
  const { state } = useAppContext();
  const currentUser = state.currentUser;

  const quickStats = [
    {
      label: t('agencyDashboard:header.listings', 'Listings'),
      value: overview?.activeListings ?? 0,
      icon: <HomeIcon className="w-4 h-4" />,
      color: 'text-green-600',
    },
    {
      label: t('agencyDashboard:header.agents', 'Agents'),
      value: overview?.totalAgents ?? 0,
      icon: <UsersIcon className="w-4 h-4" />,
      color: 'text-blue-600',
    },
    {
      label: t('agencyDashboard:header.inquiries', 'Inquiries'),
      value: overview?.inquiriesThisMonth ?? 0,
      icon: <EnvelopeIcon className="w-4 h-4" />,
      color: 'text-red-600',
      isAlert: (overview?.inquiriesThisMonth ?? 0) > 0,
    },
    {
      label: t('agencyDashboard:header.views', 'Views'),
      value: overview?.totalViews ?? 0,
      icon: <ChartBarIcon className="w-4 h-4" />,
      color: 'text-purple-600',
    },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              aria-label={t('agencyDashboard:header.openMenu', 'Open menu')}
            >
              <Bars3Icon className="w-6 h-6" />
            </button>

            <div className="hidden md:flex items-center gap-6">
              {quickStats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-2">
                  <span className={stat.color}>{stat.icon}</span>
                  <div className="text-sm">
                    <span className="text-gray-500">{stat.label}:</span>
                    <span className={`ml-1 font-semibold ${stat.isAlert ? 'text-red-600' : 'text-gray-900'}`}>
                      {isLoadingOverview ? '...' : stat.value.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onBrowseProperties && (
              <button
                onClick={onBrowseProperties}
                className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors font-medium shadow-sm"
                aria-label={t('agencyDashboard:header.browseProperties', 'Browse Properties')}
              >
                <MagnifyingGlassIcon className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {t('agencyDashboard:header.browseProperties', 'Browse Properties')}
                </span>
              </button>
            )}
            {onBackToAgency && (
              <button
                onClick={onBackToAgency}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={t('agencyDashboard:header.backToAgency', 'Back to Agency')}
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {t('agencyDashboard:header.backToAgency', 'Back to Agency')}
                </span>
              </button>
            )}
            <button
              onClick={onBackToSite}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={t('agencyDashboard:header.backToSite', 'Back to Site')}
            >
              <HomeIcon className="w-4 h-4" />
              <span className="hidden sm:inline">
                {t('agencyDashboard:header.backToSite', 'Back to Site')}
              </span>
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-50 flex-shrink-0">
                <UserAvatar
                  src={currentUser?.avatarUrl}
                  alt={userName}
                  gender={currentUser?.gender}
                  seed={currentUser?.id || userName}
                  avatarOptions={currentUser?.avatarOptions}
                  width={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-sm font-medium text-gray-700">{userName}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AgencyDashboardHeader;
