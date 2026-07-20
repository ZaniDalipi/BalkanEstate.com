import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhotoIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ArrowTopRightOnSquareIcon,
} from '@/constants';
import { useAdBannerManager, PLACEMENT_OPTIONS, PAGE_OPTIONS } from './useAdBannerManager';
import AdBannerManagerForm from './AdBannerManagerForm';

const placementLabel = (id: string) => PLACEMENT_OPTIONS.find((p) => p.id === id)?.label || id;
const pageLabel = (id: string) => PAGE_OPTIONS.find((p) => p.id === id)?.label || id;

const AdBannerManager: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const {
    banners,
    isLoading,
    error,
    showModal,
    setShowModal,
    editingItem,
    formData,
    setFormData,
    isUploading,
    isSaving,
    fileInputRef,
    handleFileUpload,
    handleSubmit,
    handleDelete,
    handleToggleActive,
    openAddModal,
    openEditModal,
  } = useAdBannerManager();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const activeCount = banners.filter((b) => b.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('admin:adBanners.title', 'Ad Banners')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('admin:adBanners.subtitle', 'Sell banner placements to advertisers across the site.')}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          {t('admin:adBanners.addBanner', 'Add Banner')}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{t('admin:adBanners.total', 'Total')}</p>
          <p className="text-2xl font-bold text-gray-900">{banners.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{t('admin:adBanners.active', 'Active')}</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{t('admin:adBanners.impressions', 'Impressions')}</p>
          <p className="text-2xl font-bold text-gray-900">
            {banners.reduce((sum, b) => sum + (b.impressions || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{t('admin:adBanners.clicks', 'Clicks')}</p>
          <p className="text-2xl font-bold text-gray-900">
            {banners.reduce((sum, b) => sum + (b.clicks || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* List */}
      {banners.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <PhotoIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('admin:adBanners.noBanners', 'No ad banners yet')}
          </h3>
          <p className="text-gray-500 mb-4">
            {t('admin:adBanners.noBannersDesc', 'Create your first banner placement to start earning ad revenue.')}
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5" />
            {t('admin:adBanners.addBanner', 'Add Banner')}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {banners.map((item) => {
              const ctr =
                item.impressions > 0 ? ((item.clicks / item.impressions) * 100).toFixed(1) : '0.0';
              return (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 ${
                    item.isActive ? '' : 'bg-gray-50'
                  }`}
                >
                  {/* Preview */}
                  <div className="w-full sm:w-40 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PhotoIcon className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                      {!item.isActive && (
                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                          {t('admin:adBanners.inactive', 'Inactive')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{item.advertiserName}</p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                        {pageLabel(item.page)}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded">
                        {placementLabel(item.placement)}
                      </span>
                      {item.category && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded capitalize">
                          {item.category}
                        </span>
                      )}
                      {item.price != null && (
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded">
                          {item.price} {item.currency}/mo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1" title={t('admin:adBanners.impressions', 'Impressions')}>
                      <EyeIcon className="w-4 h-4" />
                      {(item.impressions || 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1" title={t('admin:adBanners.clicks', 'Clicks')}>
                      <CursorArrowRaysIcon className="w-4 h-4" />
                      {(item.clicks || 0).toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-400">{ctr}% CTR</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      title={t('admin:adBanners.visitLink', 'Open link')}
                    >
                      <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                    </a>
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`p-2 rounded-lg transition-colors ${
                        item.isActive
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={item.isActive ? t('admin:adBanners.deactivate', 'Deactivate') : t('admin:adBanners.activate', 'Activate')}
                    >
                      {item.isActive ? (
                        <CheckCircleIcon className="w-5 h-5" />
                      ) : (
                        <XCircleIcon className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title={t('admin:adBanners.edit', 'Edit')}
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('admin:adBanners.delete', 'Delete')}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <AdBannerManagerForm
          editingItem={editingItem}
          formData={formData}
          setFormData={setFormData}
          isUploading={isUploading}
          isSaving={isSaving}
          error={error}
          fileInputRef={fileInputRef}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          onFileUpload={handleFileUpload}
        />
      )}
    </div>
  );
};

export default AdBannerManager;
