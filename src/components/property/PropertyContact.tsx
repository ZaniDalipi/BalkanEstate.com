// PropertyContact Component
// Seller contact sidebar with calculators and quick actions

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '../../../types';
import { PhoneIcon, UserCircleIcon } from '../../../constants';
import { useAppContext } from '../../../context/AppContext';
import MortgageCalculator from '../../../components/BuyerFlow/Calculators/MortgageCalculator';
import RentVsBuyCalculator from '../../../components/BuyerFlow/Calculators/RentVsBuyCalculator';

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
 * - Quick actions (Compare, Print)
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
  const { t } = useTranslation(['property']);
  const { state, dispatch } = useAppContext();

  const isInComparison = state.comparisonList.includes(property.id);

  const handleCompare = () => {
    if (isInComparison) {
      dispatch({ type: 'REMOVE_FROM_COMPARISON', payload: property.id });
    } else {
      if (state.comparisonList.length >= 4) {
        alert(t('property:actions.compareLimit'));
        return;
      }
      dispatch({ type: 'ADD_TO_COMPARISON', payload: property.id });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleScheduleVisit = () => {
    if (!state.isAuthenticated) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
      return;
    }
    // Start conversation with a visit request message
    onContactSeller();
  };

  return (
    <div className="sticky top-24 space-y-4">
      {/* Quick Actions Card */}
      <div className="bg-white p-4 rounded-xl shadow-lg border border-neutral-200">
        <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">{t('property:actions.quickActions')}</h3>
        <div className="grid grid-cols-2 gap-2">
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

        {/* Seller Info */}
        <div className="flex items-center gap-4 mb-4">
          {property.seller?.avatarUrl ? (
            <img
              src={property.seller.avatarUrl}
              alt={property.seller.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-neutral-100"
            />
          ) : (
            <UserCircleIcon className="w-12 h-12 text-neutral-300" />
          )}
          <div className="flex-1">
            <p className="font-bold text-base text-neutral-900">{property.seller?.name}</p>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                property.seller?.type === 'agent'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {property.seller?.type === 'agent' ? t('property:seller.agent') : t('property:seller.private')}
              </span>
            </div>
          </div>
        </div>

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
          <button
            onClick={onContactSeller}
            disabled={isCreatingConversation || property.status === 'sold'}
            className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border-2 border-primary text-primary rounded-xl shadow-sm text-sm font-semibold bg-white hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {isCreatingConversation
              ? t('property:actions.startingChat')
              : property.status === 'sold'
              ? t('property:actions.propertySold')
              : t('property:actions.messageSeller')}
          </button>
        </div>
      </div>

      {/* Mortgage Calculator */}
      <MortgageCalculator propertyPrice={property.price} country={property.country} />

      {/* Rent vs Buy Calculator */}
      <RentVsBuyCalculator propertyPrice={property.price} country={property.country} />

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
