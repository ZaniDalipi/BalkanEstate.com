import React, { useState, useRef, useCallback } from 'react';
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
  CalendarIcon,
  TrophyIcon,
  StarIcon,
} from '@/constants';
import { Credential, addCredential, updateCredential, deleteCredential } from '../api/credentialApi';

interface CredentialsSectionProps {
  credentials: Credential[];
  isOwner: boolean;
  onCredentialsChange: (credentials: Credential[]) => void;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string | undefined, locale: string = 'en'): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

const isExpired = (expiryDate: string | undefined): boolean => {
  if (!expiryDate) return false;
  try {
    return new Date(expiryDate) < new Date();
  } catch {
    return false;
  }
};

const getTimeUntilExpiry = (expiryDate: string | undefined): string | null => {
  if (!expiryDate) return null;
  try {
    const expiry = new Date(expiryDate);
    const now = new Date();
    if (expiry < now) return null;
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) return `${diffDays}d`;
    if (diffDays <= 365) return `${Math.floor(diffDays / 30)}mo`;
    return `${Math.floor(diffDays / 365)}y`;
  } catch {
    return null;
  }
};

const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  license: {
    icon: <ShieldCheckIcon className="w-5 h-5" />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  certification: {
    icon: <AcademicCapIcon className="w-5 h-5" />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  award: {
    icon: <TrophyIcon className="w-5 h-5" />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  membership: {
    icon: <StarIcon className="w-5 h-5" />,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
  },
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: React.ReactNode; labelKey: string }> = {
  verified: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: <CheckCircleIcon className="w-3.5 h-3.5" />, labelKey: 'verified' },
  pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: <ClockIcon className="w-3.5 h-3.5" />, labelKey: 'pending' },
  rejected: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: <ExclamationTriangleIcon className="w-3.5 h-3.5" />, labelKey: 'rejected' },
  expired: { bg: 'bg-gray-100 border-gray-300', text: 'text-gray-500', icon: <ClockIcon className="w-3.5 h-3.5" />, labelKey: 'expired' },
};

// ─── Validation ───────────────────────────────────────────────────────────────

interface ValidationErrors {
  title?: string;
  issuer?: string;
  file?: string;
  expiryDate?: string;
}

const validate = (
  data: { title: string; issuer: string; expiryDate: string; issueDate: string },
  file: File | null,
  t: (key: string, defaultValue?: string | Record<string, unknown>) => string,
): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.title.trim()) {
    errors.title = t('profilePage.credentials.validation.titleRequired', 'Title is required');
  } else if (data.title.trim().length < 3) {
    errors.title = t('profilePage.credentials.validation.titleMinLength', 'Title must be at least 3 characters');
  } else if (data.title.trim().length > 120) {
    errors.title = t('profilePage.credentials.validation.titleMaxLength', 'Title must be under 120 characters');
  }

  if (!data.issuer.trim()) {
    errors.issuer = t('profilePage.credentials.validation.issuerRequired', 'Issuing organization is required');
  } else if (data.issuer.trim().length < 2) {
    errors.issuer = t('profilePage.credentials.validation.issuerMinLength', 'Organization name must be at least 2 characters');
  }

  if (file) {
    if (file.size > FILE_SIZE_LIMIT) {
      errors.file = t('profilePage.credentials.validation.fileTooLarge', 'File must be under 10 MB');
    } else if (!ALLOWED_TYPES.includes(file.type)) {
      errors.file = t('profilePage.credentials.validation.fileTypeNotAllowed', 'Only images (JPG, PNG, WebP) and PDFs are allowed');
    }
  }

  if (data.expiryDate && data.issueDate) {
    if (new Date(data.expiryDate) <= new Date(data.issueDate)) {
      errors.expiryDate = t('profilePage.credentials.validation.expiryAfterIssue', 'Expiry date must be after the issue date');
    }
  }

  return errors;
};

// ─── Component ────────────────────────────────────────────────────────────────

