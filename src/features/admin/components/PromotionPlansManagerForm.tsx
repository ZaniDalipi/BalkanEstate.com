import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PencilIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  CheckIcon,
  StarIcon,
} from '@/constants';
import { PromotionPlan } from '../api/adminApi';

// ============================================================================
// PlanCard Component
// ============================================================================

export const PlanCard: React.FC<{
  plan: PromotionPlan;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  isMutating?: boolean;
}> = ({ plan, onEdit, onDelete, onToggleStatus, isMutating }) => {
  const { t } = useTranslation(['admin']);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'featured': return 'bg-purple-100 text-purple-700';
      case 'highlight': return 'bg-cyan-100 text-cyan-700';
      case 'premium': return 'bg-amber-100 text-amber-700';
      case 'spotlight': return 'bg-gray-100 text-gray-700';
      case 'homepage': return 'bg-orange-100 text-orange-700';
      case 'addon': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getHeaderGradient = () => {
    if (plan.isAddOn) return 'bg-gradient-to-r from-blue-500 to-indigo-500';
    if (plan.category === 'listing') return 'bg-gradient-to-r from-purple-500 to-indigo-500';
    return 'bg-gradient-to-r from-amber-500 to-orange-500';
  };

  return (
    <div className={`bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-all hover:shadow-xl ${
      !plan.isActive ? 'opacity-60 border-gray-200' : plan.highlighted ? 'border-amber-300' : plan.isAddOn ? 'border-blue-300' : 'border-transparent'
    }`}>
      {/* Header */}
      <div className={`p-4 ${getHeaderGradient()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{plan.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                {plan.isAddOn && (
                  <span className="px-2 py-0.5 bg-white/30 text-white text-xs font-bold rounded-full">
                    {t('admin:promotionPlans.addOn', 'Add-on')}
                  </span>
                )}
              </div>
              <p className="text-white/80 text-sm">{plan.description}</p>
            </div>
          </div>
          {plan.badge && !plan.isAddOn && (
            <span className="px-2 py-1 bg-white/20 text-white text-xs font-bold rounded-full backdrop-blur-sm">
              {plan.badge}
            </span>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getTierColor(plan.tier)}`}>
            {plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1)}
          </span>
          {plan.visibilityMultiplier && (
            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
              {plan.visibilityMultiplier} visibility
            </span>
          )}
        </div>

        {/* Duration-based pricing display */}
        {plan.category === 'agency' ? (
          <div className="mt-3 text-center p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
            <div className="text-xs text-amber-600 font-medium">{t('admin:promotionPlans.perWeek', 'per week')}</div>
            <div className="text-3xl font-bold text-amber-600">&euro;{plan.pricing.duration7 || 0}</div>
            <div className="text-xs text-gray-500 mt-1">{t('admin:promotionPlans.featuredEverywhere', 'Featured everywhere on platform')}</div>
          <div className="grid grid-cols-4 gap-1.5 mt-3">
            <div className="text-center p-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
              <div className="text-[10px] text-amber-600 font-medium">7 days</div>
              <div className="font-bold text-amber-600 text-sm">&euro;{plan.pricing.duration7 || 0}</div>
            </div>
            <div className="text-center p-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
              <div className="text-[10px] text-amber-600 font-medium">14 days</div>
              <div className="font-bold text-amber-600 text-sm">&euro;{plan.pricing.duration14 || 0}</div>
            </div>
            <div className="text-center p-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
              <div className="text-[10px] text-amber-600 font-medium">28 days</div>
              <div className="font-bold text-amber-600 text-sm">&euro;{plan.pricing.duration28 || 0}</div>
            </div>
            <div className="text-center p-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
              <div className="text-[10px] text-amber-600 font-medium">90 days</div>
              <div className="font-bold text-amber-600 text-sm">&euro;{plan.pricing.duration90 || 0}</div>
            </div>
          </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">{t('admin:promotionPlans.sevenDays', '7 days')}</div>
              <div className="font-bold text-gray-900">&euro;{plan.pricing.duration7 || 0}</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">{t('admin:promotionPlans.thirtyDays', '30 days')}</div>
              <div className="font-bold text-gray-900">&euro;{plan.pricing.duration30 || 0}</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">{t('admin:promotionPlans.ninetyDays', '90 days')}</div>
              <div className="font-bold text-gray-900">&euro;{plan.pricing.duration90 || 0}</div>
            </div>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="p-4 border-b border-gray-100">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">{t('admin:promotionPlans.features', 'Features')}</div>
        <ul className="space-y-1">
          {plan.features.slice(0, 3).map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="truncate">{feature}</span>
            </li>
          ))}
          {plan.features.length > 3 && (
            <li className="text-xs text-gray-400">{t('admin:promotionPlans.moreFeatures', '+{{count}} more features', { count: plan.features.length - 3 })}</li>
          )}
        </ul>
      </div>

      {/* Actions */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={onToggleStatus}
          disabled={isMutating}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            plan.isActive
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          } ${isMutating ? 'opacity-50 cursor-wait' : ''}`}
        >
          {isMutating ? (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              {t('admin:common.updating', 'Updating...')}
            </span>
          ) : (
            plan.isActive ? t('admin:common.active', 'Active') : t('admin:common.inactive', 'Inactive')
          )}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title={t('admin:common.edit', 'Edit')}
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={t('admin:common.delete', 'Delete')}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EditPlanModal Component
// ============================================================================

export const EditPlanModal: React.FC<{
  plan: PromotionPlan;
  onChange: (plan: PromotionPlan) => void;
  onSave: () => void;
  onClose: () => void;
  newFeature: string;
  setNewFeature: (v: string) => void;
  onAddFeature: () => void;
  onRemoveFeature: (index: number) => void;
  onApplyPreset: (preset: 'purple' | 'cyan' | 'amber' | 'gray' | 'slate') => void;
  showPreview: boolean;
  setShowPreview: (v: boolean) => void;
  isSaving?: boolean;
}> = ({ plan, onChange, onSave, onClose, newFeature, setNewFeature, onAddFeature, onRemoveFeature, onApplyPreset, showPreview, setShowPreview, isSaving }) => {
  const { t } = useTranslation(['admin', 'common']);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <h3 className="text-xl font-bold flex items-center gap-2">
            {plan.id ? <PencilIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
            {plan.id ? t('admin:promotionPlans.editPlan', 'Edit Plan') : t('admin:promotionPlans.createPlan', 'Create Plan')}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`p-2 rounded-lg transition-colors ${showPreview ? 'bg-white/20' : 'hover:bg-white/10'}`}
              title={t('admin:common.preview', 'Preview')}
            >
              <EyeIcon className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : ''}`}>
            {/* Form */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:promotionPlans.name', 'Name')} *</label>
                  <input
                    type="text"
                    value={plan.name}
                    onChange={(e) => onChange({ ...plan, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="e.g., Featured"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:promotionPlans.icon', 'Icon (Emoji)')}</label>
                  <input
                    type="text"
                    value={plan.icon || ''}
                    onChange={(e) => onChange({ ...plan, icon: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-2xl"
                    placeholder="⭐"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:promotionPlans.description', 'Description')}</label>
                <input
                  type="text"
                  value={plan.description || ''}
                  onChange={(e) => onChange({ ...plan, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Short description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:promotionPlans.tier', 'Tier')}</label>
                  <select
                    value={plan.tier}
                    onChange={(e) => onChange({ ...plan, tier: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {plan.category === 'listing' ? (
                      <>
                        <option value="featured">Featured</option>
                        <option value="highlight">Highlight</option>
                        <option value="premium">Premium</option>
                      </>
                    ) : (
                      <>
                        <option value="featured">Featured</option>
                        <option value="addon">Add-on</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:promotionPlans.displayOrder', 'Display Order')}</label>
                  <input
                    type="number"
                    value={plan.displayOrder}
                    onChange={(e) => onChange({ ...plan, displayOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">&euro;</span>
                  {t('admin:promotionPlans.pricing', 'Pricing')}
                  {plan.category === 'agency' && (
                    <span className="px-2 py-0.5 bg-amber-200 text-amber-700 text-xs font-bold rounded-full ml-auto">
                      {t('admin:promotionPlans.weekly', 'Weekly')}
                      Duration-Based
                    </span>
                  )}
                </h4>
                {/* Agency plans have 4 duration options */}
                {plan.category === 'agency' ? (
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">7 Days</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={plan.pricing.duration7 || ''}
                        onChange={(e) => onChange({
                          ...plan,
                          pricing: { ...plan.pricing, duration7: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="6.99"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">14 Days</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={plan.pricing.duration14 || ''}
                        onChange={(e) => onChange({
                          ...plan,
                          pricing: { ...plan.pricing, duration14: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="11.99"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">28 Days</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={plan.pricing.duration28 || ''}
                        onChange={(e) => onChange({
                          ...plan,
                          pricing: { ...plan.pricing, duration28: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="24.99"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">90 Days</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={plan.pricing.duration90 || ''}
                        onChange={(e) => onChange({
                          ...plan,
                          pricing: { ...plan.pricing, duration90: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="49.99"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">7 {t('admin:common.days', 'Days')}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={plan.pricing.duration7 || ''}
                        onChange={(e) => onChange({
                          ...plan,
                          pricing: { ...plan.pricing, duration7: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">30 {t('admin:common.days', 'Days')}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={plan.pricing.duration30 || ''}
                        onChange={(e) => onChange({
                          ...plan,
                          pricing: { ...plan.pricing, duration30: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">90 {t('admin:common.days', 'Days')}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={plan.pricing.duration90 || ''}
                        onChange={(e) => onChange({
                          ...plan,
                          pricing: { ...plan.pricing, duration90: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <CheckIcon className="w-5 h-5" />
                  {t('admin:promotionPlans.features', 'Features')}
                </h4>
                <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg">
                      <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="flex-1 text-sm">{feature}</span>
                      <button
                        onClick={() => onRemoveFeature(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), onAddFeature())}
                    placeholder={t('admin:promotionPlans.addFeature', 'Add a feature...')}
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                  <button
                    onClick={onAddFeature}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Display Settings */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <StarIcon className="w-5 h-5" />
                  {t('admin:promotionPlans.displaySettings', 'Display Settings')}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t('admin:promotionPlans.badge', 'Badge Text')}</label>
                    <input
                      type="text"
                      value={plan.badge || ''}
                      onChange={(e) => onChange({ ...plan, badge: e.target.value })}
                      placeholder="e.g., Popular"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t('admin:promotionPlans.visibility', 'Visibility Multiplier')}</label>
                    <input
                      type="text"
                      value={plan.visibilityMultiplier || ''}
                      onChange={(e) => onChange({ ...plan, visibilityMultiplier: e.target.value })}
                      placeholder="e.g., 2x"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plan.highlighted}
                      onChange={(e) => onChange({ ...plan, highlighted: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">{t('admin:promotionPlans.highlighted', 'Highlighted')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plan.isVisible}
                      onChange={(e) => onChange({ ...plan, isVisible: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">{t('admin:promotionPlans.visible', 'Visible')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plan.isActive}
                      onChange={(e) => onChange({ ...plan, isActive: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">{t('admin:common.active', 'Active')}</span>
                  </label>
                </div>

                {/* Color Presets */}
                <div className="mt-4">
                  <label className="block text-sm text-gray-700 mb-2">{t('admin:promotionPlans.colorPreset', 'Color Preset')}</label>
                  <div className="flex gap-2">
                    {(['purple', 'cyan', 'amber', 'gray', 'slate'] as const).map((preset) => (
                      <button
                        key={preset}
                        onClick={() => onApplyPreset(preset)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          preset === 'purple' ? 'bg-purple-500' :
                          preset === 'cyan' ? 'bg-cyan-500' :
                          preset === 'amber' ? 'bg-amber-500' :
                          preset === 'gray' ? 'bg-gray-400' :
                          'bg-slate-800'
                        } hover:scale-110`}
                        title={preset}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            {showPreview && (
              <div className="lg:sticky lg:top-0">
                <div className="bg-gray-100 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{t('admin:common.preview', 'Preview')}</h4>
                  <PlanCard
                    plan={plan}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onToggleStatus={() => {}}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
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
                {t('admin:common.saving', 'Saving...')}
              </>
            ) : (
              t('common:save', 'Save Changes')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
