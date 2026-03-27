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
  UsersIcon,
} from '@/constants';
import { Credential, addCredential, updateCredential, deleteCredential } from '../api/credentialApi';
import { submitLicense, getLicenseFormatHint } from '../api/licenseApi';

interface CredentialsSectionProps {
  credentials: Credential[];
  isOwner: boolean;
  onCredentialsChange: (credentials: Credential[]) => void;
  className?: string;
  /** License verification status — pass to show license banner for agents */
  licenseStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  licenseNumber?: string;
  licenseCountry?: string;
  onLicenseSubmitted?: () => void;
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

// ─── Date Helpers (DD/MM/YYYY) ────────────────────────────────────────────────

const fromISODate = (iso: string): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
};

const toISODate = (dmy: string): string => {
  if (!dmy) return '';
  const [d, m, y] = dmy.split('/');
  if (!d || !m || !y) return '';
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

const autoFormatDate = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
};

// Applies date formatting while restoring cursor to the correct digit position
const applyDateChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  onFormatted: (v: string) => void
) => {
  const input = e.target;
  const cursorPos = input.selectionStart ?? input.value.length;
  const formatted = autoFormatDate(input.value);
  const digitsBefore = (input.value.slice(0, cursorPos).match(/\d/g) ?? []).length;
  onFormatted(formatted);
  requestAnimationFrame(() => {
    if (input !== document.activeElement) return;
    let count = 0;
    let pos = formatted.length;
    if (digitsBefore === 0) {
      pos = 0;
    } else {
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i]) && ++count === digitsBefore) { pos = i + 1; break; }
      }
    }
    input.setSelectionRange(pos, pos);
  });
};

const isValidDMY = (dmy: string): boolean => {
  if (!dmy || dmy.length !== 10) return false;
  const [d, m, y] = dmy.split('/');
  const day = parseInt(d, 10);
  const month = parseInt(m, 10);
  const year = parseInt(y, 10);
  if (isNaN(day) || isNaN(month) || isNaN(year) || year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; gradient: string; accent: string; labelColor: string }> = {
  license: {
    icon: <ShieldCheckIcon className="w-5 h-5 text-white" />,
    gradient: 'from-emerald-400 to-emerald-600',
    accent: 'text-emerald-600',
    labelColor: 'bg-emerald-50 text-emerald-700',
  },
  certification: {
    icon: <AcademicCapIcon className="w-5 h-5 text-white" />,
    gradient: 'from-blue-400 to-indigo-600',
    accent: 'text-blue-600',
    labelColor: 'bg-blue-50 text-blue-700',
  },
  award: {
    icon: <TrophyIcon className="w-5 h-5 text-white" />,
    gradient: 'from-amber-400 to-orange-500',
    accent: 'text-amber-600',
    labelColor: 'bg-amber-50 text-amber-700',
  },
  membership: {
    icon: <UsersIcon className="w-5 h-5 text-white" />,
    gradient: 'from-violet-400 to-purple-600',
    accent: 'text-violet-600',
    labelColor: 'bg-violet-50 text-violet-700',
  },
};

const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; icon: React.ReactNode; labelKey: string }> = {
  verified: { dot: 'bg-green-500', bg: 'bg-green-50/80 border-green-200', text: 'text-green-700', icon: <CheckCircleIcon className="w-3.5 h-3.5" />, labelKey: 'verified' },
  pending:  { dot: 'bg-amber-400', bg: 'bg-amber-50/80 border-amber-200', text: 'text-amber-700', icon: <ClockIcon className="w-3.5 h-3.5" />, labelKey: 'pending' },
  rejected: { dot: 'bg-red-500',   bg: 'bg-red-50/80 border-red-200',     text: 'text-red-700',   icon: <ExclamationTriangleIcon className="w-3.5 h-3.5" />, labelKey: 'rejected' },
  expired:  { dot: 'bg-gray-400',  bg: 'bg-gray-100/80 border-gray-300',   text: 'text-gray-500',  icon: <ClockIcon className="w-3.5 h-3.5" />, labelKey: 'expired' },
};

// ─── Validation ───────────────────────────────────────────────────────────────

interface ValidationErrors {
  title?: string;
  issuer?: string;
  file?: string;
  issueDate?: string;
  expiryDate?: string;
}

