import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BuildingOfficeIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  ClockIcon,
  UsersIcon,
  HomeIcon,
  ShieldCheckIcon,
} from '@/constants';
import { useAgency } from '@/src/features/agencies/hooks/useAgency';

interface AgencyInfoCardProps {
  agencyId: string;
}

const AgencyInfoCard: React.FC<AgencyInfoCardProps> = ({ agencyId }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const { agency, isLoading } = useAgency(agencyId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-200 rounded-xl" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!agency) return null;

  const agencyData = agency as Record<string, unknown>;

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const infoItems = [
    {
      icon: <MapPinIcon className="w-4 h-4" />,
      label: t('agencyDashboard:overview.location', 'Location'),
      value: [agencyData.city, agencyData.country].filter(Boolean).join(', ') || '-',
    },
    {
      icon: <EnvelopeIcon className="w-4 h-4" />,
      label: t('agencyDashboard:overview.email', 'Email'),
      value: (agencyData.email as string) || '-',
    },
    {
      icon: <PhoneIcon className="w-4 h-4" />,
      label: t('agencyDashboard:overview.phone', 'Phone'),
      value: (agencyData.phone as string) || '-',
    },
    {
      icon: <GlobeAltIcon className="w-4 h-4" />,
      label: t('agencyDashboard:overview.website', 'Website'),
      value: (agencyData.website as string) || '-',
      isLink: !!(agencyData.website),
    },
  ];

  const statsItems = [
    {
      icon: <HomeIcon className="w-4 h-4 text-green-600" />,
      label: t('agencyDashboard:overview.totalProperties', 'Properties'),
      value: (agencyData.totalProperties as number) ?? 0,
    },
    {
      icon: <UsersIcon className="w-4 h-4 text-blue-600" />,
      label: t('agencyDashboard:overview.totalAgentsCount', 'Agents'),
      value: (agencyData.totalAgents as number) ?? 0,
    },
    {
      icon: <ClockIcon className="w-4 h-4 text-amber-600" />,
      label: t('agencyDashboard:overview.yearsInBusiness', 'Years'),
      value: (agencyData.yearsInBusiness as number) ?? '-',
    },
  ];

  const languages = (agencyData.languages as string[]) || [];
  const agencyType = (agencyData.type as string) || 'standard';
  const createdAt = agencyData.createdAt as string;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center flex-shrink-0">
          {agencyData.logo ? (
            <img src={agencyData.logo as string} alt={agencyData.name as string} className="w-14 h-14 rounded-xl object-cover" />
          ) : (
            <BuildingOfficeIcon className="w-7 h-7 text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-gray-900 truncate">
            {agencyData.name as string}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium capitalize">
              <ShieldCheckIcon className="w-3 h-3" />
              {agencyType}
            </span>
            {agencyData.isFeatured && (
              <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                {t('agencyDashboard:overview.featured', 'Featured')}
              </span>
            )}
          </div>
        </div>
      </div>

      {agencyData.description && (
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
          {agencyData.description as string}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 mb-5">
        {statsItems.map((item) => (
          <div key={item.label} className="bg-gray-50 rounded-xl px-3 py-2.5 text-center">
            <div className="flex justify-center mb-1">{item.icon}</div>
            <div className="text-lg font-bold text-gray-900">{item.value}</div>
            <div className="text-[10px] text-gray-500 font-medium uppercase">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2.5 mb-4">
        {infoItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5 text-sm">
            <span className="text-gray-400 flex-shrink-0">{item.icon}</span>
            <span className="text-gray-500 flex-shrink-0 w-16">{item.label}:</span>
            {item.isLink && item.value !== '-' ? (
              <a
                href={item.value.startsWith('http') ? item.value : `https://${item.value}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 truncate font-medium"
              >
                {item.value}
              </a>
            ) : (
              <span className="text-gray-900 truncate">{item.value}</span>
            )}
          </div>
        ))}
      </div>

      {languages.length > 0 && (
        <div className="border-t border-gray-100 pt-3 mb-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t('agencyDashboard:overview.languages', 'Languages')}
          </span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {languages.map((lang) => (
              <span key={lang} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {createdAt && (
        <div className="border-t border-gray-100 pt-3">
          <span className="text-xs text-gray-400">
            {t('agencyDashboard:overview.memberSince', 'Member since {{date}}', {
              date: formatDate(createdAt),
            })}
          </span>
        </div>
      )}
    </div>
  );
};

export default AgencyInfoCard;
