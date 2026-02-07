import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  XMarkIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@/constants';
import { Credential, addCredential, updateCredential, deleteCredential } from '../api/credentialApi';

interface CredentialsSectionProps {
  credentials: Credential[];
  isOwner: boolean;
  onCredentialsChange: (credentials: Credential[]) => void;
  className?: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  license: <ShieldCheckIcon className="w-5 h-5" />,
  certification: <AcademicCapIcon className="w-5 h-5" />,
  award: <AcademicCapIcon className="w-5 h-5" />,
  membership: <ShieldCheckIcon className="w-5 h-5" />,
};

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  verified: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: <CheckCircleIcon className="w-3.5 h-3.5" /> },
  pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: <ClockIcon className="w-3.5 h-3.5" /> },
  rejected: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: <ExclamationTriangleIcon className="w-3.5 h-3.5" /> },
  expired: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-500', icon: <ClockIcon className="w-3.5 h-3.5" /> },
};

const CredentialsSection: React.FC<CredentialsSectionProps> = ({
  credentials,
  isOwner,
  onCredentialsChange,
  className = '',
}) => {
  const { t } = useTranslation(['agents']);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    type: 'certification' as Credential['type'],
    title: '',
    issuer: '',
    issueNumber: '',
    issueDate: '',
    expiryDate: '',
    isPublic: true,
  });

  const resetForm = () => {
    setFormData({ type: 'certification', title: '', issuer: '', issueNumber: '', issueDate: '', expiryDate: '', isPublic: true });
    setSelectedFile(null);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (cred: Credential) => {
    setFormData({
      type: cred.type,
      title: cred.title,
      issuer: cred.issuer,
      issueNumber: cred.issueNumber || '',
      issueDate: cred.issueDate ? new Date(cred.issueDate).toISOString().split('T')[0] : '',
      expiryDate: cred.expiryDate ? new Date(cred.expiryDate).toISOString().split('T')[0] : '',
      isPublic: cred.isPublic,
    });
    setEditingId(cred._id);
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!formData.title || !formData.issuer) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        const updated = await updateCredential(editingId, formData, selectedFile || undefined);
        onCredentialsChange(credentials.map(c => c._id === editingId ? updated : c));
      } else {
        const added = await addCredential(formData, selectedFile || undefined);
        onCredentialsChange([...credentials, added]);
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      // Silent fail
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCredential(id);
      onCredentialsChange(credentials.filter(c => c._id !== id));
    } catch (err) {
      // Silent fail
    }
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AcademicCapIcon className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900">
            {t('profilePage.credentials.professionalCertifications')}
          </h3>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            {t('profilePage.credentials.addCredential', 'Add')}
          </button>
        )}
      </div>

      {/* Credentials List */}
      {credentials.length === 0 ? (
        <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
          <AcademicCapIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{t('profilePage.credentials.empty.title', 'No certifications added yet')}</p>
          {isOwner && (
            <button type="button" onClick={openAdd} className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
              {t('profilePage.credentials.empty.description', 'Add your first certification')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {credentials.map((cred) => {
            const statusStyle = STATUS_STYLES[cred.status] || STATUS_STYLES.pending;
            return (
              <div key={cred._id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
                    {TYPE_ICONS[cred.type] || TYPE_ICONS.certification}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">{cred.title}</h4>
                        <p className="text-xs text-gray-500">{cred.issuer}</p>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusStyle.icon}
                        {t(`profilePage.credentials.status.${cred.status}`, cred.status)}
                      </div>
                    </div>
                    {cred.issueNumber && (
                      <p className="text-xs text-gray-400 mt-1 font-mono">#{cred.issueNumber}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {cred.documentUrl && (
                        <a href={cred.documentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                          <DocumentTextIcon className="w-3.5 h-3.5" />
                          {t('profilePage.credentials.viewDocument', 'View Document')}
                        </a>
                      )}
                      {isOwner && (
                        <div className="flex items-center gap-2 ml-auto">
                          <button type="button" onClick={() => openEdit(cred)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                            <PencilIcon className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDelete(cred._id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? t('profilePage.credentials.editCredential', 'Edit Certification') : t('profilePage.credentials.addCredential', 'Add Certification')}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {t('profilePage.credentials.types.certification', 'Type')}
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Credential['type'] }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="certification">{t('profilePage.credentials.types.certification', 'Certification')}</option>
                  <option value="license">{t('profilePage.credentials.types.license', 'License')}</option>
                  <option value="membership">{t('profilePage.credentials.types.membership', 'Membership')}</option>
                  <option value="award">{t('profilePage.credentials.types.award', 'Award')}</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {t('profilePage.credentials.form.title', 'Title')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder={t('profilePage.credentials.form.titlePlaceholder', 'e.g., Certified Real Estate Agent')}
                />
              </div>

              {/* Issuer */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {t('profilePage.credentials.form.issuer', 'Issuing Organization')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.issuer}
                  onChange={(e) => setFormData(prev => ({ ...prev, issuer: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder={t('profilePage.credentials.form.issuerPlaceholder', 'e.g., National Association of Realtors')}
                />
              </div>

              {/* Issue Number */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {t('profilePage.credentials.form.issueNumber', 'Certificate/License Number')}
                </label>
                <input
                  type="text"
                  value={formData.issueNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, issueNumber: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder={t('profilePage.credentials.form.issueNumberPlaceholder', 'e.g., REA-2024-12345')}
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {t('profilePage.credentials.form.issueDate', 'Issue Date')}
                  </label>
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {t('profilePage.credentials.form.expiryDate', 'Expiry Date')}
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {t('profilePage.credentials.uploadDocument', 'Upload Certificate/Document')}
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="credential-file"
                  />
                  <label htmlFor="credential-file" className="cursor-pointer">
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2 text-blue-600">
                        <DocumentTextIcon className="w-5 h-5" />
                        <span className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                          className="p-0.5 hover:bg-red-50 rounded text-red-500"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <DocumentTextIcon className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                        <p className="text-sm text-gray-500">{t('profilePage.credentials.form.uploadHint', 'Click to upload (Image or PDF, max 10MB)')}</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
                >
                  {t('profilePage.credentials.form.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.title || !formData.issuer}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    editingId ? t('profilePage.credentials.form.save', 'Save') : t('profilePage.credentials.form.add', 'Add')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CredentialsSection;
