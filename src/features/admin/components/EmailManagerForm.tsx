import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PaperAirplaneIcon,
  XMarkIcon,
} from '@/constants';
import { EmailConfig } from '../hooks/useEmailConfigData';
import { sanitizeHtml } from '@/src/shared/utils/sanitize';

// ============================================================================
// Edit Email Modal
// ============================================================================

interface EditEmailModalProps {
  selectedEmail: EmailConfig;
  editForm: Partial<EmailConfig>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<EmailConfig>>>;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
}

export const EditEmailModal: React.FC<EditEmailModalProps> = ({
  selectedEmail,
  editForm,
  setEditForm,
  onSave,
  onClose,
  isSaving,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('admin:emailManager.editEmailTemplate')}</h2>
            <p className="text-sm text-gray-500">{selectedEmail.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:emailManager.subjectLine')}
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
              {t('admin:emailManager.preheaderText')}
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
                {t('admin:emailManager.headerTitle')}
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
                {t('admin:emailManager.headerEmoji')}
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
                {t('admin:emailManager.headerSubtitle')}
              </label>
              <input
                type="text"
                value={editForm.headerSubtitle || ''}
                onChange={(e) => setEditForm({ ...editForm, headerSubtitle: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Header Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Header Image URL (optional, replaces emoji)
            </label>
            <input
              type="text"
              value={editForm.headerImageUrl || ''}
              onChange={(e) => setEditForm({ ...editForm, headerImageUrl: e.target.value })}
              placeholder="https://... (leave empty to use emoji)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {editForm.headerImageUrl && (
              <div className="mt-2 bg-gray-100 rounded-lg p-3 inline-block">
                <img src={editForm.headerImageUrl} alt="Header" className="max-h-12 max-w-40" />
              </div>
            )}
          </div>

          {/* Body Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:emailManager.bodyTemplate')}
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
                {t('admin:emailManager.enableCta')}
              </label>
            </div>

            {editForm.ctaEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:emailManager.buttonText')}
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
                    {t('admin:emailManager.buttonUrl')}
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
                {t('admin:emailManager.showUnsubscribe')}
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:emailManager.footerReasonText')}
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
            <h4 className="font-medium text-gray-700 mb-2">{t('admin:emailManager.availableVariables')}</h4>
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
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            {t('common:cancel')}
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('common:saving')}
              </>
            ) : (
              t('common:saveChanges')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Preview Email Modal
// ============================================================================

interface PreviewEmailModalProps {
  previewSubject: string;
  previewHtml: string;
  onClose: () => void;
}

export const PreviewEmailModal: React.FC<PreviewEmailModalProps> = ({
  previewSubject,
  previewHtml,
  onClose,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  const [previewMode, setPreviewMode] = React.useState<'light' | 'dark'>('light');
  const [deviceView, setDeviceView] = React.useState<'desktop' | 'mobile'>('desktop');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('admin:emailManager.emailPreview')}</h2>
            <p className="text-sm text-gray-500">Subject: {previewSubject}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Device toggle */}
            <div className="flex items-center bg-gray-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setDeviceView('desktop')}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  deviceView === 'desktop'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setDeviceView('mobile')}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  deviceView === 'mobile'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Mobile
              </button>
            </div>

            {/* Light/Dark toggle */}
            <div className="flex items-center bg-gray-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setPreviewMode('light')}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  previewMode === 'light'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Light
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('dark')}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  previewMode === 'dark'
                    ? 'bg-gray-800 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Dark
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto p-4 transition-colors ${
          previewMode === 'dark' ? 'bg-gray-900' : 'bg-gray-100'
        }`}>
          <div
            className={`mx-auto shadow-lg transition-all ${
              previewMode === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}
            style={{ maxWidth: deviceView === 'mobile' ? '375px' : '600px' }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }}
          />
          <p className={`text-center text-xs mt-3 ${
            previewMode === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`}>
            {previewMode === 'dark'
              ? 'Dark mode preview simulates how the email appears in dark email clients'
              : 'Light mode shows the standard email appearance'}
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Test Email Modal
// ============================================================================

interface TestEmailModalProps {
  selectedEmail: EmailConfig;
  testEmail: string;
  setTestEmail: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
  isSending: boolean;
}

export const TestEmailModal: React.FC<TestEmailModalProps> = ({
  selectedEmail,
  testEmail,
  setTestEmail,
  onSend,
  onClose,
  isSending,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('admin:emailManager.sendTestEmail')}</h2>
            <p className="text-sm text-gray-500">{selectedEmail.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:emailManager.recipientEmail')}
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
            {t('admin:emailManager.testEmailDesc')}
          </p>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            {t('common:cancel')}
          </button>
          <button
            onClick={onSend}
            disabled={isSending || !testEmail}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('admin:emailManager.sending')}
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-4 h-4" />
                {t('admin:emailManager.sendTest')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
