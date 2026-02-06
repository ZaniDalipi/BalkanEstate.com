import React from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon, ShieldCheckIcon, XMarkIcon, PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from '@/constants';
import { Product } from '../api/adminApi';
import { availablePlaceholders, replacePlaceholders, hasPlaceholders } from '@/src/shared/utils/featurePlaceholders';

interface PricingManagerFormProps {
  editingProduct: Product;
  setEditingProduct: (product: Product | null) => void;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  newFeature: string;
  setNewFeature: (value: string) => void;
  editingFeatureIndex: number | null;
  editingFeatureValue: string;
  setEditingFeatureValue: (value: string) => void;
  handleAddFeature: () => void;
  handleRemoveFeature: (index: number) => void;
  handleMoveFeature: (index: number, direction: 'up' | 'down') => void;
  handleNumberChange: (field: keyof Product, value: string, min?: number, isFloat?: boolean) => void;
  handleFeatureKeyDown: (e: React.KeyboardEvent) => void;
  insertPlaceholder: (placeholder: string) => void;
  startEditingFeature: (index: number, value: string) => void;
  saveEditingFeature: () => void;
}

const PricingManagerForm: React.FC<PricingManagerFormProps> = ({
  editingProduct,
  setEditingProduct,
  onClose,
  onSave,
  isSaving,
  newFeature,
  setNewFeature,
  editingFeatureIndex,
  editingFeatureValue,
  setEditingFeatureValue,
  handleAddFeature,
  handleRemoveFeature,
  handleMoveFeature,
  handleNumberChange,
  handleFeatureKeyDown,
  insertPlaceholder,
  startEditingFeature,
  saveEditingFeature,
}) => {
  const { t } = useTranslation(['admin', 'common']);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <PencilIcon className="w-5 h-5" />
            {t('admin:pricing.editProduct', 'Edit Product')}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.productName', 'Product Name')}</label>
              <input
                type="text"
                value={editingProduct.name}
                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.productId', 'Product ID')}</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.targetRole', 'Target Role')}</label>
              <select
                value={editingProduct.targetRole}
                onChange={(e) => setEditingProduct({ ...editingProduct, targetRole: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="buyer">{t('admin:pricing.form.roles.buyer', 'Buyer')}</option>
                <option value="seller">{t('admin:pricing.form.roles.seller', 'Seller')}</option>
                <option value="agent">{t('admin:pricing.form.roles.agent', 'Agent')}</option>
                <option value="all">{t('admin:pricing.form.roles.all', 'All')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.tier', 'Tier')}</label>
              <select
                value={editingProduct.tier || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, tier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('admin:pricing.form.tiers.none', 'None')}</option>
                <option value="free">{t('admin:pricing.form.tiers.free', 'Free')}</option>
                <option value="pro">{t('admin:pricing.form.tiers.pro', 'Pro')}</option>
                <option value="agency">{t('admin:pricing.form.tiers.agency', 'Agency')}</option>
                <option value="buyer">{t('admin:pricing.form.tiers.buyer', 'Buyer')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.description', 'Description')}</label>
            <textarea
              value={editingProduct.description || ''}
              onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Pricing */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3">{t('admin:pricing.form.pricingSection', 'Pricing')}</h4>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.priceEuro', 'Price (€)')}</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.currency', 'Currency')}</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.billingPeriod', 'Billing Period')}</label>
                <select
                  value={editingProduct.billingPeriod}
                  onChange={(e) => setEditingProduct({ ...editingProduct, billingPeriod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="monthly">{t('admin:pricing.form.billingPeriods.monthly', 'Monthly')}</option>
                  <option value="yearly">{t('admin:pricing.form.billingPeriods.yearly', 'Yearly')}</option>
                  <option value="weekly">{t('admin:pricing.form.billingPeriods.weekly', 'Weekly')}</option>
                  <option value="quarterly">{t('admin:pricing.form.billingPeriods.quarterly', 'Quarterly')}</option>
                  <option value="one_time">{t('admin:pricing.form.billingPeriods.oneTime', 'One-time')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.durationDays', 'Duration (days)')}</label>
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
            <h4 className="font-semibold text-green-900 mb-3">{t('admin:pricing.form.limitsSection', 'Limits & Quotas')}</h4>

            {/* Listings Limit - Most important for sellers/agents */}
            <div className="bg-white border-2 border-green-300 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🏠</span>
                <h5 className="font-semibold text-green-800">{t('admin:pricing.form.listingsLimit', 'Listings Limit')}</h5>
              </div>
              <p className="text-xs text-gray-600 mb-2">{t('admin:pricing.form.listingsLimitDesc', 'Maximum number of active property listings allowed for this plan')}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.activeListings', 'Active Listings')}</label>
                  <input
                    type="number"
                    value={editingProduct.listingsLimit}
                    onChange={(e) => handleNumberChange('listingsLimit', e.target.value, -1)}
                    min="-1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('admin:pricing.form.listingsLimitHelp', '-1 = unlimited | Free: 3 | Pro: 20 | Agency: 500')}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.savedSearches', 'Saved Searches')}</label>
                <input
                  type="number"
                  value={editingProduct.savedSearchesLimit}
                  onChange={(e) => handleNumberChange('savedSearchesLimit', e.target.value, -1)}
                  min="-1"
                  placeholder="-1 for unlimited"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">{t('admin:pricing.form.unlimitedHelp', '-1 = unlimited')}</p>
              </div>
            </div>

            <h5 className="font-medium text-green-800 mb-2 text-sm">{t('admin:pricing.form.promoCouponsPerMonth', 'Promotion Coupons (per month)')}</h5>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.totalPromos', 'Total Promos')}</label>
                <input
                  type="number"
                  value={editingProduct.promotionCoupons}
                  onChange={(e) => handleNumberChange('promotionCoupons', e.target.value, 0)}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.premium', 'Premium')}</label>
                <input
                  type="number"
                  value={editingProduct.premiumCoupons || 0}
                  onChange={(e) => handleNumberChange('premiumCoupons', e.target.value, 0)}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.highlighted', 'Highlighted')}</label>
                <input
                  type="number"
                  value={editingProduct.highlightedCoupons || 0}
                  onChange={(e) => handleNumberChange('highlightedCoupons', e.target.value, 0)}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.featured', 'Featured')}</label>
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
            <h4 className="font-semibold text-cyan-900 mb-3">{t('admin:pricing.form.aiSection', 'AI & Insights Limits')}</h4>
            <p className="text-xs text-cyan-700 mb-3">{t('admin:pricing.form.aiSectionHelp', 'Use -1 for unlimited')}</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.aiMessagesPerMonth', 'AI Messages/mo')}</label>
                <input
                  type="number"
                  value={editingProduct.aiMessagesLimit ?? 0}
                  onChange={(e) => handleNumberChange('aiMessagesLimit', e.target.value, -1)}
                  min="-1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.insightsPerMonth', 'Insights/mo')}</label>
                <input
                  type="number"
                  value={editingProduct.aiInsightsLimit ?? 0}
                  onChange={(e) => handleNumberChange('aiInsightsLimit', e.target.value, -1)}
                  min="-1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.imageDescPerMonth', 'Image Desc/mo')}</label>
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
            <h4 className="font-semibold text-sky-900 mb-3">{t('admin:pricing.form.buyerSection', 'Buyer Features')}</h4>
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
                <span className="text-sm text-gray-700">{t('admin:pricing.form.earlyAccess', 'Early Access to New Listings')}</span>
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
                <span className="text-sm text-gray-700">{t('admin:pricing.form.advancedInsights', 'Advanced Market Insights')}</span>
              </label>
            </div>
          </div>

          {/* Trial & Grace */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-900 mb-3">{t('admin:pricing.form.trialSection', 'Trial & Grace Period')}</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={editingProduct.hasFreeTrial}
                    onChange={(e) => setEditingProduct({ ...editingProduct, hasFreeTrial: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('admin:pricing.form.hasFreeTrial', 'Has Free Trial')}</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.trialDays', 'Trial Days')}</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.gracePeriodDays', 'Grace Period (days)')}</label>
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
            <h4 className="font-semibold text-indigo-900 mb-3">{t('admin:pricing.featuresDescription', 'Features (displayed in pricing page)')}</h4>

            {/* Features List with Reordering */}
            <div className="space-y-2 mb-4">
              {(editingProduct.features || []).map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-indigo-100 group"
                >
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleMoveFeature(index, 'up')}
                      disabled={index === 0}
                      className={`p-0.5 rounded transition-colors ${
                        index === 0
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                      title="Move up"
                    >
                      <ChevronUpIcon className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveFeature(index, 'down')}
                      disabled={index === editingProduct.features.length - 1}
                      className={`p-0.5 rounded transition-colors ${
                        index === editingProduct.features.length - 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                      title="Move down"
                    >
                      <ChevronDownIcon className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Feature text - editable */}
                  <div className="flex-1">
                    {editingFeatureIndex === index ? (
                      <input
                        type="text"
                        value={editingFeatureValue}
                        onChange={(e) => setEditingFeatureValue(e.target.value)}
                        onBlur={saveEditingFeature}
                        onKeyDown={handleFeatureKeyDown}
                        autoFocus
                        className="w-full text-sm text-gray-700 px-2 py-1 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder={t('admin:pricing.featurePlaceholder', 'e.g., {listingsLimit} listings per month')}
                      />
                    ) : (
                      <div
                        onClick={() => startEditingFeature(index, feature)}
                        className="text-sm text-gray-700 cursor-text hover:bg-indigo-50 px-2 py-1 rounded -mx-2 -my-1 transition-colors"
                        title={t('admin:common.edit', 'Click to edit')}
                      >
                        {feature}
                      </div>
                    )}
                    {/* Preview with actual values */}
                    {hasPlaceholders(editingFeatureIndex === index ? editingFeatureValue : feature) && (
                      <div className="text-xs text-indigo-500 mt-0.5">
                        {t('admin:pricing.preview', 'Preview')}: {replacePlaceholders(editingFeatureIndex === index ? editingFeatureValue : feature, editingProduct)}
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors opacity-60 group-hover:opacity-100"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(!editingProduct.features || editingProduct.features.length === 0) && (
                <p className="text-sm text-gray-500 italic py-2">{t('admin:pricing.noFeatures', 'No features added yet')}</p>
              )}
            </div>

            {/* Add Feature Input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                placeholder={t('admin:pricing.featurePlaceholder', 'e.g., {listingsLimit} listings per month')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                disabled={!newFeature.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusIcon className="w-4 h-4" />
                {t('common:add', 'Add')}
              </button>
            </div>

            {/* Available Placeholders */}
            <div className="bg-white border border-indigo-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-indigo-800 mb-2">
                {t('admin:pricing.placeholders.title', 'Available Placeholders')} ({t('admin:pricing.placeholders.description', 'click to insert')}):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availablePlaceholders.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => insertPlaceholder(p.key)}
                    className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors font-mono"
                    title={t(`admin:pricing.placeholders.${p.key.replace(/[{}]/g, '')}Desc`, p.description)}
                  >
                    {p.key}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t('admin:pricing.placeholders.description', 'Use placeholders to dynamically show values from the product.')}
              </p>
            </div>
          </div>

          {/* Display Settings & Highlighted */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 mb-3">{t('admin:pricing.form.displaySection', 'Display Settings')}</h4>

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
                  <span className="text-sm font-semibold text-yellow-800">{t('admin:pricing.form.highlightedPlan', 'Highlighted / Featured Plan')}</span>
                  <p className="text-xs text-yellow-700">{t('admin:pricing.form.highlightedPlanDesc', 'Show with special styling on pricing page (golden border, "Most Popular" effect)')}</p>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.badgeText', 'Badge Text')}</label>
                <input
                  type="text"
                  value={editingProduct.badge || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                  placeholder={t('admin:pricing.form.badgePlaceholder', 'e.g., BEST VALUE')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.badgeColor', 'Badge Color')}</label>
                <select
                  value={editingProduct.badgeColor || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, badgeColor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">{t('admin:pricing.form.colors.default', 'Default')}</option>
                  <option value="red">{t('admin:pricing.form.colors.red', 'Red')}</option>
                  <option value="green">{t('admin:pricing.form.colors.green', 'Green')}</option>
                  <option value="blue">{t('admin:pricing.form.colors.blue', 'Blue')}</option>
                  <option value="amber">{t('admin:pricing.form.colors.amber', 'Amber')}</option>
                  <option value="purple">{t('admin:pricing.form.colors.purple', 'Purple')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.displayOrder', 'Display Order')}</label>
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
              <h5 className="text-sm font-medium text-purple-800 mb-2">{t('admin:pricing.form.cardStyle', 'Card Style (Optional)')}</h5>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t('admin:pricing.form.backgroundColor', 'Background Color')}</label>
                  <input
                    type="text"
                    value={editingProduct.cardStyle?.backgroundColor || ''}
                    onChange={(e) => setEditingProduct({
                      ...editingProduct,
                      cardStyle: { ...editingProduct.cardStyle, backgroundColor: e.target.value }
                    })}
                    placeholder={t('admin:pricing.form.backgroundPlaceholder', '#ffffff or gradient')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t('admin:pricing.form.borderColor', 'Border Color')}</label>
                  <input
                    type="text"
                    value={editingProduct.cardStyle?.borderColor || ''}
                    onChange={(e) => setEditingProduct({
                      ...editingProduct,
                      cardStyle: { ...editingProduct.cardStyle, borderColor: e.target.value }
                    })}
                    placeholder={t('admin:pricing.form.borderPlaceholder', '#e5e7eb')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t('admin:pricing.form.textColor', 'Text Color')}</label>
                  <input
                    type="text"
                    value={editingProduct.cardStyle?.textColor || ''}
                    onChange={(e) => setEditingProduct({
                      ...editingProduct,
                      cardStyle: { ...editingProduct.cardStyle, textColor: e.target.value }
                    })}
                    placeholder={t('admin:pricing.form.textPlaceholder', '#1f2937')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Agency/Enterprise Features */}
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
            <h4 className="font-semibold text-violet-900 mb-3">{t('admin:pricing.form.agencySection', 'Agency / Enterprise Features')}</h4>
            <p className="text-xs text-violet-700 mb-3">{t('admin:pricing.form.agencySectionDesc', 'Special features for agency tier subscriptions')}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.agentCouponsPerMonth', 'Agent Coupons/month')}</label>
                <input
                  type="number"
                  value={editingProduct.agentCoupons}
                  onChange={(e) => handleNumberChange('agentCoupons', e.target.value, 0)}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">{t('admin:pricing.form.agentCouponsHelp', 'Coupons to invite agents to the agency')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.maxSubscriptions', 'Max Subscriptions')}</label>
                <input
                  type="number"
                  value={editingProduct.maxActiveSubscriptions || 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, maxActiveSubscriptions: parseInt(e.target.value) || 0 })}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">{t('admin:pricing.form.maxSubscriptionsHelp', '0 = unlimited')}</p>
              </div>
            </div>
          </div>

          {/* Stripe */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">{t('admin:pricing.form.stripeSection', 'Stripe Integration')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.stripeProductId', 'Stripe Product ID')}</label>
                <input
                  type="text"
                  value={editingProduct.stripeProductId || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stripeProductId: e.target.value })}
                  placeholder={t('admin:pricing.form.stripeProductPlaceholder', 'prod_...')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:pricing.form.stripePriceId', 'Stripe Price ID')}</label>
                <input
                  type="text"
                  value={editingProduct.stripePriceId || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stripePriceId: e.target.value })}
                  placeholder={t('admin:pricing.form.stripePricePlaceholder', 'price_...')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 bg-white border rounded-xl hover:bg-gray-50 transition-colors"
          >
            {t('common:cancel', 'Cancel')}
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className={`px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors flex items-center gap-2 ${
              isSaving ? 'opacity-70' : ''
            }`}
          >
            {isSaving ? (
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
  );
};

export default PricingManagerForm;
