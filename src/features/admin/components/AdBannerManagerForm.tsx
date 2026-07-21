import React from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, PhotoIcon } from '@/constants';
import type { AdBannerAdmin } from '@/src/features/ads/types';
import { AdBannerFormData, PLACEMENT_OPTIONS, PAGE_OPTIONS } from './useAdBannerManager';

interface Props {
  editingItem: AdBannerAdmin | null;
  formData: AdBannerFormData;
  setFormData: React.Dispatch<React.SetStateAction<AdBannerFormData>>;
  isUploading: boolean;
  isSaving: boolean;
  error: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

/** Recommended creative size (px) per placement, matching the rendered ad slot. */
const RECOMMENDED_SIZE: Record<string, string> = {
  'in-content': '970 × 250 (billboard leaderboard)',
  'sticky-bottom': '970 × 90 (leaderboard)',
  'sticky-top': '970 × 90 (leaderboard)',
  'header': '970 × 90 (leaderboard)',
  'sidebar': '300 × 600 (half-page) — or 160 × 600 for home side rails',
  'footer': '970 × 250 (billboard)',
};

const AdBannerManagerForm: React.FC<Props> = ({
  editingItem,
  formData,
  setFormData,
  isUploading,
  isSaving,
  error,
  fileInputRef,
  onClose,
  onSubmit,
  onFileUpload,
}) => {
  const { t } = useTranslation(['admin']);
  const set = <K extends keyof AdBannerFormData>(key: K, value: AdBannerFormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">
            {editingItem
              ? t('admin:adBanners.editBanner', 'Edit Ad Banner')
              : t('admin:adBanners.addBanner', 'Add Banner')}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Image upload */}
          <div>
            <label className={labelCls}>{t('admin:adBanners.image', 'Banner Image')} *</label>
            <div className="flex items-center gap-4">
              <div className="w-40 h-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PhotoIcon className="w-6 h-6 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileUpload}
                  className="hidden"
                  id="ad-banner-file"
                />
                <label
                  htmlFor="ad-banner-file"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  <PhotoIcon className="w-5 h-5" />
                  {isUploading
                    ? t('admin:adBanners.uploading', 'Uploading…')
                    : t('admin:adBanners.uploadImage', 'Upload Image')}
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  {t('admin:adBanners.recommendedSize', 'Recommended size')}:{' '}
                  <span className="font-medium text-gray-700">
                    {RECOMMENDED_SIZE[formData.placement] || '970 × 250'}
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {t('admin:adBanners.imageHint2', 'PNG or JPG, max 5MB. The image fills the slot, so match the size for a clean fit.')}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('admin:adBanners.bannerTitle', 'Title / Label')} *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => set('title', e.target.value)}
                className={inputCls}
                placeholder={t('admin:adBanners.titlePlaceholder', 'Internal label')}
                required
              />
            </div>
            <div>
              <label className={labelCls}>{t('admin:adBanners.advertiser', 'Advertiser')} *</label>
              <input
                type="text"
                value={formData.advertiserName}
                onChange={(e) => set('advertiserName', e.target.value)}
                className={inputCls}
                placeholder={t('admin:adBanners.advertiserPlaceholder', 'Company name')}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>{t('admin:adBanners.linkUrl', 'Link URL')} *</label>
            <input
              type="url"
              value={formData.linkUrl}
              onChange={(e) => set('linkUrl', e.target.value)}
              className={inputCls}
              placeholder="https://advertiser.example.com"
              required
            />
          </div>

          <div>
            <label className={labelCls}>{t('admin:adBanners.advertiserContact', 'Advertiser Contact')}</label>
            <input
              type="text"
              value={formData.advertiserContact}
              onChange={(e) => set('advertiserContact', e.target.value)}
              className={inputCls}
              placeholder={t('admin:adBanners.contactPlaceholder', 'Email or phone (for billing)')}
            />
          </div>

          {/* Placement + Page */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('admin:adBanners.placement', 'Placement')}</label>
              <select
                value={formData.placement}
                onChange={(e) => set('placement', e.target.value as AdBannerFormData['placement'])}
                className={inputCls}
              >
                {PLACEMENT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('admin:adBanners.page', 'Target Page')}</label>
              <select
                value={formData.page}
                onChange={(e) => set('page', e.target.value as AdBannerFormData['page'])}
                className={inputCls}
              >
                {PAGE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category + price */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>{t('admin:adBanners.category', 'Category / Tier')}</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => set('category', e.target.value)}
                className={inputCls}
                placeholder={t('admin:adBanners.categoryPlaceholder', 'e.g. premium')}
              />
            </div>
            <div>
              <label className={labelCls}>{t('admin:adBanners.price', 'Price / month')}</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.price}
                onChange={(e) => set('price', e.target.value)}
                className={inputCls}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelCls}>{t('admin:adBanners.currency', 'Currency')}</label>
              <input
                type="text"
                maxLength={3}
                value={formData.currency}
                onChange={(e) => set('currency', e.target.value.toUpperCase())}
                className={inputCls}
                placeholder="EUR"
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>{t('admin:adBanners.startDate', 'Start Date')}</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t('admin:adBanners.endDate', 'End Date')}</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t('admin:adBanners.order', 'Order')}</label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => set('order', Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{t('admin:adBanners.activeLabel', 'Active')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isSticky}
                onChange={(e) => set('isSticky', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{t('admin:adBanners.stickyLabel', 'Sticky')}</span>
            </label>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {t('admin:adBanners.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {isSaving
                ? t('admin:adBanners.saving', 'Saving…')
                : editingItem
                ? t('admin:adBanners.saveChanges', 'Save Changes')
                : t('admin:adBanners.createBanner', 'Create Banner')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdBannerManagerForm;
