/**
 * My Promotions Page
 * Displays and manages user's promoted properties
 * Uses extracted PromotedPropertyCard component and usePromotions hooks
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { SparklesIcon } from '../../constants';
import PromotionModal from '../../src/features/promotions/components/PromotionModal';
import PromotionHistoryModal from '../../src/features/promotions/components/PromotionHistoryModal';
import PromotedPropertyCard, { TIER_CONFIG } from '../../src/features/promotions/components/PromotedPropertyCard';
import { usePromotions, usePromotionActions, PromotionFilter } from '../../hooks/usePromotions';

const MyPromotions: React.FC = () => {
  const { t } = useTranslation(['account', 'property']);
  const { dispatch } = useAppContext();

  // Use extracted hooks for data and actions
  const {
    filteredProperties,
    promotions,
    stats,
    isLoading,
    filter,
    setFilter,
    refetch,
    updatePromotion,
  } = usePromotions();

  const {
    actionLoading,
    handleAddUrgent,
    handleToggleAutoExtend,
    handleCompleteAutoExtend,
  } = usePromotionActions();

  // Modal state
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [propertyToExtend, setPropertyToExtend] = useState<Property | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [propertyForHistory, setPropertyForHistory] = useState<Property | null>(null);

  // Handlers
  const handleViewProperty = (propertyId: string) => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
    window.history.pushState({ propertyId }, '', `/property/${propertyId}`);
  };

  const handleExtend = (property: Property) => {
    setPropertyToExtend(property);
    setShowExtendModal(true);
  };

  const handleExtensionSuccess = async () => {
    setShowExtendModal(false);
    setPropertyToExtend(null);
    await refetch();
  };

  const handleViewHistory = (property: Property) => {
    setPropertyForHistory(property);
    setShowHistoryModal(true);
  };

  // Wrap toggle auto-extend with local state update
  const onToggleAutoExtend = async (promotionId: string, autoExtend: boolean) => {
    await handleToggleAutoExtend(promotionId, autoExtend, () => {
      // Find propertyId for this promotion and update local state
      const propertyId = Object.keys(promotions).find(k => promotions[k]._id === promotionId);
      if (propertyId) {
        updatePromotion(propertyId, { autoExtend });
      }
    });
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
              onAddUrgent={handleAddUrgent}
              onToggleAutoExtend={onToggleAutoExtend}
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
    </div>
  );
};

export default MyPromotions;
