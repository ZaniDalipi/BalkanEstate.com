// PropertyContact Component
// Seller contact sidebar with calculators and quick actions

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Property, Agency } from '../../../types';
import { PhoneIcon, ShareIcon, MapPinIcon, UsersIcon, HomeIcon, BuildingOfficeIcon, ChevronRightIcon } from '../../../constants';
import { useAppContext } from '../../../context/AppContext';
import { optimizeCloudinaryUrl } from '../../../config/cloudinaryConfig';
import * as api from '../../../services/apiService';
import MortgageCalculator from '@/src/features/calculators/components/MortgageCalculator';
import RentVsBuyCalculator from '@/src/features/calculators/components/RentVsBuyCalculator';
import PropertyInquiryModal from '@/src/features/inquiries/components/PropertyInquiryModal';
import RentAffordabilityCalculator from '@/src/features/rental/components/RentAffordabilityCalculator';
import MoveInCostBreakdown from '@/src/features/rental/components/MoveInCostBreakdown';
import ScheduleViewingModal from '@/src/features/rental/components/ScheduleViewingModal';
import { formatCityPlace } from '@/shared/geo';

interface PropertyContactProps {
  property: Property;
  isCreatingConversation: boolean;
  onContactSeller: () => void;
}

/**
 * PropertyContact Component
 *
 * Sticky sidebar for contacting the seller and financial calculators:
 * - Seller information and avatar
 * - Call seller button
 * - Message seller button
 * - Quick actions (Compare, Print, Save, Share)
 * - Mortgage calculator
 * - Rent vs buy calculator
 *
 * Usage:
 * ```tsx
 * <PropertyContact
 *   property={property}
 *   isCreatingConversation={isCreating}
 *   onContactSeller={handleContact}
 * />
 * ```
 */
