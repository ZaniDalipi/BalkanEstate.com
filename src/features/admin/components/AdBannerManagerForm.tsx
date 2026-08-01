import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, PhotoIcon } from '@/constants';
import type { AdBannerAdmin } from '@/src/features/ads/types';
import { AdBannerFormData, PLACEMENT_OPTIONS, PAGE_OPTIONS } from './useAdBannerManager';
import AdLocationPreview, { buildAdPreviewUrl } from './AdLocationPreview';

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
const hintCls = 'text-xs text-gray-400 mt-1';
const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

/** Recommended creative dimensions (px) per placement — drives the preview aspect + size check. */
const RECOMMENDED_DIMS: Record<string, { w: number; h: number; label: string }> = {
  'in-content': { w: 970, h: 250, label: '970 × 250 — billboard leaderboard' },
  'sticky-bottom': { w: 970, h: 90, label: '970 × 90 — leaderboard' },
  'sticky-top': { w: 970, h: 90, label: '970 × 90 — leaderboard' },
  header: { w: 970, h: 90, label: '970 × 90 — leaderboard' },
  sidebar: { w: 300, h: 600, label: '300 × 600 — half-page (or 160 × 600 for home side rails)' },
  footer: { w: 970, h: 250, label: '970 × 250 — billboard' },
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
  const { t, i18n } = useTranslation(['admin']);
  const set = <K extends keyof AdBannerFormData>(key: K, value: AdBannerFormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));
  const previewUrl = buildAdPreviewUrl(formData.page, formData.placement, i18n.language);

  const dims = RECOMMENDED_DIMS[formData.placement] || RECOMMENDED_DIMS['in-content'];
  const isTall = dims.h > dims.w;

  // Natural size of the uploaded image, read on load, to warn when it's too small.
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    setImgDims(null);
  }, [formData.imageUrl]);

  const tooSmall =
    imgDims !== null && (imgDims.w < dims.w * 0.8 || imgDims.h < dims.h * 0.8);

  const previewBoxStyle: React.CSSProperties = isTall
    ? { height: 300, aspectRatio: `${dims.w} / ${dims.h}`, background: '#fff' }
    : { width: 300, maxWidth: '100%', aspectRatio: `${dims.w} / ${dims.h}`, background: '#fff' };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-900">
            {editingItem
              ? t('admin:adBanners.editBanner', 'Edit Ad Banner')
              : t('admin:adBanners.addBanner', 'Add Banner')}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Image upload */}
          <div>
            <label className={labelCls}>{t('admin:adBanners.image', 'Banner Image')} *</label>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {/* Preview at the exact slot proportions so you see the real fit */}
              <div
                className="rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0"
                style={previewBoxStyle}
              >
                {formData.imageUrl ? (
                  <img
                    src={formData.imageUrl}
                    alt="preview"
                    className="w-full h-full"
                    style={{ objectFit: 'contain', display: 'block' }}
                    onLoad={(e) =>
                      setImgDims({
                        w: e.currentTarget.naturalWidth,
                        h: e.currentTarget.naturalHeight,
                      })
                    }
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PhotoIcon className="w-6 h-6 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
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
                    : formData.imageUrl
                    ? t('admin:adBanners.replaceImage', 'Replace Image')
                    : t('admin:adBanners.uploadImage', 'Upload Image')}
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  {t('admin:adBanners.recommendedSize', 'Recommended size')}:{' '}
                  <span className="font-medium text-gray-700">{dims.label}</span>
                </p>
                <p className={hintCls}>
                  {t('admin:adBanners.imageHint2', 'PNG or JPG, max 5MB. The image fills the slot — match the size so it looks sharp and not stretched or cropped.')}
                </p>
                {imgDims && (
                  <p className={`text-xs mt-1 ${tooSmall ? 'text-amber-600 font-medium' : 'text-green-600'}`}>
                    {tooSmall
                      ? t('admin:adBanners.imageTooSmall', {
                          defaultValue: '⚠ Uploaded image is {{w}}×{{h}}px — smaller than recommended. It may look blurry. Use at least {{rw}}×{{rh}}px.',
                          w: imgDims.w,
                          h: imgDims.h,
                          rw: dims.w,
                          rh: dims.h,
                        })
                      : t('admin:adBanners.imageGood', {
                          defaultValue: '✓ Uploaded image is {{w}}×{{h}}px — good fit.',
                          w: imgDims.w,
                          h: imgDims.h,
                        })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Title + Advertiser */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('admin:adBanners.bannerTitle', 'Title / Label')} *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => set('title', e.target.value)}
                className={inputCls}
                placeholder={t('admin:adBanners.titlePlaceholder', 'e.g. Summer campaign — Bank X')}
                required
              />
              <p className={hintCls}>{t('admin:adBanners.titleHint', 'Internal name only — not shown to visitors.')}</p>
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
              <p className={hintCls}>{t('admin:adBanners.advertiserHint', 'The company buying this slot.')}</p>
            </div>
          </div>

          {/* Link */}
          <div>
            <label className={labelCls}>{t('admin:adBanners.linkUrl', 'Link URL')} *</label>
            <input
              type="text"
              inputMode="url"
              value={formData.linkUrl}
              onChange={(e) => set('linkUrl', e.target.value)}
              className={inputCls}
              placeholder="advertiser.com"
              required
            />
            <p className={hintCls}>{t('admin:adBanners.linkHint', 'Where visitors go when they click the banner (opens in a new tab). No need to type https:// — we add it automatically.')}</p>
          </div>

          {/* Advertiser contact */}
          <div>
            <label className={labelCls}>{t('admin:adBanners.advertiserContact', 'Advertiser Contact')}</label>
            <input
              type="text"
              value={formData.advertiserContact}
              onChange={(e) => set('advertiserContact', e.target.value)}
              className={inputCls}
              placeholder={t('admin:adBanners.contactPlaceholder', 'Email or phone')}
            />
            <p className={hintCls}>{t('admin:adBanners.contactHint', 'For your billing records only — never shown publicly.')}</p>
          </div>

          {/* Placement + Page */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('admin:adBanners.placement', 'Placement')} *</label>
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
              <p className={hintCls}>{t('admin:adBanners.placementHint', 'Where on the page the banner sits.')}</p>
            </div>
            <div>
              <label className={labelCls}>{t('admin:adBanners.page', 'Target Page')} *</label>
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
              <p className={hintCls}>{t('admin:adBanners.pageHint', 'Which page(s) show it. "All Pages" shows everywhere.')}</p>
            </div>
          </div>

          {/* Live location preview */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-sm font-medium text-gray-700">{t('admin:adBanners.whereItShows', 'Where it shows')}</label>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {t('admin:adBanners.viewOnSite', 'View on site')}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <path d="M15 3h6v6" />
                  <path d="M10 14L21 3" />
                </svg>
              </a>
            </div>
            <AdLocationPreview page={formData.page} placement={formData.placement} />
            <p className={hintCls}>
              {t('admin:adBanners.viewOnSiteHint', 'Opens the page in a new tab with the ad slot highlighted so you can see exactly how it looks.')}
            </p>
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
              <p className={hintCls}>{t('admin:adBanners.categoryHint', 'Group by pricing tier.')}</p>
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
              <p className={hintCls}>{t('admin:adBanners.priceHint', 'For your records only.')}</p>
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

          {/* Schedule + order */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>{t('admin:adBanners.startDate', 'Start Date')}</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                className={inputCls}
              />
              <p className={hintCls}>{t('admin:adBanners.startHint', 'Optional — hidden before this date.')}</p>
            </div>
            <div>
              <label className={labelCls}>{t('admin:adBanners.endDate', 'End Date')}</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                className={inputCls}
              />
              <p className={hintCls}>{t('admin:adBanners.endHint', 'Optional — hidden after this date.')}</p>
            </div>
            <div>
              <label className={labelCls}>{t('admin:adBanners.order', 'Order')}</label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => set('order', Number(e.target.value))}
                className={inputCls}
              />
              <p className={hintCls}>{t('admin:adBanners.orderHint', 'Lower shows first. Home rails: 0 = left, 1 = right.')}</p>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap items-start gap-6 rounded-lg bg-gray-50 border border-gray-200 p-4">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="block text-sm font-medium text-gray-700">{t('admin:adBanners.activeLabel', 'Active')}</span>
                <span className="block text-xs text-gray-400">{t('admin:adBanners.activeHint', 'Uncheck to hide without deleting.')}</span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isSticky}
                onChange={(e) => set('isSticky', e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="block text-sm font-medium text-gray-700">{t('admin:adBanners.stickyLabel', 'Sticky')}</span>
                <span className="block text-xs text-gray-400">{t('admin:adBanners.stickyHint', 'Only affects the sticky bar placements.')}</span>
              </span>
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
