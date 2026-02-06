/**
 * PromotionPlansManager - Admin component for managing promotion plans
 *
 * Uses React Query hooks for reactive data management:
 * - Data auto-refreshes on window focus
 * - Optimistic updates for instant UI feedback
 * - Automatic cache invalidation after mutations
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  ArrowPathIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  CheckIcon,
} from '@/constants';
import { usePromotionPlansManager } from './usePromotionPlansManager';
import { PlanCard, EditPlanModal } from './PromotionPlansManagerForm';

const PromotionPlansManager: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);

  const {
    plans,
    filteredPlans,
    isLoading,
    error,
    mutationError,
    isRefetching,
    editingPlan,
    setEditingPlan,
    isModalOpen,
    setIsModalOpen,
    newFeature,
    setNewFeature,
    activeTab,
    setActiveTab,
    showPreview,
    setShowPreview,
    successMessage,
    mutatingPlanId,
    createPlanMutation,
    updatePlanMutation,
    seedPlansMutation,
    refreshAll,
    handleSave,
    handleDelete,
    handleToggleStatus,
    handleSeedPlans,
    handleEdit,
    handleCreate,
    handleAddFeature,
    handleRemoveFeature,
    applyColorPreset,
  } = usePromotionPlansManager();

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-gray-600">{t('admin:promotionPlans.loading', 'Loading promotion plans...')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <SparklesIcon className="w-7 h-7" />
              {t('admin:promotionPlans.title', 'Promotion Plans')}
            </h2>
            <p className="text-purple-200 mt-1">{t('admin:promotionPlans.subtitle', 'Manage listing promotion and agency feature pricing')}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Real-time indicator */}
            <div className="flex items-center gap-2 text-sm text-purple-200">
              <span
                className={`w-2 h-2 rounded-full ${isRefetching ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}
              />
              {isRefetching ? 'Syncing...' : 'Live'}
            </div>

            {plans.length === 0 && (
              <button
                onClick={handleSeedPlans}
                disabled={seedPlansMutation.isPending}
                className="px-4 py-2 text-sm bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-sm disabled:opacity-50"
              >
                {seedPlansMutation.isPending ? 'Seeding...' : t('admin:promotionPlans.seedDefaults', 'Seed Default Plans')}
              </button>
            )}
            <button
              onClick={refreshAll}
              disabled={isRefetching}
              className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-sm"
              title={t('common:refresh', 'Refresh')}
            >
              <ArrowPathIcon className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {(error || mutationError) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{(error as Error)?.message || (mutationError as Error)?.message || 'An error occurred'}</span>
          <button className="p-1 hover:bg-red-100 rounded">&times;</button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckIcon className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('listing')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'listing'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <SparklesIcon className="w-5 h-5" />
            {t('admin:promotionPlans.listingPromotions', 'Listing Promotions')}
            <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${activeTab === 'listing' ? 'bg-white/20' : 'bg-gray-200'}`}>
              {plans.filter(p => p.category === 'listing').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('agency')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'agency'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BuildingOfficeIcon className="w-5 h-5" />
            {t('admin:promotionPlans.agencyFeatures', 'Agency Features')}
            <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${activeTab === 'agency' ? 'bg-white/20' : 'bg-gray-200'}`}>
              {plans.filter(p => p.category === 'agency').length}
            </span>
          </button>
          <div className="flex-1" />
          {/* Only show Add Plan button for listing tab - Agency has a single Featured option */}
          {activeTab === 'listing' && (
            <button
              onClick={() => handleCreate(activeTab, false)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-md hover:shadow-lg"
            >
              <PlusIcon className="w-5 h-5" />
              {t('admin:promotionPlans.addPlan', 'Add Plan')}
            </button>
          )}
        </div>
      </div>

      {/* Plans Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.map((plan) => (
          <PlanCard
            key={plan._id}
            plan={plan}
            onEdit={() => handleEdit(plan)}
            onDelete={() => handleDelete(plan._id)}
            onToggleStatus={() => handleToggleStatus(plan)}
            isMutating={mutatingPlanId === plan._id}
          />
        ))}
        {filteredPlans.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {activeTab === 'listing' ? <SparklesIcon className="w-8 h-8 text-gray-400" /> : <BuildingOfficeIcon className="w-8 h-8 text-gray-400" />}
            </div>
            <p className="text-gray-500 text-lg mb-4">
              {t('admin:promotionPlans.noPlans', 'No plans found')}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleCreate(activeTab)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                {t('admin:promotionPlans.createFirst', 'Create First Plan')}
              </button>
              <button
                onClick={handleSeedPlans}
                disabled={seedPlansMutation.isPending}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {seedPlansMutation.isPending ? 'Seeding...' : t('admin:promotionPlans.seedDefaults', 'Seed Default Plans')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingPlan && (
        <EditPlanModal
          plan={editingPlan}
          onChange={setEditingPlan}
          onSave={handleSave}
          onClose={() => { setIsModalOpen(false); setEditingPlan(null); }}
          newFeature={newFeature}
          setNewFeature={setNewFeature}
          onAddFeature={handleAddFeature}
          onRemoveFeature={handleRemoveFeature}
          onApplyPreset={applyColorPreset}
          showPreview={showPreview}
          setShowPreview={setShowPreview}
          isSaving={createPlanMutation.isPending || updatePlanMutation.isPending}
        />
      )}
    </div>
  );
};

export default PromotionPlansManager;