export const PropertyContact: React.FC<PropertyContactProps> = ({
  property,
  isCreatingConversation,
  onContactSeller,
}) => {
  const { t, i18n } = useTranslation(['property', 'rental', 'common']);
  const { state, dispatch } = useAppContext();
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [showViewingModal, setShowViewingModal] = useState(false);

  const isRental = property.listingType === 'rent';

  // Fetch agency data for properties listed by an agent belonging to an agency
  const [agencyData, setAgencyData] = useState<Agency | null>(null);
  const agencyId = property.seller?.agencyId;

  useEffect(() => {
    if (!agencyId) return;
    let cancelled = false;
    api.getAgency(agencyId).then((res: any) => {
      if (!cancelled) {
        setAgencyData(res.agency || res);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [agencyId]);

  const handleVisitAgency = useCallback(() => {
    if (!agencyData) return;
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
    dispatch({ type: 'SET_SELECTED_AGENCY', payload: agencyData._id });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencyDetail' });
    const urlSlug = (agencyData.slug || agencyData._id).replace(',', '/');
    window.history.pushState({}, '', `/agencies/${urlSlug}`);
  }, [agencyData, dispatch]);

  const isInComparison = state.comparisonList.includes(property.id);
  const currentUser = state.currentUser || state.user;

  const handleCompare = () => {
    if (isInComparison) {
      dispatch({ type: 'REMOVE_FROM_COMPARISON', payload: property.id });
    } else {
      if (state.comparisonList.length >= 5) {
        dispatch({
          type: 'SHOW_ALERT',
          payload: {
            type: 'warning',
            title: t('property:actions.compareLimitTitle', 'Comparison Limit'),
            message: t('property:actions.compareLimit'),
          },
        });
        return;
      }
      dispatch({ type: 'ADD_TO_COMPARISON', payload: property.id });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleScheduleVisit = () => {
    // Open viewing scheduler for all property types (rent & buy)
    setShowViewingModal(true);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = property.title;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error - show fallback menu
        setShowShareMenu(!showShareMenu);
      }
    } else {
      setShowShareMenu(!showShareMenu);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowShareMenu(false);
  };

  return (
    <div className="lg:sticky lg:top-20 space-y-3 lg:space-y-4">
      {/* Quick Actions Card */}
      <div data-section="availability" className="scroll-mt-24 bg-white p-4 rounded-xl shadow-lg border border-neutral-200">
        <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">{t('property:actions.quickActions')}</h3>
        <div className="grid grid-cols-3 gap-2">
          {/* Call Button */}
          {property.seller?.phone ? (
            <a
              href={`tel:${property.seller.phone}`}
              className="flex flex-col items-center justify-center p-3 rounded-xl border-2 bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-green-50 hover:border-green-200 hover:text-green-600 transition-all duration-200"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-xs font-medium">{t('property:actions.call', 'Call')}</span>
            </a>
          ) : (
            <button
              disabled
              className="flex flex-col items-center justify-center p-3 rounded-xl border-2 bg-neutral-50 border-neutral-100 text-neutral-300 cursor-not-allowed"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-xs font-medium">{t('property:actions.call', 'Call')}</span>
            </button>
          )}

          {/* Email / Message Button */}
          <button
            onClick={() => setShowInquiryModal(true)}
            className="flex flex-col items-center justify-center p-3 rounded-xl border-2 bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all duration-200"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">{t('property:actions.email', 'Email')}</span>
          </button>

          {/* Share Button */}
          <div className="relative">
            <button
              onClick={handleShare}
              className="w-full flex flex-col items-center justify-center p-3 rounded-xl border-2 bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-500 transition-all duration-200"
            >
              <ShareIcon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{t('property:actions.share')}</span>
            </button>

            {/* Share Menu Dropdown */}
            {showShareMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-10 animate-fade-in">
                <button
                  onClick={copyToClipboard}
                  className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {t('property:actions.copyLink')}
                </button>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  {t('common:social.facebook')}
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(property.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  {t('common:social.twitter')}
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(property.title + ' ' + window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  {t('common:social.whatsapp')}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Visit Button */}
        {property.status !== 'sold' && (
          <button
            onClick={property.visitAvailability?.enabled ? handleScheduleVisit : undefined}
            disabled={!property.visitAvailability?.enabled}
            className={`w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${property.visitAvailability?.enabled ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg' : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {t('property:actions.scheduleVisit')}
          </button>
        )}
      </div>

      {/* Contact Seller Card */}
      <div className="bg-white p-4 rounded-xl shadow-lg border border-neutral-200">
        <h3 className="text-base sm:text-lg font-bold text-neutral-800 mb-4">{t('property:actions.contactSeller')}</h3>

        {/* Seller Info - Clickable for agents */}
        {property.seller?.type === 'agent' ? (
          <button
            onClick={() => {
              const agentIdentifier = property.seller?.agentId || property.sellerId;
              dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
              dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
              dispatch({ type: 'SET_SELECTED_AGENT', payload: agentIdentifier });
              dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agentProfile' });
              window.history.pushState({}, '', `/agents/${agentIdentifier}`);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="flex items-center gap-4 mb-4 w-full p-2 -m-2 rounded-xl hover:bg-blue-50 transition-colors group cursor-pointer text-left"
          >
            {property.seller?.avatarUrl ? (
              <img
                src={optimizeCloudinaryUrl(property.seller.avatarUrl, { width: 96, quality: 'auto', crop: 'fill' })}
                alt={property.seller.name}
                loading="lazy"
                decoding="async"
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-neutral-100 group-hover:ring-blue-200 transition-all"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ring-2 ring-neutral-100 group-hover:ring-blue-200 transition-all shadow-md">
                <span className="text-white font-bold text-lg">
                  {property.seller?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '👤'}
                </span>
              </div>
            )}
            <div className="flex-1">
              <p className="font-bold text-base text-neutral-900 group-hover:text-blue-600 transition-colors">{property.seller?.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                  {t('property:seller.agent')}
                </span>
                <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {t('property:seller.viewProfile', 'View Profile')} →
                </span>
              </div>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-4 mb-4">
            {property.seller?.avatarUrl ? (
              <img
                src={optimizeCloudinaryUrl(property.seller.avatarUrl, { width: 96, quality: 'auto', crop: 'fill' })}
                alt={property.seller.name}
                loading="lazy"
                decoding="async"
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-neutral-100"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center ring-2 ring-neutral-100 shadow-md">
                <span className="text-white font-bold text-lg">
                  {property.seller?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '👤'}
                </span>
              </div>
            )}
            <div className="flex-1">
              <p className="font-bold text-base text-neutral-900">{property.seller?.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                  {t('property:seller.private')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Contact Buttons */}
        <div className="space-y-2.5 sm:space-y-2">
          {property.status === 'sold' ? (
            <div className="w-full flex justify-center items-center gap-2 py-3 sm:py-2.5 px-4 border border-neutral-300 rounded-xl shadow-sm text-sm font-medium text-neutral-400 bg-neutral-100 cursor-not-allowed min-h-[48px]">
              <PhoneIcon className="w-5 h-5 sm:w-4 sm:h-4" />
              {t('property:actions.propertySold')}
            </div>
          ) : (
            <a
              href={`tel:${property.seller?.phone}`}
              className="w-full flex justify-center items-center gap-2 py-3 sm:py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary-dark active:opacity-90 transition-colors min-h-[48px]"
            >
              <PhoneIcon className="w-5 h-5 sm:w-4 sm:h-4" />
              {property.seller?.phone || t('property:actions.callSeller')}
            </a>
          )}

          {/* WhatsApp & Viber side by side on mobile for quick access */}
          {property.status !== 'sold' && property.seller?.phone && (
            <div className="grid grid-cols-2 gap-2">
              {/* WhatsApp Contact Button */}
              <a
                href={`https://wa.me/${property.seller.phone.replace(/[\s\-\(\)]/g, '')}?text=${encodeURIComponent(
                  t('property:actions.whatsappMessage', {
                    title: property.title,
                    url: window.location.href,
                    defaultValue: `Hi, I'm interested in this property: ${property.title}\n${window.location.href}`
                  })
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex justify-center items-center gap-2 py-3 sm:py-2.5 px-3 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#25D366] hover:bg-[#20BD5A] active:bg-[#1AAD4F] transition-colors min-h-[48px]"
              >
                <svg className="w-5 h-5 sm:w-4 sm:h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span className="truncate">{t('property:actions.whatsappSeller', 'WhatsApp')}</span>
              </a>

              {/* Viber Contact Button */}
              <a
                href={`viber://chat?number=${property.seller.phone.replace(/[\s\-\(\)\+]/g, '')}`}
                onClick={(e) => {
                  const phone = property.seller!.phone!.replace(/[\s\-\(\)\+]/g, '');
                  const deepLink = `viber://chat?number=${phone}`;
                  const fallback = 'https://www.viber.com/';
                  e.preventDefault();
                  window.location.href = deepLink;
                  setTimeout(() => {
                    if (!document.hidden) window.open(fallback, '_blank');
                  }, 1500);
                }}
                className="flex justify-center items-center gap-2 py-3 sm:py-2.5 px-3 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#7360F2] hover:bg-[#6050E0] active:bg-[#5040D0] transition-colors min-h-[48px]"
              >
                <svg className="w-5 h-5 sm:w-4 sm:h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1C6.477 1 2 5.477 2 11c0 2.136.67 4.116 1.81 5.74L2 22l5.26-1.81A9.94 9.94 0 0012 21c5.523 0 10-4.477 10-10S17.523 1 12 1zm-1.5 4.5c.3 0 .55.12.7.4l.9 1.7c.15.3.08.6-.15.8l-.5.6c-.12.15-.08.35.08.52.35.45.75.87 1.2 1.25.5.42 1.05.78 1.65 1.05.2.1.4.06.55-.1l.45-.55c.18-.22.42-.25.68-.12l1.7.9c.28.15.38.4.3.7-.12.48-.38.9-.75 1.2-.33.27-.72.45-1.15.5-.35.04-.7.02-.95-.05-.82-.22-1.6-.6-2.35-1.12-1.2-.83-2.25-1.88-3.1-3.1-.55-.75-.95-1.55-1.15-2.4-.12-.5-.08-1 .12-1.45.18-.4.45-.72.78-1 .3-.25.62-.43.95-.43z" />
                </svg>
                <span className="truncate">{t('property:actions.viberSeller', 'Viber')}</span>
              </a>
            </div>
          )}

          {/* Rented availability notice - hide if rental period has fully passed (day after rentedUntil) */}
          {property.status === 'rented' && property.rentedUntil && (() => {
            const rentedEnd = new Date(property.rentedUntil);
            rentedEnd.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return rentedEnd >= today;
          })() && (
            <div className="w-full p-3 bg-orange-50 border border-orange-200 rounded-xl text-center mb-1">
              <p className="text-xs font-semibold text-orange-700">
                {t('rental:status.availableFromNotice', { date: new Date(property.rentedUntil).toLocaleDateString(i18n.language === 'me' ? 'sr-Latn-ME' : i18n.language === 'sq' ? 'sq-AL' : i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }) })}
              </p>
              <p className="text-[10px] text-orange-600 mt-0.5">{t('rental:status.inquireAvailability')}</p>
            </div>
          )}

          <button
            onClick={onContactSeller}
            disabled={isCreatingConversation || property.status === 'sold'}
            className="w-full flex justify-center items-center gap-2 py-3 sm:py-2.5 px-4 border border-primary text-primary rounded-xl text-sm font-semibold bg-white hover:bg-primary-light active:bg-primary-light/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[48px]"
          >
            <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {isCreatingConversation
              ? t('property:actions.startingChat')
              : property.status === 'sold'
              ? t('property:actions.propertySold')
              : property.status === 'rented'
              ? t('rental:status.inquireAvailability')
              : t('property:actions.messageSeller')}
          </button>

          {/* Email Inquiry Button - For quick inquiries without account */}
          {property.status !== 'sold' && (
            <button
              onClick={() => setShowInquiryModal(true)}
              className="w-full flex justify-center items-center gap-2 py-3 sm:py-2.5 px-4 border border-green-500 text-green-600 rounded-xl text-sm font-semibold bg-white hover:bg-green-50 active:bg-green-100 transition-colors min-h-[48px]"
            >
              <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {t('property:actions.sendInquiry', 'Send Email Inquiry')}
            </button>
          )}
        </div>
      </div>

      {/* Property Inquiry Modal */}
      <PropertyInquiryModal
        property={property}
        isOpen={showInquiryModal}
        onClose={() => setShowInquiryModal(false)}
        defaultName={currentUser?.name || ''}
        defaultEmail={currentUser?.email || ''}
        defaultPhone={currentUser?.phone || ''}
      />

      {/* Schedule Viewing Modal (All property types) */}
      <ScheduleViewingModal
        property={property}
        isOpen={showViewingModal}
        onClose={() => setShowViewingModal(false)}
      />

      {/* Agency Card - Show when agent belongs to an agency */}
      {agencyId && agencyData && (
        <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/60 overflow-hidden">
          {/* Agency Header with Gradient */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 sm:p-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  {agencyData.logo ? (
                    <img
                      src={agencyData.logo}
                      alt={agencyData.name}
                      loading="lazy"
                      decoding="async"
                      className="w-8 h-8 sm:w-12 sm:h-12 object-cover rounded-md sm:rounded-lg"
                    />
                  ) : (
                    <BuildingOfficeIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs font-medium text-white/80 mb-0.5 sm:mb-1">{t('agents:profilePage.agencyCard.memberOf', 'Member of')}</p>
                  <h3 className="text-sm sm:text-lg font-bold text-white truncate">{agencyData.name}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Agency Stats */}
          <div className="p-3 sm:p-5 bg-gradient-to-b from-gray-50 to-white">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                  <UsersIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                  <span className="text-[10px] sm:text-xs text-gray-600 font-medium">{t('agents:profilePage.agencyCard.agents', 'Agents')}</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{agencyData.totalAgents || 0}</p>
              </div>
              <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                  <HomeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                  <span className="text-[10px] sm:text-xs text-gray-600 font-medium">{t('agents:profilePage.agencyCard.properties', 'Properties')}</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{agencyData.totalProperties || 0}</p>
              </div>
            </div>

            {/* Location */}
            {agencyData.city && (
              <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 text-gray-600 bg-white rounded-lg p-2 sm:p-3 border border-gray-200">
                <MapPinIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 text-gray-500" />
                <span className="text-xs sm:text-sm truncate">{formatCityPlace(agencyData.city, agencyData.country).full}</span>
              </div>
            )}

            {/* Visit Agency Button */}
            <button
              onClick={handleVisitAgency}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 sm:py-3.5 px-3 sm:px-4 rounded-lg sm:rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 group text-sm sm:text-base"
            >
              <BuildingOfficeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{t('agents:profilePage.agencyCard.visitAgency', 'Visit Agency')}</span>
              <ChevronRightIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* Rental-specific widgets OR sale-specific widgets */}
      <div data-section="calculators" className="scroll-mt-24 space-y-3 lg:space-y-4">
        {isRental ? (
          <>
            {/* Rent Affordability Calculator */}
            <RentAffordabilityCalculator property={property} />

            {/* Move-in Cost Breakdown */}
            <MoveInCostBreakdown property={property} />
          </>
        ) : (
          <>
            {/* Mortgage Calculator */}
            <MortgageCalculator propertyPrice={property.price} country={property.country} />

            {/* Rent vs Buy Calculator */}
            <RentVsBuyCalculator propertyPrice={property.price} country={property.country} />
          </>
        )}
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};
