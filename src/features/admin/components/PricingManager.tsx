/**
 * PricingManager - Admin component for managing products/pricing
 *
 * Uses React Query hooks for reactive data management:
 * - Data auto-refreshes on window focus
 * - Optimistic updates for instant UI feedback
 * - Automatic cache invalidation after mutations
 *
 * Similar to Android's ViewModel + StateFlow pattern
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon, ArrowPathIcon, CurrencyDollarIcon, CheckIcon } from '@/constants';
import { usePricingManager } from './usePricingManager';
import PricingManagerForm from './PricingManagerForm';

const PricingManager: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);

  const {
    products,
    isLoading,
    error,
    isRefetching,
    mutationError,
    successMessage,
    editingProduct,
    setEditingProduct,
    isEditModalOpen,
    setIsEditModalOpen,
    newFeature,
    setNewFeature,
    editingFeatureIndex,
    editingFeatureValue,
    setEditingFeatureValue,
    mutatingProductId,
    updateProductMutation,
    handleEdit,
    handleSave,
    handleToggleStatus,
    handleToggleVisibility,
    handleAddFeature,
    handleRemoveFeature,
    handleMoveFeature,
    handleNumberChange,
    handleFeatureKeyDown,
    insertPlaceholder,
    startEditingFeature,
    saveEditingFeature,
    refreshAll,
    formatPrice,
    getTierColor,
  } = usePricingManager();

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-gray-600">{t('admin:pricing.loading', 'Loading products...')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <CurrencyDollarIcon className="w-7 h-7" />
              {t('admin:pricing.title', 'Pricing & Products')}
            </h2>
            <p className="text-blue-200 mt-1">{t('admin:pricing.subtitle', 'Manage subscription plans and pricing')}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Real-time indicator */}
            <div className="flex items-center gap-2 text-sm text-blue-200">
              <span
                className={`w-2 h-2 rounded-full ${isRefetching ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}
              />
              {isRefetching ? t('common:syncing', 'Syncing...') : t('common:live', 'Live')}
            </div>

            {/* Manual refresh */}
            <button
              onClick={refreshAll}
              disabled={isRefetching}
              className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-sm"
              title={t('common:refresh', 'Refresh')}
            >
              <ArrowPathIcon className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>

            <div className="px-3 py-1.5 bg-white/20 rounded-xl text-sm backdrop-blur-sm">
              {products.length} {products.length !== 1 ? t('admin:pricing.products', 'products') : t('admin:pricing.product', 'product')}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {(error || mutationError) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{(error as Error)?.message || (mutationError as Error)?.message || t('common:error', 'An error occurred')}</span>
          <button className="p-1 hover:bg-red-100 rounded">&times;</button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckIcon className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin:pricing.product', 'Product')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin:pricing.tier', 'Tier')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin:pricing.price', 'Price')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin:pricing.limits', 'Limits')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin:pricing.status', 'Status')}
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin:pricing.actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {products.map((product) => (
                <tr key={product._id} className={`transition-colors hover:bg-blue-50/50 ${!product.isActive ? 'bg-gray-50/50 opacity-60' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          {product.name}
                          {product.highlighted && (
                            <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 rounded-full font-medium border border-amber-200">
                              ⭐ {t('admin:common.featured', 'Featured')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{product.productId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getTierColor(product.tier)}`}>
                      {product.tier?.toUpperCase() || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-base font-bold text-gray-900">
                      {formatPrice(product.price, product.currency, product.billingPeriod)}
                    </div>
                    <div className="text-xs text-gray-500">{product.durationDays} {t('admin:common.days', 'days')}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex flex-col gap-1">
                      {product.listingsLimit > 0 && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full inline-block w-fit">
                          {product.listingsLimit} {t('admin:pricing.listings', 'listings')}
                        </span>
                      )}
                      {product.promotionCoupons > 0 && (
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full inline-block w-fit">
                          {product.promotionCoupons} {t('admin:pricing.promoPerMonth', 'promo/mo')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => handleToggleStatus(product)}
                        disabled={mutatingProductId === product._id}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                          product.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        } ${mutatingProductId === product._id ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {mutatingProductId === product._id ? (
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            {t('common:updating', 'Updating...')}
                          </span>
                        ) : (
                          product.isActive ? t('admin:common.active', 'Active') : t('admin:common.inactive', 'Inactive')
                        )}
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(product)}
                        disabled={mutatingProductId === product._id}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                          product.isVisible
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        } ${mutatingProductId === product._id ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {mutatingProductId === product._id ? (
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            {t('common:updating', 'Updating...')}
                          </span>
                        ) : (
                          product.isVisible ? t('admin:common.visible', 'Visible') : t('admin:common.hidden', 'Hidden')
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(product)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md"
                    >
                      <PencilIcon className="w-4 h-4" />
                      {t('admin:common.edit', 'Edit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingProduct && (
        <PricingManagerForm
          editingProduct={editingProduct}
          setEditingProduct={setEditingProduct}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSave}
          isSaving={updateProductMutation.isPending}
          newFeature={newFeature}
          setNewFeature={setNewFeature}
          editingFeatureIndex={editingFeatureIndex}
          editingFeatureValue={editingFeatureValue}
          setEditingFeatureValue={setEditingFeatureValue}
          handleAddFeature={handleAddFeature}
          handleRemoveFeature={handleRemoveFeature}
          handleMoveFeature={handleMoveFeature}
          handleNumberChange={handleNumberChange}
          handleFeatureKeyDown={handleFeatureKeyDown}
          insertPlaceholder={insertPlaceholder}
          startEditingFeature={startEditingFeature}
          saveEditingFeature={saveEditingFeature}
        />
      )}
    </div>
  );
};

export default PricingManager;
