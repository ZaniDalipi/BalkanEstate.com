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

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon, ShieldCheckIcon, XMarkIcon, PlusIcon, TrashIcon, ArrowPathIcon, CurrencyDollarIcon, CheckIcon } from '@/constants';
import {
  useProducts,
  useUpdateProduct,
  useToggleProductStatus,
  useToggleProductVisibility,
  useRefreshAdminData,
} from '../hooks/useAdminData';
import { Product } from '../api/adminApi';

const PricingManager: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);

  // Reactive data - auto-updates like StateFlow.collectAsState()
  const { data: products = [], isLoading, error, isRefetching } = useProducts();

  // Mutations with optimistic updates
  const updateProductMutation = useUpdateProduct();
  const toggleStatusMutation = useToggleProductStatus();
  const toggleVisibilityMutation = useToggleProductVisibility();
  const refreshAll = useRefreshAdminData();

  // Local UI state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newFeature, setNewFeature] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mutatingProductId, setMutatingProductId] = useState<string | null>(null);

  // Derived state for mutation errors
  const mutationError =
    updateProductMutation.error ||
    toggleStatusMutation.error ||
    toggleVisibilityMutation.error;

  // Helper for validated number input
  const handleNumberChange = (
    field: keyof Product,
    value: string,
    min: number = 0,
    isFloat: boolean = false
  ) => {
    if (!editingProduct) return;

    if (value === '') {
      setEditingProduct({ ...editingProduct, [field]: min });
      return;
    }

    const parsed = isFloat ? parseFloat(value) : parseInt(value, 10);
    if (isNaN(parsed)) return;

    const clampedValue = Math.max(parsed, min);
    setEditingProduct({ ...editingProduct, [field]: clampedValue });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct({
      ...product,
      price: product.price ?? 0,
      durationDays: product.durationDays ?? 30,
      displayOrder: product.displayOrder ?? 0,
      trialPeriodDays: product.trialPeriodDays ?? 0,
      gracePeriodDays: product.gracePeriodDays ?? 3,
      listingsLimit: product.listingsLimit ?? 3,
      promotionCoupons: product.promotionCoupons ?? 0,
      premiumCoupons: product.premiumCoupons ?? 0,
      highlightedCoupons: product.highlightedCoupons ?? 0,
      featuredCoupons: product.featuredCoupons ?? 0,
      agentCoupons: product.agentCoupons ?? 0,
      aiMessagesLimit: product.aiMessagesLimit ?? 3,
      aiInsightsLimit: product.aiInsightsLimit ?? 3,
      imageDescriptionLimit: product.imageDescriptionLimit ?? 0,
      savedSearchesLimit: product.savedSearchesLimit ?? 3,
      features: product.features ?? [],
      maxActiveSubscriptions: product.maxActiveSubscriptions ?? 0,
      cardStyle: product.cardStyle ?? { backgroundColor: '', borderColor: '', textColor: '' },
    });
    setNewFeature('');
    setIsEditModalOpen(true);
  };

  const handleAddFeature = () => {
    if (!editingProduct || !newFeature.trim()) return;
    setEditingProduct({
      ...editingProduct,
      features: [...(editingProduct.features || []), newFeature.trim()],
    });
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    if (!editingProduct) return;
    const newFeatures = [...editingProduct.features];
    newFeatures.splice(index, 1);
    setEditingProduct({ ...editingProduct, features: newFeatures });
  };

  const handleSave = async () => {
    if (!editingProduct) return;

    // Only include cardStyle if any value is set
    const cardStyle = editingProduct.cardStyle?.backgroundColor ||
      editingProduct.cardStyle?.borderColor ||
      editingProduct.cardStyle?.textColor
      ? editingProduct.cardStyle
      : undefined;

    const updatePayload = {
      name: editingProduct.name,
      description: editingProduct.description || '',
      type: editingProduct.type,
      tier: editingProduct.tier || '',
      price: Number(editingProduct.price) || 0,
      currency: editingProduct.currency,
      billingPeriod: editingProduct.billingPeriod,
      durationDays: Number(editingProduct.durationDays) || 30,
      features: editingProduct.features || [],
      targetRole: editingProduct.targetRole,
      displayOrder: Number(editingProduct.displayOrder) || 0,
      badge: editingProduct.badge || '',
      badgeColor: editingProduct.badgeColor || '',
      highlighted: Boolean(editingProduct.highlighted),
      isActive: Boolean(editingProduct.isActive),
      isVisible: Boolean(editingProduct.isVisible),
      hasFreeTrial: Boolean(editingProduct.hasFreeTrial),
      trialPeriodDays: Number(editingProduct.trialPeriodDays) || 0,
      gracePeriodDays: Number(editingProduct.gracePeriodDays) || 0,
      listingsLimit: Number(editingProduct.listingsLimit),
      promotionCoupons: Number(editingProduct.promotionCoupons) || 0,
      premiumCoupons: Number(editingProduct.premiumCoupons) || 0,
      highlightedCoupons: Number(editingProduct.highlightedCoupons) || 0,
      featuredCoupons: Number(editingProduct.featuredCoupons) || 0,
      agentCoupons: Number(editingProduct.agentCoupons) || 0,
      aiMessagesLimit: Number(editingProduct.aiMessagesLimit),
      aiInsightsLimit: Number(editingProduct.aiInsightsLimit),
      imageDescriptionLimit: Number(editingProduct.imageDescriptionLimit),
      savedSearchesLimit: Number(editingProduct.savedSearchesLimit),
      earlyAccessListings: Boolean(editingProduct.earlyAccessListings),
      advancedMarketInsights: Boolean(editingProduct.advancedMarketInsights),
      stripeProductId: editingProduct.stripeProductId || '',
      stripePriceId: editingProduct.stripePriceId || '',
      // Agency/Enterprise features
      maxActiveSubscriptions: Number(editingProduct.maxActiveSubscriptions) || 0,
      cardStyle,
    };

    try {
      await updateProductMutation.mutateAsync({
        productId: editingProduct._id,
        data: updatePayload,
      });

      setIsEditModalOpen(false);
      setEditingProduct(null);
      setSuccessMessage('Product updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      // Error is handled by mutation state
      console.error('Save error:', err);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    setMutatingProductId(product._id);
    try {
      const response = await toggleStatusMutation.mutateAsync(product._id);
      // Use the response to show accurate message
      const newStatus = response?.product?.isActive;
      setSuccessMessage(`Product ${newStatus ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Toggle status error:', err);
    } finally {
      setMutatingProductId(null);
    }
  };

  const handleToggleVisibility = async (product: Product) => {
    setMutatingProductId(product._id);
    try {
      const response = await toggleVisibilityMutation.mutateAsync(product._id);
      // Use the response to show accurate message
      const newVisibility = response?.product?.isVisible;
      setSuccessMessage(`Product is now ${newVisibility ? 'visible' : 'hidden'}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Toggle visibility error:', err);
    } finally {
      setMutatingProductId(null);
    }
  };

  const formatPrice = (price: number, currency: string, billingPeriod: string) => {
    return `€${price}/${billingPeriod === 'monthly' ? 'mo' : billingPeriod === 'yearly' ? 'yr' : billingPeriod}`;
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free':
        return 'bg-gray-100 text-gray-800';
      case 'pro':
        return 'bg-green-100 text-green-800';
      case 'agency':
        return 'bg-purple-100 text-purple-800';
      case 'buyer':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <PencilIcon className="w-5 h-5" />
                {t('admin:pricing.editProduct', 'Edit Product')}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                  <input
                    type="text"
                    value={editingProduct.productId}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Role</label>
                  <select
                    value={editingProduct.targetRole}
                    onChange={(e) => setEditingProduct({ ...editingProduct, targetRole: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                    <option value="agent">Agent</option>
                    <option value="all">All</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                  <select
                    value={editingProduct.tier || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, tier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">None</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="agency">Agency</option>
                    <option value="buyer">Buyer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Pricing */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Pricing</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (€)</label>
                    <input
                      type="number"
                      value={editingProduct.price}
                      onChange={(e) => handleNumberChange('price', e.target.value, 0, true)}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={editingProduct.currency}
                      onChange={(e) => setEditingProduct({ ...editingProduct, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Period</label>
                    <select
                      value={editingProduct.billingPeriod}
                      onChange={(e) => setEditingProduct({ ...editingProduct, billingPeriod: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="weekly">Weekly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="one_time">One-time</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                    <input
                      type="number"
                      value={editingProduct.durationDays}
                      onChange={(e) => handleNumberChange('durationDays', e.target.value, 1)}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Limits */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-3">Limits & Quotas</h4>

                {/* Listings Limit - Most important for sellers/agents */}
                <div className="bg-white border-2 border-green-300 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🏠</span>
                    <h5 className="font-semibold text-green-800">Listings Limit</h5>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Maximum number of active property listings allowed for this plan</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Active Listings</label>
                      <input
                        type="number"
                        value={editingProduct.listingsLimit}
                        onChange={(e) => handleNumberChange('listingsLimit', e.target.value, -1)}
                        min="-1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold"
                      />
                      <p className="text-xs text-gray-500 mt-1">-1 = unlimited | Free: 3 | Pro: 20 | Agency: 500</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Saved Searches</label>
                    <input
                      type="number"
                      value={editingProduct.savedSearchesLimit}
                      onChange={(e) => handleNumberChange('savedSearchesLimit', e.target.value, -1)}
                      min="-1"
                      placeholder="-1 for unlimited"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">-1 = unlimited</p>
                  </div>
                </div>

                <h5 className="font-medium text-green-800 mb-2 text-sm">Promotion Coupons (per month)</h5>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Promos</label>
                    <input
                      type="number"
                      value={editingProduct.promotionCoupons}
                      onChange={(e) => handleNumberChange('promotionCoupons', e.target.value, 0)}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Premium</label>
                    <input
                      type="number"
                      value={editingProduct.premiumCoupons || 0}
                      onChange={(e) => handleNumberChange('premiumCoupons', e.target.value, 0)}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Highlighted</label>
                    <input
                      type="number"
                      value={editingProduct.highlightedCoupons || 0}
                      onChange={(e) => handleNumberChange('highlightedCoupons', e.target.value, 0)}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Featured</label>
                    <input
                      type="number"
                      value={editingProduct.featuredCoupons || 0}
                      onChange={(e) => handleNumberChange('featuredCoupons', e.target.value, 0)}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* AI Limits */}
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                <h4 className="font-semibold text-cyan-900 mb-3">AI & Insights Limits</h4>
                <p className="text-xs text-cyan-700 mb-3">Use -1 for unlimited</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AI Messages/mo</label>
                    <input
                      type="number"
                      value={editingProduct.aiMessagesLimit ?? 0}
                      onChange={(e) => handleNumberChange('aiMessagesLimit', e.target.value, -1)}
                      min="-1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Insights/mo</label>
                    <input
                      type="number"
                      value={editingProduct.aiInsightsLimit ?? 0}
                      onChange={(e) => handleNumberChange('aiInsightsLimit', e.target.value, -1)}
                      min="-1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image Desc/mo</label>
                    <input
                      type="number"
                      value={editingProduct.imageDescriptionLimit ?? 0}
                      onChange={(e) => handleNumberChange('imageDescriptionLimit', e.target.value, -1)}
                      min="-1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Buyer Features */}
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                <h4 className="font-semibold text-sky-900 mb-3">Buyer Features</h4>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.earlyAccessListings || false}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, earlyAccessListings: e.target.checked })
                      }
                      className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                    />
                    <span className="text-sm text-gray-700">Early Access to New Listings</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.advancedMarketInsights || false}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, advancedMarketInsights: e.target.checked })
                      }
                      className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                    />
                    <span className="text-sm text-gray-700">Advanced Market Insights</span>
                  </label>
                </div>
              </div>

              {/* Trial & Grace */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 mb-3">Trial & Grace Period</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={editingProduct.hasFreeTrial}
                        onChange={(e) => setEditingProduct({ ...editingProduct, hasFreeTrial: e.target.checked })}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Has Free Trial</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trial Days</label>
                    <input
                      type="number"
                      value={editingProduct.trialPeriodDays || 0}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, trialPeriodDays: parseInt(e.target.value) || 0 })
                      }
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (days)</label>
                    <input
                      type="number"
                      value={editingProduct.gracePeriodDays}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, gracePeriodDays: parseInt(e.target.value) || 0 })
                      }
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="font-semibold text-indigo-900 mb-3">Features (displayed in pricing page)</h4>
                <div className="space-y-2 mb-3">
                  {(editingProduct.features || []).map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-indigo-100"
                    >
                      <span className="flex-1 text-sm text-gray-700">{feature}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(!editingProduct.features || editingProduct.features.length === 0) && (
                    <p className="text-sm text-gray-500 italic">No features added yet</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                    placeholder="Add a feature..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>

              {/* Display Settings & Highlighted */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-3">Display Settings</h4>

                {/* Highlighted - Make it prominent */}
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.highlighted}
                      onChange={(e) => setEditingProduct({ ...editingProduct, highlighted: e.target.checked })}
                      className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                    />
                    <div>
                      <span className="text-sm font-semibold text-yellow-800">Highlighted / Featured Plan</span>
                      <p className="text-xs text-yellow-700">Show with special styling on pricing page (golden border, "Most Popular" effect)</p>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={editingProduct.badge || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                      placeholder="e.g., BEST VALUE"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Badge Color</label>
                    <select
                      value={editingProduct.badgeColor || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, badgeColor: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Default</option>
                      <option value="red">Red</option>
                      <option value="green">Green</option>
                      <option value="blue">Blue</option>
                      <option value="amber">Amber</option>
                      <option value="purple">Purple</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                    <input
                      type="number"
                      value={editingProduct.displayOrder}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, displayOrder: parseInt(e.target.value) || 0 })
                      }
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Card Style Customization */}
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <h5 className="text-sm font-medium text-purple-800 mb-2">Card Style (Optional)</h5>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Background Color</label>
                      <input
                        type="text"
                        value={editingProduct.cardStyle?.backgroundColor || ''}
                        onChange={(e) => setEditingProduct({
                          ...editingProduct,
                          cardStyle: { ...editingProduct.cardStyle, backgroundColor: e.target.value }
                        })}
                        placeholder="#ffffff or gradient"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Border Color</label>
                      <input
                        type="text"
                        value={editingProduct.cardStyle?.borderColor || ''}
                        onChange={(e) => setEditingProduct({
                          ...editingProduct,
                          cardStyle: { ...editingProduct.cardStyle, borderColor: e.target.value }
                        })}
                        placeholder="#e5e7eb"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Text Color</label>
                      <input
                        type="text"
                        value={editingProduct.cardStyle?.textColor || ''}
                        onChange={(e) => setEditingProduct({
                          ...editingProduct,
                          cardStyle: { ...editingProduct.cardStyle, textColor: e.target.value }
                        })}
                        placeholder="#1f2937"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Agency/Enterprise Features */}
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                <h4 className="font-semibold text-violet-900 mb-3">Agency / Enterprise Features</h4>
                <p className="text-xs text-violet-700 mb-3">Special features for agency tier subscriptions</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Agent Coupons/month</label>
                    <input
                      type="number"
                      value={editingProduct.agentCoupons}
                      onChange={(e) => handleNumberChange('agentCoupons', e.target.value, 0)}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Coupons to invite agents to the agency</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Subscriptions</label>
                    <input
                      type="number"
                      value={editingProduct.maxActiveSubscriptions || 0}
                      onChange={(e) => setEditingProduct({ ...editingProduct, maxActiveSubscriptions: parseInt(e.target.value) || 0 })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">0 = unlimited</p>
                  </div>
                </div>
              </div>

              {/* Stripe */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Stripe Integration</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Product ID</label>
                    <input
                      type="text"
                      value={editingProduct.stripeProductId || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stripeProductId: e.target.value })}
                      placeholder="prod_..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Price ID</label>
                    <input
                      type="text"
                      value={editingProduct.stripePriceId || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stripePriceId: e.target.value })}
                      placeholder="price_..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 text-gray-700 bg-white border rounded-xl hover:bg-gray-50 transition-colors"
              >
                {t('common:cancel', 'Cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={updateProductMutation.isPending}
                className={`px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors flex items-center gap-2 ${
                  updateProductMutation.isPending ? 'opacity-70' : ''
                }`}
              >
                {updateProductMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('common:saving', 'Saving...')}
                  </>
                ) : (
                  <>
                    <ShieldCheckIcon className="w-4 h-4" />
                    {t('common:save', 'Save Changes')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingManager;
