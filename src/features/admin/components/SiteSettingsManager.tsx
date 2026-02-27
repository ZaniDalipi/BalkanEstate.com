import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@/constants';
import {
  useSiteSettings,
  useUpdateSiteSettings,
  useResetSiteSettings,
  type SiteSettings,
  type SocialLinks,
  type EmailBrandColors,
  type EmailFooterLink,
} from '../hooks/useSiteSettingsData';

type TabId = 'branding' | 'contact' | 'urls' | 'social' | 'email' | 'seo';

const SiteSettingsManager: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const { data, isLoading, error, refetch } = useSiteSettings();
  const updateMutation = useUpdateSiteSettings();
  const resetMutation = useResetSiteSettings();

  const [activeTab, setActiveTab] = useState<TabId>('branding');
  const [form, setForm] = useState<Partial<SiteSettings>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'branding', label: t('admin:siteSettings.tabs.branding') },
    { id: 'contact', label: t('admin:siteSettings.tabs.contact') },
    { id: 'urls', label: t('admin:siteSettings.tabs.urls') },
    { id: 'social', label: t('admin:siteSettings.tabs.social') },
    { id: 'email', label: t('admin:siteSettings.tabs.email') },
    { id: 'seo', label: t('admin:siteSettings.tabs.seo') },
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

  const renderField = (label: string, field: string, placeholder: string = '', type: string = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={(form as any)[field] || ''}
        onChange={e => updateField(field, e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />
    </div>
  );

  const renderTextarea = (label: string, field: string, rows: number = 3) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={(form as any)[field] || ''}
        onChange={e => updateField(field, e.target.value)}
        rows={rows}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />
    </div>
  );

  const renderColorField = (label: string, parent: string, field: string) => (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={(form as any)[parent]?.[field] || '#000000'}
        onChange={e => updateNestedField(parent, field, e.target.value)}
        className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
      />
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-600">{label}</label>
        <input
          type="text"
          value={(form as any)[parent]?.[field] || ''}
          onChange={e => updateNestedField(parent, field, e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-mono"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin:siteSettings.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('admin:siteSettings.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className="w-4 h-4 inline mr-1" />
            {t('admin:siteSettings.resetToDefaults')}
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || updateMutation.isPending}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? t('admin:siteSettings.saving') : t('admin:siteSettings.saveChanges')}
          </button>
        </div>
      </div>

      {/* Save message */}
      {saveMessage && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          saveMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {saveMessage.type === 'success'
            ? <CheckCircleIcon className="w-5 h-5" />
            : <ExclamationTriangleIcon className="w-5 h-5" />}
          {saveMessage.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {activeTab === 'branding' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">{t('admin:siteSettings.branding.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderField(t('admin:siteSettings.branding.companyName'), 'companyName', 'BalkanEstate')}
              {renderField(t('admin:siteSettings.branding.companyNameFormatted'), 'companyNameFormatted', 'BalkanEstate<sup>AI</sup>')}
              {renderField(t('admin:siteSettings.branding.logoUrl'), 'logoUrl', 'https://...')}
              {renderField(t('admin:siteSettings.branding.faviconUrl'), 'faviconUrl', '/icons/favicon.png')}
            </div>
            {form.logoUrl && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">{t('admin:siteSettings.logoPreview')}</p>
                <div className="bg-gray-100 rounded-lg p-4 inline-block">
                  <img src={form.logoUrl} alt="Logo" className="max-h-16 max-w-48" />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">{t('admin:siteSettings.contact.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderField(t('admin:siteSettings.contact.supportEmail'), 'supportEmail', 'support@example.com', 'email')}
              {renderField(t('admin:siteSettings.contact.noReplyEmail'), 'noReplyEmail', 'noreply@example.com', 'email')}
              {renderField(t('admin:siteSettings.contact.alertsEmail'), 'alertsEmail', 'alerts@example.com', 'email')}
              {renderField(t('admin:siteSettings.contact.inquiriesEmail'), 'inquiriesEmail', 'inquiries@example.com', 'email')}
              {renderField(t('admin:siteSettings.contact.contactPhone'), 'contactPhone', '+1 234 567 890', 'tel')}
            </div>
          </div>
        )}

        {activeTab === 'urls' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">{t('admin:siteSettings.urls.title')}</h2>
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

        {activeTab === 'social' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">{t('admin:siteSettings.social.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:siteSettings.social.facebook')}</label>
                <input
                  type="url"
                  value={form.socialLinks?.facebook || ''}
                  onChange={e => updateNestedField('socialLinks', 'facebook', e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:siteSettings.social.instagram')}</label>
                <input
                  type="url"
                  value={form.socialLinks?.instagram || ''}
                  onChange={e => updateNestedField('socialLinks', 'instagram', e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:siteSettings.social.twitter')}</label>
                <input
                  type="url"
                  value={form.socialLinks?.twitter || ''}
                  onChange={e => updateNestedField('socialLinks', 'twitter', e.target.value)}
                  placeholder="https://twitter.com/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:siteSettings.social.linkedin')}</label>
                <input
                  type="url"
                  value={form.socialLinks?.linkedin || ''}
                  onChange={e => updateNestedField('socialLinks', 'linkedin', e.target.value)}
                  placeholder="https://linkedin.com/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:siteSettings.social.youtube')}</label>
                <input
                  type="url"
                  value={form.socialLinks?.youtube || ''}
                  onChange={e => updateNestedField('socialLinks', 'youtube', e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">{t('admin:siteSettings.email.title')}</h2>

            {renderField(t('admin:siteSettings.email.emailLogoUrl'), 'emailLogoUrl', 'https://...')}
            {form.emailLogoUrl && (
              <div>
                <p className="text-sm text-gray-600 mb-2">{t('admin:siteSettings.emailLogoPreview')}</p>
                <div className="bg-gray-700 rounded-lg p-4 inline-block">
                  <img src={form.emailLogoUrl} alt="Email Logo" className="max-h-12 max-w-40" />
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('admin:siteSettings.email.brandColors')}</h3>
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

            {renderField(t('admin:siteSettings.email.emailFooterText'), 'emailFooterText', 'All rights reserved.')}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">{t('admin:siteSettings.email.footerLinks')}</h3>
                <button
                  onClick={addFooterLink}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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
                      className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="url"
                      value={link.url}
                      onChange={e => updateFooterLink(idx, 'url', e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => removeFooterLink(idx)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      {t('admin:siteSettings.email.remove')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">{t('admin:siteSettings.seo.title')}</h2>
            {renderField(t('admin:siteSettings.seo.siteTitle'), 'siteTitle', 'BalkanEstate - Find Your Dream Property')}
            {renderTextarea(t('admin:siteSettings.seo.siteDescription'), 'siteDescription', 3)}
          </div>
        )}
      </div>

      {/* Available Variables Info */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('admin:siteSettings.emailVars.title')}</h3>
        <p className="text-sm text-gray-600 mb-3">
          {t('admin:siteSettings.emailVars.description')}
        </p>
        <div className="flex flex-wrap gap-2">
          {['companyName', 'companyNameFormatted', 'supportEmail', 'contactPhone', 'frontendUrl', 'backendUrl', 'emailLogoUrl', 'emailFooterText'].map(v => (
            <code key={v} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-blue-700 font-mono">
              {`{{${v}}}`}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SiteSettingsManager;
