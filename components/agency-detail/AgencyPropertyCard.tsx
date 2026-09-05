/**
 * Agency Property Card Component
 * Displayed on property detail pages when the property belongs to an agency.
 * Shows agency branding, quick stats, and a link to the full agency profile.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
} from '@/constants';
import { optimizeImageUrl } from '@/config/imageConfig';

interface AgencyPropertyCardProps {
  agencyId: string;
  agencyName: string;
  agencyLogo?: string;
  agencySlug?: string;
  phone?: string;
  email?: string;
  city?: string;
  country?: string;
  registrationNumber?: string;
  totalProperties?: number;
  totalAgents?: number;
  yearsInBusiness?: number;
  onNavigateToAgency?: (slug: string) => void;
}

const AgencyPropertyCard: React.FC<AgencyPropertyCardProps> = ({
  agencyId,
  agencyName,
  agencyLogo,
  agencySlug,
  phone,
  email,
  city,
  country,
  registrationNumber,
  totalProperties,
  totalAgents,
  yearsInBusiness,
  onNavigateToAgency,
}) => {
  const { t } = useTranslation(['agencyDetails']);

  const handleViewAgency = () => {
    const target = agencySlug || agencyId;
    if (onNavigateToAgency) {
      onNavigateToAgency(target);
    } else {
      window.history.pushState({}, '', `/agencies/${target}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const location = [city, country].filter(Boolean).join(', ');

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3">
        <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">
          {t('agencyDetails:propertyCard.listedBy', 'Listed by')}
        </p>
      </div>

      {/* Agency Info */}
      <div className="p-5">
        <div className="flex items-center gap-4 mb-4">
          {/* Logo */}
          {agencyLogo ? (
            <img
              src={optimizeImageUrl(agencyLogo, { width: 56, quality: 'auto', crop: 'fill' })}
              alt={agencyName}
              className="w-14 h-14 rounded-xl object-cover border border-gray-100 shadow-sm flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
              <BuildingOfficeIcon className="w-7 h-7 text-amber-600" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-gray-900 truncate">{agencyName}</h3>
            {location && (
              <p className="text-sm text-gray-500 truncate">{location}</p>
            )}
            {registrationNumber && (
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span className="text-xs text-green-700 font-medium">
                  {t('agencyDetails:propertyCard.registrationNumber', 'Reg. No.')} {registrationNumber}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {(totalProperties !== undefined || totalAgents !== undefined || yearsInBusiness !== undefined) && (
          <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
            {totalProperties !== undefined && totalProperties > 0 && (
              <span className="bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                {t('agencyDetails:propertyCard.properties', '{{count}} Properties', { count: totalProperties })}
              </span>
            )}
            {totalAgents !== undefined && totalAgents > 0 && (
              <span className="bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                {t('agencyDetails:propertyCard.agents', '{{count}} Agents', { count: totalAgents })}
              </span>
            )}
            {yearsInBusiness !== undefined && yearsInBusiness > 0 && (
              <span className="bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                {t('agencyDetails:propertyCard.yearsInBusiness', '{{count}} Years', { count: yearsInBusiness })}
              </span>
            )}
          </div>
        )}

        {/* Contact Actions */}
        <div className="flex gap-2 mb-3">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-100 transition-colors"
              aria-label={t('agencyDetails:propertyCard.contactAgency', 'Contact Agency')}
            >
              <PhoneIcon className="w-4 h-4" />
              {t('agencyDetails:labels.call', 'Call')}
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors"
              aria-label={`${t('agencyDetails:labels.email', 'Email')} ${agencyName}`}
            >
              <EnvelopeIcon className="w-4 h-4" />
              {t('agencyDetails:labels.email', 'Email')}
            </a>
          )}
        </div>

        {/* View Agency Link */}
        <button
          type="button"
          onClick={handleViewAgency}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          {t('agencyDetails:propertyCard.viewAgency', 'View Agency')}
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AgencyPropertyCard;
