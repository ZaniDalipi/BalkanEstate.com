import React from 'react';
import { XMarkIcon, PhotoIcon, SpinnerIcon } from '@/constants';
import { PLACEMENTS, BILLING_PERIODS } from '@/src/features/ads/placements';
import type { AdBannerAdmin, AdBannerFormData } from '@/src/features/ads/types';

interface Props {
  editingItem: AdBannerAdmin | null;
  formData: AdBannerFormData;
  setFormData: React.Dispatch<React.SetStateAction<AdBannerFormData>>;
  isUploading: boolean;
  isSaving: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  mobileFileInputRef: React.RefObject<HTMLInputElement>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>, target: 'desktop' | 'mobile') => void;
}

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

const AdBannerManagerForm: React.FC<Props> = ({
  editingItem,
  formData,
  setFormData,
  isUploading,
  isSaving,
  fileInputRef,
  mobileFileInputRef,
  onClose,
  onSubmit,
  onImageUpload,
}) => {
  const update = <K extends keyof AdBannerFormData>(key: K, value: AdBannerFormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const selectedPlacement = PLACEMENTS.find((p) => p.id === formData.placement);

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">
            {editingItem ? 'Edit Banner' : 'New Ad Banner'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Internal title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => update('title', e.target.value)}
                className={inputCls}
                placeholder="e.g. Summer bank promo"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Advertiser / company</label>
              <input
                type="text"
                value={formData.advertiserName}
                onChange={(e) => update('advertiserName', e.target.value)}
                className={inputCls}
                placeholder="e.g. Raiffeisen Bank"
              />
            </div>
          </div>

          {/* Placement */}
          <div>
            <label className={labelCls}>Placement (page & position) *</label>
            <select
              value={formData.placement}
              onChange={(e) => update('placement', e.target.value as AdBannerFormData['placement'])}
              className={inputCls}
            >
              {PLACEMENTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            {selectedPlacement && (
              <p className="mt-1 text-xs text-gray-500">
                {selectedPlacement.description} · Recommended size: {selectedPlacement.recommendedSize}px
              </p>
            )}
          </div>

          {/* Desktop image */}
          <div>
            <label className={labelCls}>Banner image *</label>
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-2">
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => update('imageUrl', e.target.value)}
                  className={inputCls}
                  placeholder="Paste image URL or upload →"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 disabled:opacity-60"
                >
                  {isUploading ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : <PhotoIcon className="w-4 h-4" />}
                  Upload image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onImageUpload(e, 'desktop')}
                />
              </div>
              {formData.imageUrl && (
                <img
                  src={formData.imageUrl}
                  alt="preview"
                  className="w-32 h-16 object-contain border border-gray-200 rounded-lg bg-gray-50"
                />
              )}
            </div>
          </div>

          {/* Mobile image (optional) */}
          <div>
            <label className={labelCls}>Mobile image (optional)</label>
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-2">
                <input
                  type="url"
                  value={formData.mobileImageUrl}
                  onChange={(e) => update('mobileImageUrl', e.target.value)}
                  className={inputCls}
                  placeholder="Optional smaller creative for phones"
                />
                <button
                  type="button"
                  onClick={() => mobileFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 disabled:opacity-60"
                >
                  {isUploading ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : <PhotoIcon className="w-4 h-4" />}
                  Upload mobile image
                </button>
                <input
                  ref={mobileFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onImageUpload(e, 'mobile')}
                />
              </div>
              {formData.mobileImageUrl && (
                <img
                  src={formData.mobileImageUrl}
                  alt="mobile preview"
                  className="w-20 h-16 object-contain border border-gray-200 rounded-lg bg-gray-50"
                />
              )}
            </div>
          </div>

          {/* Link */}
          <div>
            <label className={labelCls}>Click-through URL *</label>
            <input
              type="url"
              value={formData.linkUrl}
              onChange={(e) => update('linkUrl', e.target.value)}
              className={inputCls}
              placeholder="https://advertiser.example.com"
              required
            />
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.openInNewTab}
                onChange={(e) => update('openInNewTab', e.target.checked)}
                className="rounded border-gray-300"
              />
              Open in a new tab
            </label>
          </div>

          {/* Pricing (operator reference) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Price</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={formData.price}
                onChange={(e) => update('price', e.target.value)}
                className={inputCls}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <input
                type="text"
                maxLength={3}
                value={formData.currency}
                onChange={(e) => update('currency', e.target.value.toUpperCase())}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Billing</label>
              <select
                value={formData.billingPeriod}
                onChange={(e) => update('billingPeriod', e.target.value as AdBannerFormData['billingPeriod'])}
                className={inputCls}
              >
                {BILLING_PERIODS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scheduling + priority */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Start date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => update('startDate', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>End date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => update('endDate', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => update('priority', Number(e.target.value))}
                className={inputCls}
                title="Higher priority banners show first in the same slot"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => update('isActive', e.target.checked)}
                className="rounded border-gray-300"
              />
              Active
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.isSticky}
                onChange={(e) => update('isSticky', e.target.checked)}
                className="rounded border-gray-300"
              />
              Sticky
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.dismissible}
                onChange={(e) => update('dismissible', e.target.checked)}
                className="rounded border-gray-300"
              />
              Dismissible (sticky bar)
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Internal notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => update('notes', e.target.value)}
              className={inputCls}
              rows={2}
              placeholder="Contract details, contact, etc. (not shown publicly)"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60"
            >
              {isSaving && <SpinnerIcon className="w-4 h-4 animate-spin" />}
              {editingItem ? 'Save changes' : 'Create banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdBannerManagerForm;
