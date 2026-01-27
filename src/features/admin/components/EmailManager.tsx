import React, { useState, useMemo } from 'react';
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
  XMarkIcon,
} from '@/constants';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import {
  useEmailConfigs,
  useUpdateEmailConfig,
  useToggleEmailStatus,
  useResetEmailConfig,
  useResetAllEmailConfigs,
  useSendTestEmail,
  usePreviewEmail,
  EmailConfig,
} from '../hooks/useEmailConfigData';

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
  const { showNotification } = useNotification();
  const { confirm } = useConfirmation();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedEmail, setSelectedEmail] = useState<EmailConfig | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewSubject, setPreviewSubject] = useState<string>('');
  const [testEmail, setTestEmail] = useState('');

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<EmailConfig>>({});

  // React Query hooks
  const {
    data: emailData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useEmailConfigs({
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    isActive: selectedStatus !== 'all' ? selectedStatus : undefined,
    search: searchQuery || undefined,
  });

  const updateMutation = useUpdateEmailConfig();
  const toggleMutation = useToggleEmailStatus();
  const resetMutation = useResetEmailConfig();
  const resetAllMutation = useResetAllEmailConfigs();
  const sendTestMutation = useSendTestEmail();
  const previewMutation = usePreviewEmail();

  const emails = emailData?.configs || [];
  const categoryStats = emailData?.categoryStats || {};

  // Filter emails locally for instant feedback
  const filteredEmails = useMemo(() => {
    return emails;
  }, [emails]);

  // Group emails by category
  const groupedEmails = useMemo(() => {
    const groups: Record<string, EmailConfig[]> = {};
    filteredEmails.forEach((email) => {
      if (!groups[email.category]) {
        groups[email.category] = [];
      }
      groups[email.category].push(email);
    });
    return groups;
  }, [filteredEmails]);

  // Handlers
  const handleOpenEdit = (email: EmailConfig) => {
    setSelectedEmail(email);
    setEditForm({
      subject: email.subject,
      preheaderText: email.preheaderText,
      headerTitle: email.headerTitle,
      headerSubtitle: email.headerSubtitle,
      headerEmoji: email.headerEmoji,
      headerGradient: email.headerGradient,
      bodyTemplate: email.bodyTemplate,
      ctaEnabled: email.ctaEnabled,
      ctaText: email.ctaText,
      ctaUrl: email.ctaUrl,
      showUnsubscribe: email.showUnsubscribe,
      footerReason: email.footerReason,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedEmail) return;

    try {
      await updateMutation.mutateAsync({
        key: selectedEmail.key,
        data: editForm,
      });
      showNotification({
        type: 'success',
        message: 'Email configuration updated successfully',
      });
      setIsEditModalOpen(false);
      setSelectedEmail(null);
    } catch (err: any) {
      showNotification({
        type: 'error',
        message: err.message || 'Failed to update email configuration',
      });
    }
  };

  const handleToggleStatus = async (email: EmailConfig) => {
    const action = email.isActive ? 'disable' : 'enable';
    const confirmed = await confirm({
      title: `${email.isActive ? 'Disable' : 'Enable'} Email`,
      message: `Are you sure you want to ${action} "${email.name}"? ${
        email.isActive
          ? 'This will prevent the system from sending this type of email.'
          : 'This will allow the system to send this type of email.'
      }`,
      confirmText: email.isActive ? 'Disable' : 'Enable',
      variant: email.isActive ? 'danger' : 'primary',
    });

    if (!confirmed) return;

    try {
      await toggleMutation.mutateAsync(email.key);
      showNotification({
        type: 'success',
        message: `Email ${action}d successfully`,
      });
    } catch (err: any) {
      showNotification({
        type: 'error',
        message: err.message || `Failed to ${action} email`,
      });
    }
  };

  const handleReset = async (email: EmailConfig) => {
    const confirmed = await confirm({
      title: 'Reset to Default',
      message: `Are you sure you want to reset "${email.name}" to its default configuration? This will overwrite any customizations you've made.`,
      confirmText: 'Reset',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await resetMutation.mutateAsync(email.key);
      showNotification({
        type: 'success',
        message: 'Email reset to default successfully',
      });
    } catch (err: any) {
      showNotification({
        type: 'error',
        message: err.message || 'Failed to reset email',
      });
    }
  };

  const handleResetAll = async () => {
    const confirmed = await confirm({
      title: 'Reset All Emails',
      message:
        'Are you sure you want to reset ALL email configurations to their defaults? This will overwrite any customizations you\'ve made to any emails.',
      confirmText: 'Reset All',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await resetAllMutation.mutateAsync();
      showNotification({
        type: 'success',
        message: 'All emails reset to defaults successfully',
      });
    } catch (err: any) {
      showNotification({
        type: 'error',
        message: err.message || 'Failed to reset emails',
      });
    }
  };

  const handlePreview = async (email: EmailConfig) => {
    setSelectedEmail(email);
    try {
      const result = await previewMutation.mutateAsync({
        key: email.key,
      });
      setPreviewHtml(result.html);
      setPreviewSubject(result.subject);
      setIsPreviewModalOpen(true);
    } catch (err: any) {
      showNotification({
        type: 'error',
        message: err.message || 'Failed to generate preview',
      });
    }
  };

  const handleOpenTestModal = (email: EmailConfig) => {
    setSelectedEmail(email);
    setTestEmail('');
    setIsTestModalOpen(true);
  };

  const handleSendTest = async () => {
    if (!selectedEmail || !testEmail) return;

    try {
      await sendTestMutation.mutateAsync({
        key: selectedEmail.key,
        testEmail,
      });
      showNotification({
        type: 'success',
        message: `Test email sent to ${testEmail}`,
      });
      setIsTestModalOpen(false);
      setSelectedEmail(null);
    } catch (err: any) {
      showNotification({
        type: 'error',
        message: err.message || 'Failed to send test email',
      });
    }
  };

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
        Failed to load email configurations. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Management</h1>
          <p className="text-gray-600 mt-1">
            Configure and manage all system emails
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 flex items-center gap-2 transition-colors"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleResetAll}
            disabled={resetAllMutation.isPending}
            className="px-3 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 flex items-center gap-2 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Reset All
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
              placeholder="Search emails..."
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
              <option value="all">All Categories</option>
              <option value="transactional">Transactional</option>
              <option value="marketing">Marketing</option>
              <option value="alerts">Alerts</option>
              <option value="notifications">Notifications</option>
              <option value="reports">Reports</option>
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
              <option value="all">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
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
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                            <XCircleIcon className="w-3 h-3 mr-1" />
                            Inactive
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
          <p className="text-gray-500">No emails found matching your criteria.</p>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Email Template</h2>
                <p className="text-sm text-gray-500">{selectedEmail.name}</p>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedEmail(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={editForm.subject || ''}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Variables: {selectedEmail.variables.map((v) => `{{${v.name}}}`).join(', ')}
                </p>
              </div>

              {/* Preheader */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preheader Text
                </label>
                <input
                  type="text"
                  value={editForm.preheaderText || ''}
                  onChange={(e) => setEditForm({ ...editForm, preheaderText: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Preview text shown in email clients"
                />
              </div>

              {/* Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Header Title
                  </label>
                  <input
                    type="text"
                    value={editForm.headerTitle || ''}
                    onChange={(e) => setEditForm({ ...editForm, headerTitle: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Header Emoji
                  </label>
                  <input
                    type="text"
                    value={editForm.headerEmoji || ''}
                    onChange={(e) => setEditForm({ ...editForm, headerEmoji: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Header Subtitle
                  </label>
                  <input
                    type="text"
                    value={editForm.headerSubtitle || ''}
                    onChange={(e) => setEditForm({ ...editForm, headerSubtitle: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Body Template */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Body Template (HTML)
                </label>
                <textarea
                  value={editForm.bodyTemplate || ''}
                  onChange={(e) => setEditForm({ ...editForm, bodyTemplate: e.target.value })}
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              {/* CTA Button */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ctaEnabled"
                    checked={editForm.ctaEnabled || false}
                    onChange={(e) => setEditForm({ ...editForm, ctaEnabled: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="ctaEnabled" className="text-sm font-medium text-gray-700">
                    Enable Call-to-Action Button
                  </label>
                </div>

                {editForm.ctaEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Button Text
                      </label>
                      <input
                        type="text"
                        value={editForm.ctaText || ''}
                        onChange={(e) => setEditForm({ ...editForm, ctaText: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Button URL
                      </label>
                      <input
                        type="text"
                        value={editForm.ctaUrl || ''}
                        onChange={(e) => setEditForm({ ...editForm, ctaUrl: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showUnsubscribe"
                    checked={editForm.showUnsubscribe || false}
                    onChange={(e) => setEditForm({ ...editForm, showUnsubscribe: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="showUnsubscribe" className="text-sm font-medium text-gray-700">
                    Show Unsubscribe Link
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Footer Reason Text
                  </label>
                  <input
                    type="text"
                    value={editForm.footerReason || ''}
                    onChange={(e) => setEditForm({ ...editForm, footerReason: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., You received this because..."
                  />
                </div>
              </div>

              {/* Available Variables */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-2">Available Variables</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedEmail.variables.map((v) => (
                    <span
                      key={v.name}
                      className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono"
                      title={`${v.description} (e.g., ${v.example})`}
                    >
                      {`{{${v.name}}}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedEmail(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {updateMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Email Preview</h2>
                <p className="text-sm text-gray-500">Subject: {previewSubject}</p>
              </div>
              <button
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  setPreviewHtml('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
              <div
                className="bg-white mx-auto shadow-lg"
                style={{ maxWidth: '600px' }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Test Email Modal */}
      {isTestModalOpen && selectedEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Send Test Email</h2>
                <p className="text-sm text-gray-500">{selectedEmail.name}</p>
              </div>
              <button
                onClick={() => {
                  setIsTestModalOpen(false);
                  setSelectedEmail(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <p className="text-sm text-gray-500">
                A test email will be sent using example values for all variables.
                The subject will be prefixed with "[TEST]".
              </p>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsTestModalOpen(false);
                  setSelectedEmail(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTest}
                disabled={sendTestMutation.isPending || !testEmail}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {sendTestMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-4 h-4" />
                    Send Test
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailManager;