const CredentialsSection: React.FC<CredentialsSectionProps> = ({
  credentials,
  isOwner,
  onCredentialsChange,
  className = '',
}) => {
  const { t, i18n } = useTranslation(['agents']);
  const locale = i18n.language || 'en';

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Prevent body scroll while modal is open
  React.useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [showModal]);

  const [formData, setFormData] = useState({
    type: 'certification' as Credential['type'],
    title: '',
    issuer: '',
    issueNumber: '',
    issueDate: '',
    expiryDate: '',
    isPublic: true,
  });

  // ─── Form Helpers ─────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setFormData({ type: 'certification', title: '', issuer: '', issueNumber: '', issueDate: '', expiryDate: '', isPublic: true });
    setSelectedFile(null);
    setEditingId(null);
    setErrors({});
    setSubmitError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

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
    setErrors({});
    setSubmitError(null);
    setShowModal(true);
  };

  const handleFieldChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (submitError) setSubmitError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Immediate validation
      if (file.size > FILE_SIZE_LIMIT) {
        setErrors(prev => ({ ...prev, file: t('profilePage.credentials.validation.fileTooLarge', 'File must be under 10 MB') }));
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        setErrors(prev => ({ ...prev, file: t('profilePage.credentials.validation.fileTypeNotAllowed', 'Only images (JPG, PNG, WebP) and PDFs are allowed') }));
        return;
      }
      setErrors(prev => ({ ...prev, file: undefined }));
    }
    setSelectedFile(file);
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Validate
    const validationErrors = validate(formData, selectedFile, t as (key: string, defaultValue?: string | Record<string, unknown>) => string);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (editingId) {
        const updated = await updateCredential(editingId, formData, selectedFile || undefined);
        onCredentialsChange(credentials.map(c => c._id === editingId ? updated : c));
        setSuccessMessage(t('profilePage.credentials.credentialUpdated', 'Credential updated'));
      } else {
        const added = await addCredential(formData, selectedFile || undefined);
        onCredentialsChange([...credentials, added]);
        setSuccessMessage(t('profilePage.credentials.credentialAdded', 'Credential added'));
      }
      setShowModal(false);
      resetForm();
      // Auto-dismiss success message
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const message = err?.message || t('profilePage.credentials.saveFailed', 'Something went wrong. Please try again.');
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteCredential(id);
      onCredentialsChange(credentials.filter(c => c._id !== id));
      setSuccessMessage(t('profilePage.credentials.credentialRemoved', 'Credential removed'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setSubmitError(err?.message || t('profilePage.credentials.deleteFailed', 'Failed to delete. Please try again.'));
      setTimeout(() => setSubmitError(null), 4000);
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <AcademicCapIcon className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 leading-tight">
              {t('profilePage.credentials.professionalCertifications')}
            </h3>
            <p className="text-[11px] text-gray-400 font-medium">
              {t('profilePage.credentials.credentialCount', '{{count}} credentials', { count: credentials.length })}
            </p>
          </div>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.97]"
          >
            <PlusIcon className="w-4 h-4" />
            {t('profilePage.credentials.addCredential', 'Add')}
          </button>
        )}
      </div>

      {/* Success Toast */}
      {successMessage && (
        <div className="mb-3 flex items-center gap-2 px-3.5 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium animate-in fade-in slide-in-from-top-1">
          <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Error Toast */}
      {submitError && !showModal && (
        <div className="mb-3 flex items-center gap-2 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
          <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
          {submitError}
        </div>
      )}

      {/* Credentials List */}
      {credentials.length === 0 ? (
        <div className="text-center py-10 bg-gradient-to-b from-gray-50/80 to-white rounded-2xl border border-dashed border-gray-200">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
            <AcademicCapIcon className="w-7 h-7 text-blue-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">{t('profilePage.credentials.empty.title', 'No certifications added yet')}</p>
          <p className="text-xs text-gray-400 mt-1 max-w-[240px] mx-auto">
            {t('profilePage.credentials.empty.subtitle', 'Showcase your professional qualifications and build trust with clients')}
          </p>
          {isOwner && (
            <button
              type="button"
              onClick={openAdd}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 font-semibold rounded-xl transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              {t('profilePage.credentials.empty.description', 'Add your first certification')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {credentials.map((cred) => {
            const statusStyle = STATUS_CONFIG[cred.status] || STATUS_CONFIG.pending;
            const typeConfig = TYPE_CONFIG[cred.type] || TYPE_CONFIG.certification;
            const expired = isExpired(cred.expiryDate);
            const expiresIn = getTimeUntilExpiry(cred.expiryDate);
            const isBeingDeleted = deletingId === cred._id;
            const issueDateFormatted = formatDate(cred.issueDate, locale);
            const expiryDateFormatted = formatDate(cred.expiryDate, locale);

            return (
              <div
                key={cred._id}
                className={`relative bg-white rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
                  isBeingDeleted ? 'opacity-40 scale-[0.98] pointer-events-none' : 'hover:shadow-md hover:border-gray-300'
                } ${expired ? 'border-gray-200 bg-gray-50/50' : 'border-gray-200'}`}
              >
                {/* Deleting overlay */}
                {isBeingDeleted && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                <div className="flex items-start gap-3.5">
                  {/* Type Icon */}
                  <div className={`w-11 h-11 rounded-xl ${typeConfig.bg} ${typeConfig.border} border flex items-center justify-center flex-shrink-0 ${typeConfig.color}`}>
                    {typeConfig.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Top Row: Title + Status */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <h4 className={`font-bold text-sm leading-snug ${expired ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-900'}`}>
                          {cred.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">{cred.issuer}</p>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${
                        expired ? STATUS_CONFIG.expired.bg + ' ' + STATUS_CONFIG.expired.text : statusStyle.bg + ' ' + statusStyle.text
                      }`}>
                        {expired ? STATUS_CONFIG.expired.icon : statusStyle.icon}
                        {expired
                          ? t('profilePage.credentials.status.expired', 'Expired')
                          : t(`profilePage.credentials.status.${cred.status}`)
                        }
                      </div>
                    </div>

                    {/* Certificate Number */}
                    {cred.issueNumber && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">ID</span>
                        <span className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-0.5 rounded-md">{cred.issueNumber}</span>
                      </div>
                    )}

                    {/* Date Info */}
                    {(issueDateFormatted || expiryDateFormatted) && (
                      <div className="flex items-center gap-3 mt-2.5 text-xs text-gray-500">
                        {issueDateFormatted && (
                          <div className="flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span>{t('profilePage.credentials.issued', 'Issued')} {issueDateFormatted}</span>
                          </div>
                        )}
                        {expiryDateFormatted && (
                          <div className={`flex items-center gap-1.5 ${expired ? 'text-red-500 font-medium' : expiresIn && parseInt(expiresIn) <= 3 ? 'text-amber-600 font-medium' : ''}`}>
                            <span className="text-gray-300">·</span>
                            {expired ? (
                              <span>{t('profilePage.credentials.expired', 'Expired')} {expiryDateFormatted}</span>
                            ) : (
                              <span>
                                {t('profilePage.credentials.expires', 'Expires')} {expiryDateFormatted}
                                {expiresIn && <span className="ml-1 text-[10px] opacity-75">({expiresIn} {t('profilePage.credentials.left', 'left')})</span>}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom Row: Document + Actions */}
                    <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-gray-100">
                      {cred.documentUrl && (
                        <a
                          href={cred.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <DocumentTextIcon className="w-3.5 h-3.5" />
                          {t('profilePage.credentials.viewDocument', 'View Document')}
                        </a>
                      )}

                      {/* Type Badge */}
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${typeConfig.color} ${typeConfig.bg} px-2 py-0.5 rounded-md`}>
                        {cred.type}
                      </span>

                      {isOwner && (
                        <div className="flex items-center gap-1 ml-auto">
                          <button
                            type="button"
                            onClick={() => openEdit(cred)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('profilePage.credentials.edit', 'Edit')}
                          >
                            <PencilIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cred._id)}
                            disabled={isBeingDeleted}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                            title={t('profilePage.credentials.delete', 'Delete')}
                          >
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

      {/* ─── Add/Edit Modal ──────────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]
                     flex items-end sm:items-center justify-center
                     sm:p-4"
          onClick={() => { if (!isSubmitting) { setShowModal(false); resetForm(); } }}
        >
          <div
            className="
              bg-white flex flex-col w-full
              rounded-t-3xl max-h-[92dvh] min-h-[40dvh]
              sm:rounded-2xl sm:max-w-lg sm:max-h-[90vh]
              shadow-2xl overflow-hidden
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle – mobile only */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Modal Header */}
            <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {editingId ? t('profilePage.credentials.editCredential', 'Edit Credential') : t('profilePage.credentials.addCredential', 'Add New Credential')}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingId ? t('profilePage.credentials.editSubtitle', 'Update your credential details below') : t('profilePage.credentials.addSubtitle', 'Fill in the details for your new credential')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { if (!isSubmitting) { setShowModal(false); resetForm(); } }}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-40 ml-3 flex-shrink-0"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Submit Error Banner */}
              {submitError && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{t('profilePage.credentials.failedToSave', 'Failed to save')}</p>
                    <p className="text-xs text-red-600 mt-0.5">{submitError}</p>
                  </div>
                </div>
              )}

              {/* Type Selector - Visual Cards */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                  {t('profilePage.credentials.form.type', 'Type')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['certification', 'license', 'membership', 'award'] as const).map((type) => {
                    const config = TYPE_CONFIG[type];
                    const selected = formData.type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleFieldChange('type', type)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${
                          selected
                            ? `${config.bg} ${config.border} ${config.color} border-current shadow-sm`
                            : 'border-gray-100 hover:border-gray-200 text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${selected ? config.bg : 'bg-gray-50'} flex items-center justify-center`}>
                          {config.icon}
                        </div>
                        <span className="text-sm font-semibold capitalize">{type}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  {t('profilePage.credentials.form.title', 'Title')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl text-sm transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.title ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
                  }`}
                  placeholder={t('profilePage.credentials.form.titlePlaceholder', 'e.g., Certified Real Estate Agent')}
                />
                {errors.title && (
                  <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Issuer */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  {t('profilePage.credentials.form.issuingOrganization', 'Issuing Organization')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.issuer}
                  onChange={(e) => handleFieldChange('issuer', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl text-sm transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.issuer ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
                  }`}
                  placeholder={t('profilePage.credentials.form.issuerPlaceholder', 'e.g., National Association of Realtors')}
                />
                {errors.issuer && (
                  <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                    {errors.issuer}
                  </p>
                )}
              </div>

              {/* Issue Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  {t('profilePage.credentials.form.certificateNumber', 'Certificate / License Number')}
                </label>
                <input
                  type="text"
                  value={formData.issueNumber}
                  onChange={(e) => handleFieldChange('issueNumber', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  placeholder={t('profilePage.credentials.form.certificateNumberPlaceholder', 'e.g., REA-2024-12345')}
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                    {t('profilePage.credentials.form.issueDate', 'Issue Date')}
                  </label>
                  <input
                    type="date"
                    value={formData.issueDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleFieldChange('issueDate', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                    {t('profilePage.credentials.form.expiryDate', 'Expiry Date')}
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => handleFieldChange('expiryDate', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                      errors.expiryDate ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
                    }`}
                  />
                  {errors.expiryDate && (
                    <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                      {errors.expiryDate}
                    </p>
                  )}
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  {t('profilePage.credentials.form.supportingDocument', 'Supporting Document')}
                </label>
                <div className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                  errors.file ? 'border-red-300 bg-red-50/30' : selectedFile ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/20'
                }`}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="credential-file-upload"
                  />
                  <label htmlFor="credential-file-upload" className="cursor-pointer block">
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                          <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-sm font-semibold text-blue-700 truncate max-w-[200px]">{selectedFile.name}</p>
                          <p className="text-[11px] text-blue-500">
                            {(selectedFile.size / 1024).toFixed(0)} KB · {selectedFile.type.split('/').pop()?.toUpperCase()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedFile(null);
                            setErrors(prev => ({ ...prev, file: undefined }));
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-2">
                          <DocumentTextIcon className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">{t('profilePage.credentials.form.clickToUpload', 'Click to upload certificate')}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{t('profilePage.credentials.form.fileTypes', 'JPG, PNG, WebP, or PDF up to 10 MB')}</p>
                      </div>
                    )}
                  </label>
                </div>
                {errors.file && (
                  <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                    {errors.file}
                  </p>
                )}
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-700">{t('profilePage.credentials.form.publicVisibility', 'Public visibility')}</p>
                  <p className="text-[11px] text-gray-400">{t('profilePage.credentials.form.publicVisibilityDesc', 'Show this on your public profile')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleFieldChange('isPublic', !formData.isPublic)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${formData.isPublic ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${formData.isPublic ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>

            </form>

            {/* Sticky footer – action buttons outside scrollable form */}
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-white rounded-b-3xl sm:rounded-b-2xl flex-shrink-0">
              <button
                type="button"
                onClick={() => { setShowModal(false); resetForm(); }}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => formRef.current?.requestSubmit()}
                disabled={isSubmitting || !formData.title.trim() || !formData.issuer.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{editingId ? 'Saving...' : 'Adding...'}</span>
                  </>
                ) : editingId ? (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-4 h-4" />
                    <span>Add Credential</span>
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

export default CredentialsSection;
