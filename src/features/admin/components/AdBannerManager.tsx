import React from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  PhotoIcon,
} from '@/constants';
import { useAdBannerManager } from './useAdBannerManager';
import AdBannerManagerForm from './AdBannerManagerForm';
import { PLACEMENTS, PLACEMENT_MAP } from '@/src/features/ads/placements';

const AdBannerManager: React.FC = () => {
  const {
    banners,
    filteredBanners,
    isLoading,
    error,
    placementFilter,
    setPlacementFilter,
    showModal,
    editingItem,
    formData,
    setFormData,
    isUploading,
    isSaving,
    fileInputRef,
    mobileFileInputRef,
    openAddModal,
    openEditModal,
    handleImageUpload,
    handleSubmit,
    handleToggleActive,
    handleDelete,
    setShowModal,
  } = useAdBannerManager();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const ctr = (b: { clicks: number; impressions: number }) =>
    b.impressions > 0 ? ((b.clicks / b.impressions) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ad Banners</h1>
          <p className="text-gray-600 mt-1">
            Sell banner space to other companies. Place ads on different pages, categorize by slot,
            and set your own price per placement.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <PlusIcon className="w-5 h-5" />
          New Banner
        </button>
      </div>

      {/* Placement filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setPlacementFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            placementFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({banners.length})
        </button>
        {PLACEMENTS.map((p) => {
          const count = banners.filter((b) => b.placement === p.id).length;
          if (count === 0) return null;
          return (
            <button
              key={p.id}
              onClick={() => setPlacementFilter(p.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                placementFilter === p.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label} ({count})
            </button>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Banner list */}
      {filteredBanners.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <PhotoIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No banners yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first ad banner to start earning from advertisers.
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5" />
            New Banner
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Banner</th>
                  <th className="px-4 py-3 font-medium">Placement</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Performance</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBanners.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={b.mobileImageUrl || b.imageUrl}
                          alt={b.title}
                          className="w-20 h-11 object-contain bg-gray-50 border border-gray-200 rounded"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-[180px]">{b.title}</p>
                          <p className="text-gray-500 truncate max-w-[180px]">
                            {b.advertiserName || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-gray-700">
                        {PLACEMENT_MAP[b.placement]?.label || b.placement}
                        {b.isSticky && (
                          <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded">
                            sticky
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {b.price != null ? (
                        <span>
                          {b.price} {b.currency}
                          <span className="text-gray-400 text-xs"> /{b.billingPeriod}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-gray-600">
                        <span className="inline-flex items-center gap-1" title="Impressions">
                          <EyeIcon className="w-4 h-4" /> {b.impressions}
                        </span>
                        <span className="inline-flex items-center gap-1" title="Clicks">
                          <CursorArrowRaysIcon className="w-4 h-4" /> {b.clicks}
                        </span>
                        <span className="text-xs text-gray-400">{ctr(b)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(b)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          b.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                        title={b.isActive ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {b.isActive ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
                        {b.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(b)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          fileInputRef={fileInputRef}
          mobileFileInputRef={mobileFileInputRef}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          onImageUpload={handleImageUpload}
        />
      )}
    </div>
  );
};

export default AdBannerManager;
