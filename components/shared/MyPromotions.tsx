/**
 * My Promotions Page
 * Displays and manages user's promoted properties
 * Uses React Query for real-time updates (auto-refresh every 10s)
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { SparklesIcon, ArrowPathIcon } from '../../constants';
import PromotionModal from '../../src/features/promotions/components/PromotionModal';
import PromotionHistoryModal from '../../src/features/promotions/components/PromotionHistoryModal';
import PromotedPropertyCard, { TIER_CONFIG } from '../../src/features/promotions/components/PromotedPropertyCard';
import {
  usePromotionsQuery,
  useToggleAutoExtend,
  useAutoExtendCheckout,
  useRefreshPromotions,
  type PromotionFilter,
} from '../../src/features/promotions/hooks/usePromotionData';

const MyPromotions: React.FC = () => {
  const { t } = useTranslation(['account', 'property']);
  const { dispatch } = useAppContext();

  // React Query hooks for real-time data
  const {
    data,
    isLoading,
    isFetching,
    dataUpdatedAt,
    refetch,
  } = usePromotionsQuery();

  const toggleAutoExtendMutation = useToggleAutoExtend();
  const autoExtendCheckoutMutation = useAutoExtendCheckout();
  const refreshPromotions = useRefreshPromotions();

  // Local state
  const [filter, setFilter] = useState<PromotionFilter>('active');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Auto-hide toast after 4 seconds
  React.useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Modal state
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [propertyToExtend, setPropertyToExtend] = useState<Property | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [propertyForHistory, setPropertyForHistory] = useState<Property | null>(null);
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [propertyForUrgent, setPropertyForUrgent] = useState<Property | null>(null);

  // Extract data with defaults
  const promotedProperties = data?.promotedProperties || [];
  const promotions = data?.promotions || {};
  const stats = data?.stats || { active: 0, expired: 0, total: 0, tierCounts: {} };

  // Filter properties based on selected filter
  const filteredProperties = useMemo(() => {
    const now = Date.now();
    return promotedProperties.filter(p => {
      if (filter === 'active') {
        return p.promotionEndDate && p.promotionEndDate > now;
      }
      if (filter === 'expired') {
        return !p.promotionEndDate || p.promotionEndDate <= now;
      }
      return true;
    });
  }, [promotedProperties, filter]);

  // Format last updated time
  const formatLastUpdated = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Handlers
  const handleViewProperty = (propertyId: string) => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'property-details' });
    // Get current language from URL path
    const currentLang = window.location.pathname.split('/')[1] || 'en';
    const validLangs = ['en', 'sq', 'sr', 'de', 'mk', 'hr', 'bs', 'sl', 'bg', 'ro', 'el', 'tr', 'it', 'fr'];
    const lang = validLangs.includes(currentLang) ? currentLang : 'en';
    window.history.pushState({}, '', `/${lang}/property/${propertyId}`);
  };

  const handleExtend = (property: Property) => {
    setPropertyToExtend(property);
    setShowExtendModal(true);
  };

  const handleExtensionSuccess = async () => {
    setShowExtendModal(false);
    setPropertyToExtend(null);
    // React Query will auto-refresh, but we can force immediate refresh
    refreshPromotions();
  };

  const handleViewHistory = (property: Property) => {
    setPropertyForHistory(property);
    setShowHistoryModal(true);
  };

  // Action handlers - Open modal for adding urgent badge
  const handleAddUrgent = (property: Property, promotionId: string) => {
    setPropertyForUrgent(property);
    setShowUrgentModal(true);
  };

  const handleUrgentSuccess = async () => {
    setShowUrgentModal(false);
    setPropertyForUrgent(null);
    // React Query will auto-refresh, but we can force immediate refresh
    refreshPromotions();
  };

  const handleToggleAutoExtend = async (promotionId: string, autoExtend: boolean) => {
    try {
      await toggleAutoExtendMutation.mutateAsync({ promotionId, autoExtend });
      // Show success message
      if (autoExtend) {
        setToastMessage({
          type: 'info',
          message: 'Auto-extend enabled. Your promotion will automatically renew when it expires. Payments coming soon!',
        });
      } else {
        setToastMessage({
          type: 'success',
          message: 'Auto-extend disabled. Your promotion will expire naturally.',
        });
      }
    } catch (error: any) {
      // Check if it's an expired promotion error
      const errorMessage = error.message || '';
      if (errorMessage.toLowerCase().includes('expired')) {
        setToastMessage({
          type: 'info',
          message: 'This promotion has expired. Use the "Extend" button to reactivate it.',
        });
      } else {
        setToastMessage({
          type: 'error',
          message: errorMessage || 'Failed to update auto-extend settings.',
        });
      }
    }
  };

  const handleCompleteAutoExtend = async (promotionId: string) => {
    try {
      setActionLoading(promotionId);
      const result = await autoExtendCheckoutMutation.mutateAsync(promotionId);
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        setToastMessage({
          type: 'info',
          message: 'Payments coming soon! Auto-extend payment will be available shortly.',
        });
        setActionLoading(null);
      }
    } catch (error: any) {
      setToastMessage({
        type: 'info',
        message: 'Payments coming soon! Contact sales@balkanestateai.com to extend your promotion.',
      });
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4 animate-pulse">
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-neutral-200 rounded-lg" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-neutral-200 rounded w-3/4" />
                <div className="h-3 bg-neutral-200 rounded w-1/2" />
                <div className="h-5 bg-neutral-200 rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Message */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-xl shadow-lg border animate-in slide-in-from-top-2 duration-300 ${
            toastMessage.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : toastMessage.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {toastMessage.type === 'success' ? (
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : toastMessage.type === 'error' ? (
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="flex-1 text-sm font-medium">{toastMessage.message}</div>
            <button
              onClick={() => setToastMessage(null)}
              className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-full">
            <SparklesIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-800">
              {t('account:promotions.title', 'My Promotions')}
            </h2>
            <p className="text-sm text-neutral-500">
              {t('account:promotions.subtitle', 'Manage your promoted listings')}
            </p>
          </div>
        </div>

        {/* Real-time indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <div className={`w-2 h-2 rounded-full ${isFetching ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            <span>{isFetching ? 'Syncing...' : 'Live'}</span>
            <span className="text-neutral-400">|</span>
            <span>Updated: {formatLastUpdated(dataUpdatedAt)}</span>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh promotions"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
          <div className="text-2xl font-bold text-green-700">{stats.active}</div>
          <div className="text-sm text-green-600">{t('account:promotions.activePromotions')}</div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200 shadow-[0_0_10px_rgba(255,184,0,0.15)]">
          <div className="text-2xl font-bold text-amber-700">{stats.tierCounts.premium || 0}</div>
          <div className="text-sm text-amber-600">{TIER_CONFIG.premium.icon} {t('account:promotions.premiumPremiere')}</div>
        </div>
        <div className="bg-gradient-to-br from-sky-50 to-cyan-50 rounded-xl p-4 border border-sky-200 shadow-[0_0_10px_rgba(14,165,233,0.15)]">
          <div className="text-2xl font-bold text-sky-700">{stats.tierCounts.highlight || 0}</div>
          <div className="text-sm text-sky-600">{TIER_CONFIG.highlight.icon} {t('account:promotions.highlight')}</div>
        </div>
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200 shadow-[0_0_10px_rgba(124,58,237,0.15)]">
          <div className="text-2xl font-bold text-violet-600">{stats.tierCounts.featured || 0}</div>
          <div className="text-sm text-violet-500">{TIER_CONFIG.featured.icon} {t('account:promotions.featured')}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-neutral-100 p-1 rounded-lg w-fit">
        {(['active', 'expired', 'all'] as PromotionFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-white text-primary shadow-sm'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            {f === 'active' ? `${t('account:promotions.active')} (${stats.active})` :
             f === 'expired' ? `${t('account:promotions.expired')} (${stats.expired})` :
             `${t('account:promotions.all')} (${stats.total})`}
          </button>
        ))}
      </div>

      {/* Properties List */}
      {filteredProperties.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-xl border border-neutral-200">
          <SparklesIcon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-600 mb-2">
            {filter === 'active' ? t('account:promotions.noActive') :
             filter === 'expired' ? t('account:promotions.noExpired') :
             t('account:promotions.noPromotions')}
          </h3>
          <p className="text-neutral-500 mb-4">
            {filter === 'active'
              ? t('account:promotions.promoteHint')
              : t('account:promotions.historyHint')}
          </p>
          {filter === 'active' && (
            <button
              onClick={() => {
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'my-listings' });
              }}
              className="bg-primary text-white font-semibold px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
            >
              {t('account:promotions.promoteButton')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredProperties.map(property => (
            <PromotedPropertyCard
              key={property.id}
              property={property}
              promotion={promotions[property.id]}
              onViewProperty={handleViewProperty}
              onExtend={handleExtend}
              onAddUrgent={(promotionId) => handleAddUrgent(property, promotionId)}
              onToggleAutoExtend={handleToggleAutoExtend}
              onCompleteAutoExtend={handleCompleteAutoExtend}
              onViewHistory={handleViewHistory}
              isAddingUrgent={actionLoading === promotions[property.id]?._id}
            />
          ))}
        </div>
      )}

      {/* Extension Modal */}
      {propertyToExtend && (
        <PromotionModal
          isOpen={showExtendModal}
          onClose={() => {
            setShowExtendModal(false);
            setPropertyToExtend(null);
          }}
          propertyId={propertyToExtend.id}
          propertyTitle={propertyToExtend.title || `${propertyToExtend.address}, ${propertyToExtend.city}`}
          onSuccess={handleExtensionSuccess}
          isExtension={true}
          currentTier={propertyToExtend.promotionTier as 'featured' | 'highlight' | 'premium' | undefined}
          currentEndDate={propertyToExtend.promotionEndDate ? new Date(propertyToExtend.promotionEndDate) : undefined}
        />
      )}

      {/* Promotion History Modal */}
      {propertyForHistory && (
        <PromotionHistoryModal
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setPropertyForHistory(null);
          }}
          propertyId={propertyForHistory.id}
          propertyTitle={propertyForHistory.title || `${propertyForHistory.address}, ${propertyForHistory.city}`}
        />
      )}

      {/* Urgent Badge Modal */}
      {propertyForUrgent && (
        <PromotionModal
          isOpen={showUrgentModal}
          onClose={() => {
            setShowUrgentModal(false);
            setPropertyForUrgent(null);
          }}
          propertyId={propertyForUrgent.id}
          propertyTitle={propertyForUrgent.title || `${propertyForUrgent.address}, ${propertyForUrgent.city}`}
          onSuccess={handleUrgentSuccess}
          focusUrgent={true}
          currentTier={propertyForUrgent.promotionTier as 'featured' | 'highlight' | 'premium' | undefined}
          currentEndDate={propertyForUrgent.promotionEndDate ? new Date(propertyForUrgent.promotionEndDate) : undefined}
          promotionId={promotions[propertyForUrgent.id]?._id}
          hasUrgentBadge={propertyForUrgent.hasUrgentBadge}
        />
      )}
    </div>
  );
};

export default MyPromotions;
