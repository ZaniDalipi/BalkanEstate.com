// PropertyContact Component
// Seller contact sidebar with calculators and quick actions

import React, { useState } from 'react';
import { Property } from '../../../types';
import { PhoneIcon, UserCircleIcon, ShareIcon } from '../../../constants';
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
 * - Quick actions (Save, Share, Compare, Print)
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
  const { state, dispatch, toggleSavedHome } = useAppContext();
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const isFavorited = state.savedHomes.some((p) => p.id === property.id);
  const isInComparison = state.comparisonList.includes(property.id);

  const handleSaveProperty = async () => {
    if (!state.isAuthenticated) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
      return;
    }
    try {
      await toggleSavedHome(property);
    } catch (error) {
      console.error('Failed to save property:', error);
    }
  };

  const handleCompare = () => {
    if (isInComparison) {
      dispatch({ type: 'REMOVE_FROM_COMPARISON', payload: property.id });
    } else {
      if (state.comparisonList.length >= 4) {
        alert('You can compare up to 4 properties at a time.');
        return;
      }
      dispatch({ type: 'ADD_TO_COMPARISON', payload: property.id });
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = `Check out this property: ${property.address}`;

    switch (platform) {
      case 'copy':
        navigator.clipboard.writeText(url);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank');
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent('I found this property that might interest you: ' + url)}`;
        break;
    }
    setShowShareMenu(false);
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
        <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          {/* Save Button */}
          <button
            onClick={handleSaveProperty}
            disabled={property.status === 'sold'}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 ${
              isFavorited
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
            } ${property.status === 'sold' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <svg
              className={`w-6 h-6 mb-1 transition-transform ${isFavorited ? 'scale-110' : ''}`}
              fill={isFavorited ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span className="text-xs font-medium">{isFavorited ? 'Saved' : 'Save'}</span>
          </button>

          {/* Share Button */}
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="w-full flex flex-col items-center justify-center p-3 rounded-xl border-2 bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all duration-200"
            >
              <ShareIcon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Share</span>
            </button>

            {/* Share Menu Dropdown */}
            {showShareMenu && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-neutral-200 p-2 z-20 animate-fade-in">
                <button
                  onClick={() => handleShare('copy')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 text-sm text-neutral-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  {copySuccess ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-green-50 text-sm text-neutral-700"
                >
                  <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </button>
                <button
                  onClick={() => handleShare('facebook')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 text-sm text-neutral-700"
                >
                  <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </button>
                <button
                  onClick={() => handleShare('email')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 text-sm text-neutral-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </button>
              </div>
            )}
          </div>

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
            <span className="text-xs font-medium">{isInComparison ? 'Comparing' : 'Compare'}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex flex-col items-center justify-center p-3 rounded-xl border-2 bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:border-neutral-300 transition-all duration-200"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span className="text-xs font-medium">Print</span>
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
            Schedule a Visit
          </button>
        )}
      </div>

      {/* Contact Seller Card */}
      <div className="bg-white p-4 rounded-xl shadow-lg border border-neutral-200">
        <h3 className="text-base sm:text-lg font-bold text-neutral-800 mb-4">Contact Seller</h3>

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
                {property.seller?.type === 'agent' ? 'Agent' : 'Private Seller'}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Buttons */}
        <div className="space-y-2">
          {property.status === 'sold' ? (
            <div className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-neutral-300 rounded-xl shadow-sm text-sm font-medium text-neutral-400 bg-neutral-100 cursor-not-allowed">
              <PhoneIcon className="w-4 h-4" />
              Property Sold
            </div>
          ) : (
            <a
              href={`tel:${property.seller?.phone}`}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
            >
              <PhoneIcon className="w-4 h-4" />
              Call Seller
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
              ? 'Starting Chat...'
              : property.status === 'sold'
              ? 'Property Sold'
              : 'Message Seller'}
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
