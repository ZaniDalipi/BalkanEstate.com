import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  PhotoIcon,
} from '@/constants';
import {
  useSiteSettings,
  useUpdateSiteSettings,
  useResetSiteSettings,
  useUploadSiteLogo,
  useUploadEmailLogo,
  type SiteSettings,
  type SocialLinks,
  type EmailBrandColors,
  type EmailFooterLink,
} from '../hooks/useSiteSettingsData';

type TabId = 'branding' | 'contact' | 'urls' | 'social' | 'email' | 'seo';

// ============================================================================
// Logo Upload Component
// ============================================================================

interface LogoUploadProps {
  currentUrl: string;
  onUpload: (file: File) => void;
  onUrlChange: (url: string) => void;
  isUploading: boolean;
  label: string;
  previewBg?: 'light' | 'dark';
  maxSizeLabel?: string;
}

const LogoUpload: React.FC<LogoUploadProps> = ({
  currentUrl,
  onUpload,
  onUrlChange,
  isUploading,
  label,
  previewBg = 'light',
  maxSizeLabel = '5MB max, PNG/JPG/WebP',
}) => {
  const { t } = useTranslation(['admin']);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [currentUrl]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    onUpload(file);
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const hasLogo = currentUrl && !imgError;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : isUploading
              ? 'border-gray-300 bg-gray-50 cursor-wait'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
            <p className="text-sm text-gray-500">{t('admin:siteSettings.uploading')}</p>
          </div>
        ) : hasLogo ? (
          <div className="p-4">
            <div className={`flex items-center justify-center rounded-lg p-6 ${
              previewBg === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              <img
                src={currentUrl}
                alt={label}
                className="max-h-20 max-w-full object-contain"
                onError={() => setImgError(true)}
              />
            </div>
            <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-500">
              <CloudArrowUpIcon className="w-4 h-4" />
              <span>{t('admin:siteSettings.clickOrDragToReplace')}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <PhotoIcon className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              {t('admin:siteSettings.clickOrDragToUpload')}
            </p>
            <p className="text-xs text-gray-500">{maxSizeLabel}</p>
          </div>
        )}
      </div>

      {/* Toggle URL input */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {showUrlInput ? t('admin:siteSettings.hideUrlInput') : t('admin:siteSettings.useUrlInstead')}
        </button>
      </div>

      {showUrlInput && (
        <input
          type="url"
          value={currentUrl || ''}
          onChange={e => onUrlChange(e.target.value)}
          placeholder="https://example.com/logo.png"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      )}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const SiteSettingsManager: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const { data, isLoading, error } = useSiteSettings();
  const updateMutation = useUpdateSiteSettings();
  const resetMutation = useResetSiteSettings();
  const uploadLogoMutation = useUploadSiteLogo();
  const uploadEmailLogoMutation = useUploadEmailLogo();

  const [activeTab, setActiveTab] = useState<TabId>('branding');
  const [form, setForm] = useState<Partial<SiteSettings>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'branding', label: t('admin:siteSettings.tabs.branding'), icon: '🎨' },
    { id: 'contact', label: t('admin:siteSettings.tabs.contact'), icon: '📧' },
    { id: 'urls', label: t('admin:siteSettings.tabs.urls'), icon: '🔗' },
    { id: 'social', label: t('admin:siteSettings.tabs.social'), icon: '📱' },
    { id: 'email', label: t('admin:siteSettings.tabs.email'), icon: '✉️' },
    { id: 'seo', label: t('admin:siteSettings.tabs.seo'), icon: '🔍' },
  ];

  // Populate form when data loads
  useEffect(() => {
    if (data?.settings) {
      setForm(data.settings);
      setIsDirty(false);
    }
  }, [data]);

  // Clear save message after 4 seconds
  useEffect(() => {
    if (saveMessage) {
      const timeout = setTimeout(() => setSaveMessage(null), 4000);
      return () => clearTimeout(timeout);
    }
  }, [saveMessage]);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const updateNestedField = (parent: string, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [parent]: { ...(prev as any)[parent], [field]: value },
    }));
    setIsDirty(true);
  };

  const updateFooterLink = (index: number, field: 'label' | 'url', value: string) => {
    const links = [...(form.emailFooterLinks || [])];
    links[index] = { ...links[index], [field]: value };
    setForm(prev => ({ ...prev, emailFooterLinks: links }));
    setIsDirty(true);
  };

  const addFooterLink = () => {
    const links = [...(form.emailFooterLinks || []), { label: '', url: '' }];
    setForm(prev => ({ ...prev, emailFooterLinks: links }));
    setIsDirty(true);
  };

  const removeFooterLink = (index: number) => {
    const links = (form.emailFooterLinks || []).filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, emailFooterLinks: links }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(form);
      setSaveMessage({ type: 'success', text: t('admin:siteSettings.savedSuccess') });
      setIsDirty(false);
    } catch {
      setSaveMessage({ type: 'error', text: t('admin:siteSettings.saveFailed') });
    }
  };

  const handleReset = async () => {
    if (!window.confirm(t('admin:siteSettings.resetConfirm'))) return;
    try {
      await resetMutation.mutateAsync();
      setSaveMessage({ type: 'success', text: t('admin:siteSettings.resetSuccess') });
      setIsDirty(false);
    } catch {
      setSaveMessage({ type: 'error', text: t('admin:siteSettings.resetFailed') });
    }
  };

  const handleLogoUpload = async (file: File) => {
    try {
      const result = await uploadLogoMutation.mutateAsync(file);
      setForm(prev => ({
        ...prev,
        logoUrl: result.uploadResult.url,
        logoPublicId: result.uploadResult.publicId,
      }));
      setSaveMessage({ type: 'success', text: t('admin:siteSettings.logoUploadSuccess') });
    } catch {
      setSaveMessage({ type: 'error', text: t('admin:siteSettings.logoUploadFailed') });
    }
  };

  const handleEmailLogoUpload = async (file: File) => {
    try {
      const result = await uploadEmailLogoMutation.mutateAsync(file);
      setForm(prev => ({
        ...prev,
        emailLogoUrl: result.uploadResult.url,
        emailLogoPublicId: result.uploadResult.publicId,
      }));
      setSaveMessage({ type: 'success', text: t('admin:siteSettings.logoUploadSuccess') });
    } catch {
      setSaveMessage({ type: 'error', text: t('admin:siteSettings.logoUploadFailed') });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {t('admin:siteSettings.loadFailed')}
      </div>
    );
  }

  const renderField = (label: string, field: string, placeholder: string = '', type: string = 'text', description?: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {description && (
        <p className="text-xs text-gray-500 mb-1.5">{description}</p>
      )}
      <input
        type={type}
        value={(form as any)[field] || ''}
        onChange={e => updateField(field, e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
      />
    </div>
  );

  const renderTextarea = (label: string, field: string, rows: number = 3, description?: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {description && (
        <p className="text-xs text-gray-500 mb-1.5">{description}</p>
      )}
      <textarea
        value={(form as any)[field] || ''}
        onChange={e => updateField(field, e.target.value)}
        rows={rows}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
      />
    </div>
  );

  const renderColorField = (label: string, parent: string, field: string) => (
    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
      <input
        type="color"
        value={(form as any)[parent]?.[field] || '#000000'}
        onChange={e => updateNestedField(parent, field, e.target.value)}
        className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
      />
      <div className="flex-1 min-w-0">
        <label className="block text-xs font-medium text-gray-600 mb-0.5">{label}</label>
        <input
          type="text"
          value={(form as any)[parent]?.[field] || ''}
          onChange={e => updateNestedField(parent, field, e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono bg-white"
        />
      </div>
    </div>
  );

  const renderSocialField = (label: string, field: string, placeholder: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="url"
        value={(form.socialLinks as any)?.[field] || ''}
        onChange={e => updateNestedField('socialLinks', field, e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin:siteSettings.title')}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {t('admin:siteSettings.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4 inline mr-1.5" />
            {t('admin:siteSettings.resetToDefaults')}
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || updateMutation.isPending}
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {updateMutation.isPending ? t('admin:siteSettings.saving') : t('admin:siteSettings.saveChanges')}
          </button>
        </div>
      </div>

      {/* Save message */}
      {saveMessage && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
          saveMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {saveMessage.type === 'success'
            ? <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
            : <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />}
          {saveMessage.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <div className="p-6 space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('admin:siteSettings.branding.title')}</h2>
              <p className="text-sm text-gray-500">{t('admin:siteSettings.branding.description')}</p>
            </div>

            {/* Logo Upload Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <LogoUpload
                currentUrl={form.logoUrl || ''}
                onUpload={handleLogoUpload}
                onUrlChange={url => updateField('logoUrl', url)}
                isUploading={uploadLogoMutation.isPending}
                label={t('admin:siteSettings.branding.siteLogo')}
                previewBg="light"
              />

              <div className="space-y-6">
                {renderField(
                  t('admin:siteSettings.branding.companyName'),
                  'companyName',
                  'BalkanEstate',
                  'text',
                  t('admin:siteSettings.branding.companyNameDesc')
                )}
                {renderField(
                  t('admin:siteSettings.branding.companyNameFormatted'),
                  'companyNameFormatted',
                  'BalkanEstate<sup>AI</sup>',
                  'text',
                  t('admin:siteSettings.branding.companyNameFormattedDesc')
                )}
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Favicon */}
            <div className="max-w-md">
              {renderField(
                t('admin:siteSettings.branding.faviconUrl'),
                'faviconUrl',
                '/icons/favicon.png',
                'text',
                t('admin:siteSettings.branding.faviconDesc')
              )}
              {form.faviconUrl && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                    <img
                      src={form.faviconUrl}
                      alt="Favicon"
                      className="w-6 h-6 object-contain"
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{t('admin:siteSettings.branding.faviconPreview')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('admin:siteSettings.contact.title')}</h2>
              <p className="text-sm text-gray-500">{t('admin:siteSettings.contact.description')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderField(t('admin:siteSettings.contact.supportEmail'), 'supportEmail', 'support@example.com', 'email')}
              {renderField(t('admin:siteSettings.contact.noReplyEmail'), 'noReplyEmail', 'noreply@example.com', 'email')}
              {renderField(t('admin:siteSettings.contact.alertsEmail'), 'alertsEmail', 'alerts@example.com', 'email')}
              {renderField(t('admin:siteSettings.contact.inquiriesEmail'), 'inquiriesEmail', 'inquiries@example.com', 'email')}
              {renderField(t('admin:siteSettings.contact.contactPhone'), 'contactPhone', '+1 234 567 890', 'tel')}
            </div>
          </div>
        )}

        {/* URLs Tab */}
        {activeTab === 'urls' && (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('admin:siteSettings.urls.title')}</h2>
              <p className="text-sm text-gray-500">{t('admin:siteSettings.urls.description')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderField(t('admin:siteSettings.urls.frontendUrl'), 'frontendUrl', 'https://balkanestate.com')}
              {renderField(t('admin:siteSettings.urls.backendUrl'), 'backendUrl', 'https://api.balkanestate.com')}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                {t('admin:siteSettings.urls.urlsNote')}
              </p>
            </div>
          </div>
        )}

        {/* Social Media Tab */}
        {activeTab === 'social' && (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('admin:siteSettings.social.title')}</h2>
              <p className="text-sm text-gray-500">{t('admin:siteSettings.social.description')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderSocialField(t('admin:siteSettings.social.facebook'), 'facebook', 'https://facebook.com/...')}
              {renderSocialField(t('admin:siteSettings.social.instagram'), 'instagram', 'https://instagram.com/...')}
              {renderSocialField(t('admin:siteSettings.social.twitter'), 'twitter', 'https://twitter.com/...')}
              {renderSocialField(t('admin:siteSettings.social.linkedin'), 'linkedin', 'https://linkedin.com/...')}
              {renderSocialField(t('admin:siteSettings.social.youtube'), 'youtube', 'https://youtube.com/...')}
            </div>
          </div>
        )}

        {/* Email Branding Tab */}
        {activeTab === 'email' && (
          <div className="p-6 space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('admin:siteSettings.email.title')}</h2>
              <p className="text-sm text-gray-500">{t('admin:siteSettings.email.description')}</p>
            </div>

            {/* Email Logo Upload */}
            <div className="max-w-lg">
              <LogoUpload
                currentUrl={form.emailLogoUrl || ''}
                onUpload={handleEmailLogoUpload}
                onUrlChange={url => updateField('emailLogoUrl', url)}
                isUploading={uploadEmailLogoMutation.isPending}
                label={t('admin:siteSettings.email.emailLogo')}
                previewBg="dark"
              />
            </div>

            <hr className="border-gray-200" />

            {/* Brand Colors */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">{t('admin:siteSettings.email.brandColors')}</h3>
              <p className="text-xs text-gray-500 mb-4">{t('admin:siteSettings.email.brandColorsDesc')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {renderColorField(t('admin:siteSettings.email.colorPrimary'), 'emailBrandColors', 'primary')}
                {renderColorField(t('admin:siteSettings.email.colorPrimaryDark'), 'emailBrandColors', 'primaryDark')}
                {renderColorField(t('admin:siteSettings.email.colorAccent'), 'emailBrandColors', 'accent')}
                {renderColorField(t('admin:siteSettings.email.colorText'), 'emailBrandColors', 'text')}
                {renderColorField(t('admin:siteSettings.email.colorTextMuted'), 'emailBrandColors', 'textMuted')}
                {renderColorField(t('admin:siteSettings.email.colorBackground'), 'emailBrandColors', 'background')}
                {renderColorField(t('admin:siteSettings.email.colorBackgroundAlt'), 'emailBrandColors', 'backgroundAlt')}
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Footer */}
            <div className="space-y-6">
              {renderField(t('admin:siteSettings.email.emailFooterText'), 'emailFooterText', 'All rights reserved.')}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">{t('admin:siteSettings.email.footerLinks')}</h3>
                  <button
                    onClick={addFooterLink}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    {t('admin:siteSettings.email.addLink')}
                  </button>
                </div>
                <div className="space-y-3">
                  {(form.emailFooterLinks || []).map((link: EmailFooterLink, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="text"
                        value={link.label}
                        onChange={e => updateFooterLink(idx, 'label', e.target.value)}
                        placeholder={t('admin:siteSettings.email.labelPlaceholder')}
                        className="w-44 px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={e => updateFooterLink(idx, 'url', e.target.value)}
                        placeholder="https://..."
                        className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => removeFooterLink(idx)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                      >
                        {t('admin:siteSettings.email.remove')}
                      </button>
                    </div>
                  ))}
                  {(form.emailFooterLinks || []).length === 0 && (
                    <p className="text-sm text-gray-400 italic">{t('admin:siteSettings.email.noLinks')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SEO Tab */}
        {activeTab === 'seo' && (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('admin:siteSettings.seo.title')}</h2>
              <p className="text-sm text-gray-500">{t('admin:siteSettings.seo.description')}</p>
            </div>
            {renderField(
              t('admin:siteSettings.seo.siteTitle'),
              'siteTitle',
              'BalkanEstate - Find Your Dream Property',
              'text',
              t('admin:siteSettings.seo.siteTitleDesc')
            )}
            {renderTextarea(
              t('admin:siteSettings.seo.siteDescription'),
              'siteDescription',
              3,
              t('admin:siteSettings.seo.siteDescriptionDesc')
            )}

            {/* SEO Preview */}
            {(form.siteTitle || form.siteDescription) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('admin:siteSettings.seo.previewTitle')}</h3>
                <div className="border border-gray-200 rounded-lg p-4 bg-white max-w-xl">
                  <p className="text-blue-700 text-lg font-medium leading-tight truncate">
                    {form.siteTitle || 'Page Title'}
                  </p>
                  <p className="text-green-700 text-sm mt-1 truncate">
                    {form.frontendUrl || 'https://balkanestate.com'}
                  </p>
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {form.siteDescription || 'Page description will appear here...'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Available Variables Info */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">{t('admin:siteSettings.emailVars.title')}</h3>
        <p className="text-sm text-gray-500 mb-3">
          {t('admin:siteSettings.emailVars.description')}
        </p>
        <div className="flex flex-wrap gap-2">
          {['companyName', 'companyNameFormatted', 'supportEmail', 'contactPhone', 'frontendUrl', 'backendUrl', 'emailLogoUrl', 'emailFooterText'].map(v => (
            <code key={v} className="px-2.5 py-1 bg-white border border-gray-200 rounded-md text-xs text-blue-700 font-mono shadow-sm">
              {`{{${v}}}`}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SiteSettingsManager;
