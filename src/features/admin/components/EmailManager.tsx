import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  EnvelopeIcon,
  PencilIcon,
  EyeIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
} from '@/constants';
import { useEmailManager } from './useEmailManager';
import { EditEmailModal, PreviewEmailModal, TestEmailModal } from './EmailManagerForm';

// Category colors for visual differentiation
const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  transactional: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  marketing: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  alerts: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  notifications: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  reports: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

const fromCategoryLabels: Record<string, string> = {
  noreply: 'No Reply',
  alerts: 'Alerts',
  support: 'Support',
  inquiries: 'Inquiries',
};

const EmailManager: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedStatus,
    setSelectedStatus,
    selectedEmail,
    setSelectedEmail,
    isEditModalOpen,
    setIsEditModalOpen,
    isPreviewModalOpen,
    setIsPreviewModalOpen,
    isTestModalOpen,
    setIsTestModalOpen,
    previewHtml,
    setPreviewHtml,
    previewSubject,
    testEmail,
    setTestEmail,
    editForm,
    setEditForm,
    isLoading,
    error,
    refetch,
    isRefetching,
    updateMutation,
    toggleMutation,
    resetMutation,
    resetAllMutation,
    sendTestMutation,
    previewMutation,
    filteredEmails,
    groupedEmails,
    categoryStats,
    handleOpenEdit,
    handleSaveEdit,
    handleToggleStatus,
    handleReset,
    handleResetAll,
    handlePreview,
    handleOpenTestModal,
    handleSendTest,
  } = useEmailManager();
  const { t } = useTranslation(['admin', 'common']);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {t('admin:emailManager.failedToLoad')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin:emailManager.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('admin:emailManager.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 flex items-center gap-2 transition-colors"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {t('admin:emailManager.refresh')}
          </button>
          <button
            onClick={handleResetAll}
            disabled={resetAllMutation.isPending}
            className="px-3 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 flex items-center gap-2 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            {t('admin:emailManager.resetAll')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('admin:emailManager.searchEmails')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[160px]"
            >
              <option value="all">{t('admin:emailManager.allCategories')}</option>
              <option value="transactional">{t('admin:emailManager.transactional')}</option>
              <option value="marketing">{t('admin:emailManager.marketing')}</option>
              <option value="alerts">{t('admin:emailManager.alerts')}</option>
              <option value="notifications">{t('admin:emailManager.notifications')}</option>
              <option value="reports">{t('admin:emailManager.reports')}</option>
            </select>
            <ChevronDownIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[140px]"
            >
              <option value="all">{t('admin:emailManager.allStatus')}</option>
              <option value="true">{t('admin:emailManager.active')}</option>
              <option value="false">{t('admin:emailManager.inactive')}</option>
            </select>
            <ChevronDownIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Category Stats */}
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.entries(categoryStats).map(([category, count]) => (
            <span
              key={category}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                categoryColors[category]?.bg || 'bg-gray-50'
              } ${categoryColors[category]?.text || 'text-gray-700'}`}
            >
              {category}: {count}
            </span>
          ))}
        </div>
      </div>

      {/* Email List by Category */}
      <div className="space-y-6">
        {Object.entries(groupedEmails).map(([category, categoryEmails]) => (
          <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div
              className={`px-4 py-3 border-b ${
                categoryColors[category]?.bg || 'bg-gray-50'
              } ${categoryColors[category]?.border || 'border-gray-200'}`}
            >
              <h2 className={`font-semibold capitalize ${categoryColors[category]?.text || 'text-gray-700'}`}>
                {category} ({categoryEmails.length})
              </h2>
            </div>

            <div className="divide-y divide-gray-100">
              {categoryEmails.map((email) => (
                <div
                  key={email.key}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{email.headerEmoji || '📧'}</span>
                        <h3 className="font-medium text-gray-900">{email.name}</h3>
                        {email.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircleIcon className="w-3 h-3 mr-1" />
                            {t('admin:emailManager.active')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                            <XCircleIcon className="w-3 h-3 mr-1" />
                            {t('admin:emailManager.inactive')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{email.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>Key: <code className="bg-gray-100 px-1 rounded">{email.key}</code></span>
                        <span>From: {fromCategoryLabels[email.fromCategory]}</span>
                        <span>Subject: {email.subject.substring(0, 50)}...</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handlePreview(email)}
                        disabled={previewMutation.isPending}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleOpenTestModal(email)}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Send Test"
                      >
                        <PaperAirplaneIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(email)}
                        className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(email)}
                        disabled={toggleMutation.isPending}
                        className={`p-2 rounded-lg transition-colors ${
                          email.isActive
                            ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                            : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={email.isActive ? 'Disable' : 'Enable'}
                      >
                        {email.isActive ? (
                          <XCircleIcon className="w-5 h-5" />
                        ) : (
                          <CheckCircleIcon className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleReset(email)}
                        disabled={resetMutation.isPending}
                        className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Reset to Default"
                      >
                        <ArrowPathIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredEmails.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <EnvelopeIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">{t('admin:emailManager.noEmailsFound')}</p>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedEmail && (
        <EditEmailModal
          selectedEmail={selectedEmail}
          editForm={editForm}
          setEditForm={setEditForm}
          onSave={handleSaveEdit}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEmail(null);
          }}
          isSaving={updateMutation.isPending}
        />
      )}

      {/* Preview Modal */}
      {isPreviewModalOpen && (
        <PreviewEmailModal
          previewSubject={previewSubject}
          previewHtml={previewHtml}
          onClose={() => {
            setIsPreviewModalOpen(false);
            setPreviewHtml('');
          }}
        />
      )}

      {/* Test Email Modal */}
      {isTestModalOpen && selectedEmail && (
        <TestEmailModal
          selectedEmail={selectedEmail}
          testEmail={testEmail}
          setTestEmail={setTestEmail}
          onSend={handleSendTest}
          onClose={() => {
            setIsTestModalOpen(false);
            setSelectedEmail(null);
          }}
          isSending={sendTestMutation.isPending}
        />
      )}
    </div>
  );
};

export default EmailManager;
