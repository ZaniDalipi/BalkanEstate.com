import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlayCircleIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
} from '@/constants';
import { useHowItWorksManager, SUBSECTIONS, CATEGORIES, convertToYouTubeEmbedUrl, isYouTubeUrl } from './useHowItWorksManager';
import HowItWorksManagerForm from './HowItWorksManagerForm';

const HowItWorksManager: React.FC = () => {
  const { t } = useTranslation(['admin']);

  const {
    content,
    filteredContent,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    showModal,
    setShowModal,
    editingItem,
    formData,
    setFormData,
    isUploading,
    uploadProgress,
    fileInputRef,
    handleFileUpload,
    handleSubmit,
    handleDelete,
    handleToggleActive,
    openEditModal,
    openAddModal,
    addStep,
    updateStep,
    removeStep,
    moveStep,
    addFAQ,
    updateFAQ,
    removeFAQ,
    addFeature,
    updateFeature,
    removeFeature,
  } = useHowItWorksManager();

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'guide': return <BookOpenIcon className="w-5 h-5" />;
      case 'faq': return <QuestionMarkCircleIcon className="w-5 h-5" />;
      case 'feature': return <SparklesIcon className="w-5 h-5" />;
      default: return <PlayCircleIcon className="w-5 h-5" />;
    }
  };

  const getContentTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'guide': return 'bg-emerald-100 text-emerald-700';
      case 'faq': return 'bg-purple-100 text-purple-700';
      case 'feature': return 'bg-amber-100 text-amber-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin:howItWorks.title')}</h1>
          <p className="text-gray-600 mt-1">{t('admin:howItWorks.subtitle')}</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          {t('admin:howItWorks.addContent')}
        </button>
      </div>

      {/* Content Type Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all', label: t('admin:howItWorks.tabs.all'), count: content.length },
          { id: 'video', label: t('admin:howItWorks.tabs.videos'), count: content.filter(c => c.contentType === 'video' || !c.contentType).length },
          { id: 'guide', label: t('admin:howItWorks.tabs.guides'), count: content.filter(c => c.contentType === 'guide').length },
          { id: 'faq', label: t('admin:howItWorks.tabs.faqs'), count: content.filter(c => c.contentType === 'faq').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Content grouped by subsection */}
      {SUBSECTIONS.map((subsection) => {
        const items = filteredContent.filter((item) => item.subsection === subsection.id);
        if (items.length === 0) return null;

        return (
          <div key={subsection.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{subsection.label}</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                  <div
                    key={item._id}
                    className={`relative rounded-xl overflow-hidden border ${
                      item.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    {/* Content preview */}
                    <div className="aspect-video bg-gray-100 relative">
                      {item.contentType === 'video' || !item.contentType ? (
                        item.url && isYouTubeUrl(item.url) ? (
                          <iframe
                            src={convertToYouTubeEmbedUrl(item.url)}
                            className="w-full h-full"
                            title={item.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <>
                            <video
                              src={item.url}
                              className="w-full h-full object-cover"
                              muted
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <PlayCircleIcon className="w-12 h-12 text-white" />
                            </div>
                          </>
                        )
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                          {getContentTypeIcon(item.contentType)}
                          <span className="mt-2 text-sm font-medium text-gray-600 capitalize">
                            {item.contentType}
                          </span>
                          {item.contentType === 'guide' && item.steps && (
                            <span className="text-xs text-gray-500">{t('admin:howItWorks.steps', { count: item.steps.length })}</span>
                          )}
                          {item.contentType === 'faq' && item.faqs && (
                            <span className="text-xs text-gray-500">{t('admin:howItWorks.questions', { count: item.faqs.length })}</span>
                          )}
                        </div>
                      )}

                      {/* Content type badge */}
                      <div className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded ${getContentTypeBadgeColor(item.contentType || 'video')}`}>
                        {item.contentType || 'video'}
                      </div>

                      {!item.isActive && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs rounded">
                          {t('admin:howItWorks.inactive')}
                        </div>
                      )}
                    </div>

                    {/* Content info */}
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                      <p className="text-sm text-gray-500 truncate">{item.key}</p>
                      {item.category && (
                        <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {CATEGORIES.find(c => c.id === item.category)?.label || item.category}
                        </span>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`p-2 rounded-lg transition-colors ${
                            item.isActive
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={item.isActive ? t('admin:howItWorks.deactivate') : t('admin:howItWorks.activate')}
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
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {filteredContent.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <BookOpenIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('admin:howItWorks.noContent')}</h3>
          <p className="text-gray-500 mb-4">{t('admin:howItWorks.noContentDesc')}</p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5" />
            {t('admin:howItWorks.addFirstContent')}
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <HowItWorksManagerForm
          editingItem={editingItem}
          formData={formData}
          setFormData={setFormData}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          fileInputRef={fileInputRef}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          onFileUpload={handleFileUpload}
          addStep={addStep}
          updateStep={updateStep}
          removeStep={removeStep}
          moveStep={moveStep}
          addFAQ={addFAQ}
          updateFAQ={updateFAQ}
          removeFAQ={removeFAQ}
          addFeature={addFeature}
          updateFeature={updateFeature}
          removeFeature={removeFeature}
        />
      )}
    </div>
  );
};

export default HowItWorksManager;