const validate = (
  data: { title: string; issuer: string; expiryDate: string; issueDate: string },
  file: File | null,
  t: (key: string, defaultValue?: string) => string,
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

  if (data.issueDate && !isValidDMY(data.issueDate)) {
    errors.issueDate = t('profilePage.credentials.validation.issueDateFormat', 'Use DD/MM/YYYY format');
  }

  if (data.expiryDate) {
    if (!isValidDMY(data.expiryDate)) {
      errors.expiryDate = t('profilePage.credentials.validation.expiryDateFormat', 'Use DD/MM/YYYY format');
    } else if (data.issueDate && isValidDMY(data.issueDate)) {
      const expISO = toISODate(data.expiryDate);
      const issISO = toISODate(data.issueDate);
      if (expISO && issISO && new Date(expISO) <= new Date(issISO)) {
        errors.expiryDate = t('profilePage.credentials.validation.expiryAfterIssue', 'Expiry date must be after the issue date');
      }
    }
  }

  return errors;
};

// ─── Component ────────────────────────────────────────────────────────────────

const BALKAN_COUNTRIES = [
  { code: 'RS', name: 'Serbia' },
  { code: 'HR', name: 'Croatia' },
  { code: 'BA', name: 'Bosnia & Herzegovina' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'AL', name: 'Albania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'GR', name: 'Greece' },
  { code: 'RO', name: 'Romania' },
  { code: 'XK', name: 'Kosovo' },
  { code: 'SI', name: 'Slovenia' },
];

const CredentialsSection: React.FC<CredentialsSectionProps> = ({
  credentials,
  isOwner,
  onCredentialsChange,
  className = '',
  licenseStatus,
  licenseNumber: existingLicenseNumber,
  licenseCountry: existingLicenseCountry,
  onLicenseSubmitted,
}) => {
  const { t, i18n } = useTranslation(['agents']);
  const locale = i18n.language || 'en';

  // License verification state
  const [showLicenseForm, setShowLicenseForm] = useState(false);
  const [licenseInput, setLicenseInput] = useState('');
  const [licenseCountryInput, setLicenseCountryInput] = useState('');
  const [licenseFormatHint, setLicenseFormatHint] = useState('');
  const [licenseSubmitting, setLicenseSubmitting] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [licenseSuccess, setLicenseSuccess] = useState(false);

  // Fetch format hint when country changes
  React.useEffect(() => {
    if (!licenseCountryInput) {
      setLicenseFormatHint('');
      return;
    }
    let cancelled = false;
    getLicenseFormatHint(licenseCountryInput)
      .then((res) => { if (!cancelled) setLicenseFormatHint(res.formatHint); })
      .catch(() => { if (!cancelled) setLicenseFormatHint(''); });
    return () => { cancelled = true; };
  }, [licenseCountryInput]);

  const handleLicenseSubmit = async () => {
    if (!licenseInput.trim() || !licenseCountryInput) return;
    setLicenseSubmitting(true);
    setLicenseError(null);
    try {
      await submitLicense({ licenseNumber: licenseInput.trim(), country: licenseCountryInput });
      setLicenseSuccess(true);
      setShowLicenseForm(false);
      onLicenseSubmitted?.();
    } catch (err: any) {
      const msg = err?.formatHint
        ? `Invalid format. Expected: ${err.formatHint}`
        : err?.message || 'Failed to submit license';
      setLicenseError(msg);
    } finally {
      setLicenseSubmitting(false);
    }
  };

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
      issueDate: cred.issueDate ? fromISODate(new Date(cred.issueDate).toISOString().split('T')[0]) : '',
      expiryDate: cred.expiryDate ? fromISODate(new Date(cred.expiryDate).toISOString().split('T')[0]) : '',
      isPublic: cred.isPublic,
    });
    setEditingId(cred.id);
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
    const validationErrors = validate(formData, selectedFile, (key, def) => t(key, def ?? ''));
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const apiData = {
        ...formData,
        issueDate: formData.issueDate ? toISODate(formData.issueDate) : '',
        expiryDate: formData.expiryDate ? toISODate(formData.expiryDate) : '',
      };
      if (editingId) {
        const updated = await updateCredential(editingId, apiData, selectedFile || undefined);
        onCredentialsChange(credentials.map(c => c.id === editingId ? updated : c));
        setSuccessMessage(t('profilePage.credentials.credentialUpdated', 'Credential updated'));
      } else {
        const added = await addCredential(apiData, selectedFile || undefined);
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
      onCredentialsChange(credentials.filter(c => c.id !== id));
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

      {/* License Verification Banner */}
      {isOwner && licenseStatus !== undefined && (
        <div className="mb-4">
          {licenseStatus === 'verified' && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-green-800">
                  {t('profilePage.credentials.license.verified', 'License Verified')}
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  {existingLicenseNumber && `#${existingLicenseNumber}`}
                  {existingLicenseCountry && ` · ${BALKAN_COUNTRIES.find(c => c.code === existingLicenseCountry)?.name || existingLicenseCountry}`}
                </p>
              </div>
            </div>
          )}

          {licenseStatus === 'pending' && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <ClockIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800">
                  {t('profilePage.credentials.license.pending', 'License Pending Review')}
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {t('profilePage.credentials.license.pendingDesc', 'Your license is being reviewed by an admin. You will receive the verified badge once approved.')}
                </p>
                {existingLicenseNumber && (
                  <p className="text-xs text-amber-700 font-mono mt-1">#{existingLicenseNumber}</p>
                )}
              </div>
            </div>
          )}

          {licenseStatus === 'rejected' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-800">
                    {t('profilePage.credentials.license.rejected', 'License Rejected')}
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {t('profilePage.credentials.license.rejectedDesc', 'Your license was not approved. You can resubmit with correct details.')}
                  </p>
                  {!showLicenseForm && (
                    <button
                      type="button"
                      onClick={() => { setShowLicenseForm(true); setLicenseError(null); setLicenseSuccess(false); }}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      <ShieldCheckIcon className="w-3.5 h-3.5" />
                      {t('profilePage.credentials.license.resubmit', 'Resubmit License')}
                    </button>
                  )}
                </div>
              </div>

              {/* License Resubmit Form */}
              {showLicenseForm && (
                <div className="mt-4 pt-4 border-t border-red-200 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-red-800 mb-1">
                      {t('profilePage.credentials.license.country', 'Country')}
                    </label>
                    <select
                      value={licenseCountryInput}
                      onChange={(e) => setLicenseCountryInput(e.target.value)}
                      className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    >
                      <option value="">{t('profilePage.credentials.license.selectCountry', 'Select country...')}</option>
                      {BALKAN_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-red-800 mb-1">
                      {t('profilePage.credentials.license.licenseNumber', 'License Number')}
                    </label>
                    <input
                      type="text"
                      value={licenseInput}
                      onChange={(e) => { setLicenseInput(e.target.value); setLicenseError(null); }}
                      className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      placeholder={licenseFormatHint || t('profilePage.credentials.license.enterLicense', 'Enter your license number')}
                    />
                    {licenseFormatHint && (
                      <p className="mt-1 text-[11px] text-red-500">
                        {t('profilePage.credentials.license.formatHint', 'Expected format')}: {licenseFormatHint}
                      </p>
                    )}
                  </div>
                  {licenseError && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                      <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                      {licenseError}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowLicenseForm(false); setLicenseError(null); }}
                      className="px-3 py-1.5 text-xs font-semibold text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      {t('profilePage.credentials.license.cancel', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleLicenseSubmit}
                      disabled={licenseSubmitting || !licenseInput.trim() || !licenseCountryInput}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {licenseSubmitting && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {t('profilePage.credentials.license.submit', 'Submit for Review')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {licenseStatus === 'none' && !licenseSuccess && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-blue-800">
                    {t('profilePage.credentials.license.getVerified', 'Get Verified')}
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    {t('profilePage.credentials.license.getVerifiedDesc', 'Submit your real estate license number to get the verified badge on your profile.')}
                  </p>
                  {!showLicenseForm && (
                    <button
                      type="button"
                      onClick={() => setShowLicenseForm(true)}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      <ShieldCheckIcon className="w-3.5 h-3.5" />
                      {t('profilePage.credentials.license.submitLicense', 'Submit License')}
                    </button>
                  )}
                </div>
              </div>

              {/* License Submit Form */}
              {showLicenseForm && (
                <div className="mt-4 pt-4 border-t border-blue-200 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">
                      {t('profilePage.credentials.license.country', 'Country')}
                    </label>
                    <select
                      value={licenseCountryInput}
                      onChange={(e) => setLicenseCountryInput(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">{t('profilePage.credentials.license.selectCountry', 'Select country...')}</option>
                      {BALKAN_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">
                      {t('profilePage.credentials.license.licenseNumber', 'License Number')}
                    </label>
                    <input
                      type="text"
                      value={licenseInput}
                      onChange={(e) => { setLicenseInput(e.target.value); setLicenseError(null); }}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder={licenseFormatHint || t('profilePage.credentials.license.enterLicense', 'Enter your license number')}
                    />
                    {licenseFormatHint && (
                      <p className="mt-1 text-[11px] text-blue-500">
                        {t('profilePage.credentials.license.formatHint', 'Expected format')}: {licenseFormatHint}
                      </p>
                    )}
                  </div>
                  {licenseError && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                      <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                      {licenseError}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowLicenseForm(false); setLicenseError(null); }}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      {t('profilePage.credentials.license.cancel', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleLicenseSubmit}
                      disabled={licenseSubmitting || !licenseInput.trim() || !licenseCountryInput}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {licenseSubmitting && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {t('profilePage.credentials.license.submit', 'Submit for Review')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {licenseSuccess && (licenseStatus === 'none' || licenseStatus === 'rejected') && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm font-medium text-green-800">
                {t('profilePage.credentials.license.submitted', 'License submitted! It will be reviewed by an admin shortly.')}
              </p>
            </div>
          )}
        </div>
      )}

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
            const isBeingDeleted = deletingId === cred.id;
            const issueDateFormatted = formatDate(cred.issueDate, locale);
            const expiryDateFormatted = formatDate(cred.expiryDate, locale);

            const activeStatus = expired ? STATUS_CONFIG.expired : statusStyle;

            return (
              <div
                key={cred.id}
                className={`relative rounded-2xl overflow-hidden border transition-all duration-200 ${
                  isBeingDeleted ? 'opacity-40 scale-[0.98] pointer-events-none' : 'hover:shadow-lg hover:-translate-y-0.5'
                } ${expired ? 'border-gray-200' : 'border-gray-100'} shadow-sm`}
              >
                {/* Deleting overlay */}
                {isBeingDeleted && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/60 backdrop-blur-sm">
                    <div className="w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {/* ── Header band ── */}
                <div className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r ${expired ? 'from-gray-300 to-gray-400' : typeConfig.gradient}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <span className="scale-75">{typeConfig.icon}</span>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-white/90">
                      {cred.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-sm border border-white/20">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${expired ? 'bg-gray-200' : activeStatus.dot}`} />
                    <span className="text-[11px] font-semibold text-white whitespace-nowrap">
                      {expired
                        ? t('profilePage.credentials.status.expired', 'Expired')
                        : t(`profilePage.credentials.status.${cred.status}`)}
                    </span>
                  </div>
                </div>

                {/* ── Body ── */}
                <div className="px-5 py-4 bg-white">
                  <h4 className={`font-bold text-base leading-tight ${expired ? 'text-gray-400' : 'text-gray-900'}`}>
                    {cred.title}
                  </h4>
                  <p className={`text-sm font-semibold mt-0.5 ${expired ? 'text-gray-400' : typeConfig.accent}`}>
                    {cred.issuer}
                  </p>

                  {/* Meta pills row */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {cred.issueNumber && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-[11px] font-mono text-gray-600">
                        # {cred.issueNumber}
                      </span>
                    )}
                    {issueDateFormatted && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                        <CalendarIcon className="w-3 h-3 text-gray-400" />
                        {issueDateFormatted}
                      </span>
                    )}
                    {expiryDateFormatted && (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                        expired ? 'text-red-500' : expiresIn ? 'text-amber-600' : 'text-gray-500'
                      }`}>
                        <span className="text-gray-300">·</span>
                        {expired
                          ? `${t('profilePage.credentials.expired', 'Expired')} ${expiryDateFormatted}`
                          : `${t('profilePage.credentials.expires', 'Expires')} ${expiryDateFormatted}`}
                        {!expired && expiresIn && (
                          <span className="text-[10px] opacity-75">({expiresIn} {t('profilePage.credentials.left', 'left')})</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between px-5 py-2.5 bg-gray-50/80 border-t border-gray-100">
                  {cred.documentUrl ? (
                    <a
                      href={cred.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <DocumentTextIcon className="w-3.5 h-3.5" />
                      {t('profilePage.credentials.viewDocument', 'View Document')}
                    </a>
                  ) : <div />}

                  {isOwner && (
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => openEdit(cred)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        title={t('profilePage.credentials.edit', 'Edit')}
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cred.id)}
                        disabled={isBeingDeleted}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-40"
                        title={t('profilePage.credentials.delete', 'Delete')}
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
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
                    type="text"
                    value={formData.issueDate}
                    onChange={(e) => applyDateChange(e, (v) => handleFieldChange('issueDate', v))}
                    placeholder="DD/MM/YYYY"
                    maxLength={10}
                    inputMode="numeric"
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                      errors.issueDate ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
                    }`}
                  />
                  {errors.issueDate && (
                    <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                      {errors.issueDate}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                    {t('profilePage.credentials.form.expiryDate', 'Expiry Date')}
                  </label>
                  <input
                    type="text"
                    value={formData.expiryDate}
                    onChange={(e) => applyDateChange(e, (v) => handleFieldChange('expiryDate', v))}
                    placeholder="DD/MM/YYYY"
                    maxLength={10}
                    inputMode="numeric"
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
