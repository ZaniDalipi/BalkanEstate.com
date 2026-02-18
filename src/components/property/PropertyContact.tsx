// PropertyContact Component
// Seller contact sidebar with calculators and quick actions

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '../../../types';
import { PhoneIcon, ShareIcon } from '../../../constants';
import { useAppContext } from '../../../context/AppContext';
import { optimizeCloudinaryUrl } from '../../../config/cloudinaryConfig';
import MortgageCalculator from '@/src/features/calculators/components/MortgageCalculator';
import RentVsBuyCalculator from '@/src/features/calculators/components/RentVsBuyCalculator';
import PropertyInquiryModal from '@/src/features/inquiries/components/PropertyInquiryModal';
import RentAffordabilityCalculator from '@/src/features/rental/components/RentAffordabilityCalculator';
import MoveInCostBreakdown from '@/src/features/rental/components/MoveInCostBreakdown';
import ScheduleViewingModal from '@/src/features/rental/components/ScheduleViewingModal';

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

  const isInComparison = state.comparisonList.includes(property.id);
  const currentUser = state.currentUser || state.user;

  const handleCompare = () => {
    if (isInComparison) {
      dispatch({ type: 'REMOVE_FROM_COMPARISON', payload: property.id });
    } else {
      if (state.comparisonList.length >= 4) {
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
      <div className="bg-white p-4 rounded-xl shadow-lg border border-neutral-200">
        <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">{t('property:actions.quickActions')}</h3>
        <div className="grid grid-cols-3 gap-2">
          {/* Compare Button */}
          <button
            onClick={handleCompare}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 ${
              isInComparison
                ? 'bg-purple-50 border-purple-200 text-purple-600'
                : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-medium">{isInComparison ? t('property:actions.comparing') : t('property:actions.compare')}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex flex-col items-center justify-center p-3 rounded-xl border-2 bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:border-neutral-300 transition-all duration-200"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span className="text-xs font-medium">{t('property:actions.print')}</span>
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
            onClick={handleScheduleVisit}
            className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-md hover:shadow-lg"
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
              dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
              dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
              dispatch({ type: 'SET_SELECTED_AGENT', payload: property.sellerId });
              dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agents' });
              window.history.pushState({}, '', `/agents/${property.sellerId}`);
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
        <div className="space-y-2">
          {property.status === 'sold' ? (
            <div className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-neutral-300 rounded-xl shadow-sm text-sm font-medium text-neutral-400 bg-neutral-100 cursor-not-allowed">
              <PhoneIcon className="w-4 h-4" />
              {t('property:actions.propertySold')}
            </div>
          ) : (
            <a
              href={`tel:${property.seller?.phone}`}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
            >
              <PhoneIcon className="w-4 h-4" />
              {t('property:actions.callSeller')}
            </a>
          )}
          {/* Rented availability notice */}
          {property.status === 'rented' && property.rentedUntil && (
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
            className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-primary text-primary rounded-xl text-sm font-semibold bg-white hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-green-500 text-green-600 rounded-xl text-sm font-semibold bg-white hover:bg-green-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Rental-specific widgets OR sale-specific widgets */}
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
