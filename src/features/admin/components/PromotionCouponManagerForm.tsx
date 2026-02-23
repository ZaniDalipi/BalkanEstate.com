import React from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@/constants';
import type { PromotionCoupon, CreateCouponData } from './usePromotionCouponManager';

// ============================================================================
// Create Coupon Modal
// ============================================================================

interface CreateCouponModalProps {
  newCoupon: CreateCouponData;
  setNewCoupon: React.Dispatch<React.SetStateAction<CreateCouponData>>;
  couponDuration: number;
  setCouponDuration: (days: number) => void;
  durationOptions: ReadonlyArray<{ value: number; label: string }>;
  applyPreset: (preset: 'test100' | 'welcome' | 'seasonal') => void;
  getTierBadgeColor: (tier: string) => string;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isCreating: boolean;
}

export const CreateCouponModal: React.FC<CreateCouponModalProps> = ({
  newCoupon,
  setNewCoupon,
  couponDuration,
  setCouponDuration,
  durationOptions,
  applyPreset,
  getTierBadgeColor,
  onSubmit,
  onClose,
  isCreating,
}) => {
  const { t } = useTranslation(['admin']);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-xl font-bold">{t('admin:promotionCoupons.createCoupon', 'Create Promotion Coupon')}</h3>
          <button onClick={onClose}>
            <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="px-6 pt-4 flex gap-2">
          {/* Test preset only shown in development */}
          {import.meta.env.MODE !== 'production' && (
            <button
              type="button"
              onClick={() => applyPreset('test100')}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              {t('admin:promotionCoupons.presets.test100', 'Test 100% Off')}
            </button>
          )}
          <button
            type="button"
            onClick={() => applyPreset('welcome')}
            className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            {t('admin:promotionCoupons.presets.welcome', 'Welcome 15%')}
          </button>
          <button
            type="button"
            onClick={() => applyPreset('seasonal')}
            className="px-3 py-1.5 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
          >
            {t('admin:promotionCoupons.presets.seasonal', 'Seasonal 25%')}
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:promotionCoupons.form.code', 'Code')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newCoupon.code}
              onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono uppercase"
              placeholder={t('admin:promotionCoupons.form.codePlaceholder', 'SUMMER25')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:promotionCoupons.form.description', 'Description')}</label>
            <input
              type="text"
              value={newCoupon.description}
              onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder={t('admin:promotionCoupons.form.descriptionPlaceholder', 'Summer promotion - 25% off')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:promotionCoupons.form.discountType', 'Discount Type')}
              </label>
              <select
                value={newCoupon.discountType}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, discountType: e.target.value as any })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="percentage">{t('admin:promotionCoupons.form.percentage', 'Percentage (%)')}</option>
                <option value="fixed">{t('admin:promotionCoupons.form.fixedAmount', 'Fixed Amount (\u20AC)')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:promotionCoupons.form.discountValue', 'Discount Value')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={newCoupon.discountValue}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                min="1"
                max={newCoupon.discountType === 'percentage' ? 100 : undefined}
                required
              />
            </div>
          </div>

          {/* Coupon Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:promotionCoupons.form.couponDuration', 'Coupon Duration')} <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {durationOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCouponDuration(opt.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                    couponDuration === opt.value
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:text-purple-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('admin:promotionCoupons.form.couponDurationDesc', 'How long this coupon will be available for use')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:promotionCoupons.form.validUntil', 'Valid Until')} <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={newCoupon.validUntil}
                onChange={(e) => {
                  setCouponDuration(0); // Switch to custom when manually editing
                  setNewCoupon({ ...newCoupon, validUntil: e.target.value });
                }}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                  couponDuration !== 0 ? 'bg-gray-50 text-gray-500' : ''
                }`}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
              {couponDuration !== 0 && (
                <p className="text-xs text-purple-600 mt-1">
                  {t('admin:promotionCoupons.form.autoCalculated', 'Auto-calculated from duration')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:promotionCoupons.form.minPurchase', 'Min. Purchase (\u20AC)')}
              </label>
              <input
                type="number"
                value={newCoupon.minimumPurchaseAmount}
                onChange={(e) =>
                  setNewCoupon({
                    ...newCoupon,
                    minimumPurchaseAmount: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                min="0"
                placeholder={t('admin:promotionCoupons.form.optionalPlaceholder', '0 (optional)')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:promotionCoupons.form.totalUsageLimit', 'Total Usage Limit')}
              </label>
              <input
                type="number"
                value={newCoupon.maxTotalUses || ''}
                onChange={(e) =>
                  setNewCoupon({
                    ...newCoupon,
                    maxTotalUses: e.target.value ? Number(e.target.value) : 0,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                min="1"
                placeholder={t('admin:promotionCoupons.form.unlimitedPlaceholder', 'Unlimited (optional)')}
              />
              <p className="text-xs text-gray-500 mt-1">{t('admin:promotionCoupons.form.leaveEmptyUnlimited', 'Leave empty for unlimited uses')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:promotionCoupons.form.usesPerUser', 'Uses Per User')}
              </label>
              <input
                type="number"
                value={newCoupon.maxUsesPerUser}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, maxUsesPerUser: Number(e.target.value) || 1 })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:promotionCoupons.form.applicableTiers', 'Applicable Promotion Tiers')}
            </label>
            <div className="flex flex-wrap gap-3">
              {['featured', 'highlight', 'premium'].map((tier) => (
                <label key={tier} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCoupon.applicableTiers?.includes(tier)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewCoupon({
                          ...newCoupon,
                          applicableTiers: [...(newCoupon.applicableTiers || []), tier],
                        });
                      } else {
                        setNewCoupon({
                          ...newCoupon,
                          applicableTiers: (newCoupon.applicableTiers || []).filter(
                            (t) => t !== tier
                          ),
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${getTierBadgeColor(tier)}`}
                  >
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('admin:promotionCoupons.form.leaveUncheckedAllTiers', 'Leave all unchecked to apply to all tiers')}
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newCoupon.isPublic}
                onChange={(e) => setNewCoupon({ ...newCoupon, isPublic: e.target.checked })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">{t('admin:promotionCoupons.form.publicCoupon', 'Public Coupon')}</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              {t('admin:promotionCoupons.form.publicCouponDesc', 'Public coupons can be displayed to users on the promotion page')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:promotionCoupons.form.internalNotes', 'Internal Notes')}
            </label>
            <textarea
              value={newCoupon.notes}
              onChange={(e) => setNewCoupon({ ...newCoupon, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows={2}
              placeholder={t('admin:promotionCoupons.form.notesPlaceholder', 'Internal notes about this coupon...')}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              {t('admin:common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50"
            >
              {isCreating ? t('admin:promotionCoupons.form.creating', 'Creating...') : t('admin:promotionCoupons.form.createCoupon', 'Create Coupon')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
