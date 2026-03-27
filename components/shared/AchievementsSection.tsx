import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrophyIcon,
  AcademicCapIcon,
  StarIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  PhotoIcon
} from '@/constants';

// Achievement type matching backend schema
export interface Achievement {
  id: string;
  type: 'award' | 'certification' | 'milestone' | 'recognition' | 'membership';
  title: string;
  description?: string;
  dateReceived: Date | string;
  expiryDate?: Date | string;
  issuingOrganization: string;
  documentUrl?: string;
  documentPublicId?: string;
  isVerified: boolean;
  verifiedAt?: Date | string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

interface AchievementsSectionProps {
  achievements: Achievement[];
  isOwner?: boolean;
  onAdd?: (achievement: Omit<Achievement, 'id' | 'createdAt' | 'isVerified'>) => Promise<void>;
  onEdit?: (id: string, achievement: Partial<Achievement>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  entityType: 'agent' | 'agency';
  className?: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface ValidationErrors {
  title?: string;
  issuingOrganization?: string;
  dateReceived?: string;
  expiryDate?: string;
  documentUrl?: string;
}

type AchievementFormData = {
  title: string;
  issuingOrganization: string;
  dateReceived: string;
  expiryDate: string;
  documentUrl: string;
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

const validateAchievementForm = (data: AchievementFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.title.trim()) {
    errors.title = 'Title is required';
  } else if (data.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters';
  } else if (data.title.trim().length > 120) {
    errors.title = 'Title must be under 120 characters';
  }

  if (!data.issuingOrganization.trim()) {
    errors.issuingOrganization = 'Issuing organization is required';
  } else if (data.issuingOrganization.trim().length < 2) {
    errors.issuingOrganization = 'Organization name must be at least 2 characters';
  }

  if (!data.dateReceived) {
    errors.dateReceived = 'Date received is required';
  } else if (!isValidDMY(data.dateReceived)) {
    errors.dateReceived = 'Use DD/MM/YYYY format (e.g. 27/03/2026)';
  }

  if (data.expiryDate) {
    if (!isValidDMY(data.expiryDate)) {
      errors.expiryDate = 'Use DD/MM/YYYY format (e.g. 27/03/2030)';
    } else if (data.dateReceived && isValidDMY(data.dateReceived)) {
      const expISO = toISODate(data.expiryDate);
      const recISO = toISODate(data.dateReceived);
      if (expISO && recISO && new Date(expISO) <= new Date(recISO)) {
        errors.expiryDate = 'Expiry date must be after the received date';
      }
    }
  }

  if (data.documentUrl && !/^https?:\/\/.+/.test(data.documentUrl.trim())) {
    errors.documentUrl = 'Must be a valid URL starting with http:// or https://';
  }

  return errors;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ACHIEVEMENT_TYPES = [
  { value: 'award', label: 'Award', icon: TrophyIcon },
  { value: 'certification', label: 'Certification', icon: AcademicCapIcon },
  { value: 'milestone', label: 'Milestone', icon: StarIcon },
  { value: 'recognition', label: 'Recognition', icon: ShieldCheckIcon },
  { value: 'membership', label: 'Membership', icon: UserGroupIcon },
] as const;

const getTypeIcon = (type: Achievement['type']) => {
  const typeConfig = ACHIEVEMENT_TYPES.find(t => t.value === type);
  return typeConfig?.icon || TrophyIcon;
};

const getTypeBadgeColors = (type: Achievement['type']) => {
  switch (type) {
    case 'award':
      return { bg: '#1c1a14', ring: '#c9a84c', accent: '#d4af5a', ribbon: '#111008', text: '#f5e6b8' };
    case 'certification':
      return { bg: '#0f1628', ring: '#3b82f6', accent: '#60a5fa', ribbon: '#0a0f1e', text: '#bfdbfe' };
    case 'milestone':
      return { bg: '#1a0e28', ring: '#a855f7', accent: '#c084fc', ribbon: '#120820', text: '#e9d5ff' };
    case 'recognition':
      return { bg: '#0a1f14', ring: '#10b981', accent: '#34d399', ribbon: '#061410', text: '#a7f3d0' };
    case 'membership':
      return { bg: '#041a20', ring: '#06b6d4', accent: '#22d3ee', ribbon: '#021014', text: '#a5f3fc' };
    default:
      return { bg: '#111827', ring: '#6b7280', accent: '#9ca3af', ribbon: '#0a0a0a', text: '#e5e7eb' };
  }
};

const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
};

const isExpired = (expiryDate?: Date | string) => {
  if (!expiryDate) return false;
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  return expiry < new Date();
};

const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  achievements,
  isOwner = false,
  onAdd,
  onEdit,
  onDelete,
  entityType,
  className = ''
}) => {
  const { t } = useTranslation(['common', 'agents', 'agencies']);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<{ type: Achievement['type']; title: string; description: string; dateReceived: string; expiryDate: string; issuingOrganization: string; documentUrl: string }>({
    type: 'award',
    title: '',
    description: '',
    dateReceived: '',
    expiryDate: '',
    issuingOrganization: '',
    documentUrl: '',
  });

  const resetForm = () => {
    setFormData({
      type: 'award',
      title: '',
      description: '',
      dateReceived: '',
      expiryDate: '',
      issuingOrganization: '',
      documentUrl: '',
    });
    setEditingAchievement(null);
    setErrors({});
    setSubmitError(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEditModal = (achievement: Achievement) => {
    setFormData({
      type: achievement.type,
      title: achievement.title,
      description: achievement.description || '',
      dateReceived: achievement.dateReceived
        ? fromISODate(new Date(achievement.dateReceived).toISOString().split('T')[0])
        : '',
      expiryDate: achievement.expiryDate
        ? fromISODate(new Date(achievement.expiryDate).toISOString().split('T')[0])
        : '',
      issuingOrganization: achievement.issuingOrganization,
      documentUrl: achievement.documentUrl || ''
    });
    setEditingAchievement(achievement);
    setErrors({});
    setSubmitError(null);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const validationErrors = validateAchievementForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const achievementData = {
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        dateReceived: new Date(toISODate(formData.dateReceived)),
        expiryDate: formData.expiryDate ? new Date(toISODate(formData.expiryDate)) : undefined,
        issuingOrganization: formData.issuingOrganization.trim(),
        documentUrl: formData.documentUrl.trim() || undefined,
      };

      if (editingAchievement && onEdit) {
        await onEdit(editingAchievement.id, achievementData);
      } else if (onAdd) {
        await onAdd(achievementData);
      }

      handleCloseModal();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDelete) return;

    setDeletingId(id);
    try {
      await onDelete(id);
    } catch (error) {
    } finally {
      setDeletingId(null);
    }
  };

  // Sort achievements by date (newest first)
  const sortedAchievements = [...achievements].sort((a, b) => {
    const dateA = new Date(a.dateReceived).getTime();
    const dateB = new Date(b.dateReceived).getTime();
    return dateB - dateA;
  });

  return (
    <div className={`${className}`}>
      {/* Section Header - Liquid Glass */}
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6 p-4 sm:p-5 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/40 via-transparent to-yellow-50/30 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-white/80 to-amber-50/60 backdrop-blur-sm border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_8px_rgba(217,119,6,0.15)] flex items-center justify-center">
            <TrophyIcon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600/80" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              {t('common:achievements.title')}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              {t('common:achievements.subtitle')}
            </p>
          </div>
        </div>
        {isOwner && onAdd && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="relative flex items-center gap-2 px-4 py-2 sm:py-2.5 bg-white/70 backdrop-blur-sm border border-amber-200/60 text-amber-700 rounded-xl hover:bg-amber-50/80 hover:border-amber-300/60 transition-all shadow-sm text-sm font-semibold"
          >
            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{t('common:achievements.add')}</span>
          </button>
        )}
      </div>

      {/* Achievements Grid — medal badge style */}
      {sortedAchievements.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
          {sortedAchievements.map((achievement) => {
            const IconComponent = getTypeIcon(achievement.type);
            const colors = getTypeBadgeColors(achievement.type);
            const expired = isExpired(achievement.expiryDate);
            const year = new Date(achievement.dateReceived).getFullYear();
            const STAR_COUNT = 10;

            return (
              <div key={achievement.id} className="flex flex-col items-center gap-2 group">
                {/* Badge circle */}
                <div
                  className="relative w-full"
                  style={{ paddingBottom: '100%' }}
                >
                  <div
                    className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{
                      background: colors.bg,
                      border: `4px solid ${colors.ring}`,
                      boxShadow: `0 0 0 2px ${colors.bg}, 0 0 0 4px ${colors.ring}40, inset 0 0 40px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.35)`,
                      opacity: expired ? 0.65 : 1,
                    }}
                  >
                    {/* Inner decorative ring */}
                    <div
                      className="absolute inset-[10%] rounded-full"
                      style={{ border: `1.5px solid ${colors.ring}50` }}
                    />

                    {/* Stars around perimeter */}
                    {Array.from({ length: STAR_COUNT }).map((_, i) => {
                      const angle = (i * 360) / STAR_COUNT;
                      return (
                        <span
                          key={i}
                          className="absolute text-[9px] sm:text-[10px] select-none"
                          style={{
                            top: '50%',
                            left: '50%',
                            color: colors.accent,
                            transform: `rotate(${angle}deg) translateY(-43%) rotate(-${angle}deg)`,
                            marginTop: '-0.5em',
                            marginLeft: '-0.4em',
                            opacity: 0.85,
                          }}
                        >
                          ★
                        </span>
                      );
                    })}

                    {/* Org name at top */}
                    <div
                      className="absolute text-center px-2"
                      style={{ top: '18%', left: 0, right: 0 }}
                    >
                      <p
                        className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-widest truncate"
                        style={{ color: colors.accent }}
                      >
                        {achievement.issuingOrganization}
                      </p>
                    </div>

                    {/* Center: icon + title */}
                    <div className="relative flex flex-col items-center z-10" style={{ marginTop: '-10%' }}>
                      <IconComponent
                        className="w-5 h-5 sm:w-6 sm:h-6 mb-1"
                        style={{ color: colors.accent } as React.CSSProperties}
                      />
                      <p
                        className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-tight px-4"
                        style={{ color: colors.text, wordBreak: 'break-word' }}
                      >
                        {achievement.title}
                      </p>
                    </div>

                    {/* Ribbon / banner with year */}
                    <div
                      className="absolute left-0 right-0 flex items-center justify-center py-1.5"
                      style={{ top: '62%', background: colors.ribbon }}
                    >
                      {/* ribbon side notches */}
                      <div
                        className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45"
                        style={{ background: colors.ribbon }}
                      />
                      <div
                        className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45"
                        style={{ background: colors.ribbon }}
                      />
                      <p
                        className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em]"
                        style={{ color: colors.accent }}
                      >
                        {expired ? 'EXPIRED' : `YEAR ${year}`}
                      </p>
                    </div>

                    {/* Verified dot */}
                    {achievement.isVerified && (
                      <div
                        className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: '#16a34a', boxShadow: '0 0 6px #16a34a80' }}
                        title={t('common:achievements.verified')}
                      >
                        <CheckCircleIcon className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Below badge: description + doc link */}
                {(achievement.description || achievement.documentUrl) && (
                  <div className="text-center space-y-1">
                    {achievement.description && (
                      <p className="text-[11px] text-neutral-500 line-clamp-2 leading-snug">
                        {achievement.description}
                      </p>
                    )}
                    {achievement.documentUrl && (
                      <a
                        href={achievement.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                      >
                        <DocumentTextIcon className="w-3 h-3" />
                        {t('common:achievements.viewDocument')}
                      </a>
                    )}
                  </div>
                )}

                {/* Owner actions (appear below badge on hover) */}
                {isOwner && (onEdit || onDelete) && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(achievement)}
                        className="p-1.5 bg-white/80 backdrop-blur-sm text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors border border-neutral-200/60 shadow-sm"
                        title={t('common:edit')}
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(achievement.id)}
                        disabled={deletingId === achievement.id}
                        className="p-1.5 bg-red-50/80 backdrop-blur-sm text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 border border-red-200/50 shadow-sm"
                        title={t('common:delete')}
                      >
                        {deletingId === achievement.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <TrashIcon className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State - Liquid Glass */
        <div className="relative rounded-2xl p-6 sm:p-10 text-center bg-white/50 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/20 via-transparent to-yellow-50/20 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent" />

          <div className="relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-white/80 to-amber-50/50 backdrop-blur-sm border border-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_12px_rgba(217,119,6,0.1)] flex items-center justify-center">
              <TrophyIcon className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500/60" />
            </div>
            <p className="text-sm sm:text-base text-neutral-500 max-w-sm mx-auto">
              {isOwner
                ? t('common:achievements.emptyOwner')
                : t('common:achievements.empty')}
            </p>
            {isOwner && onAdd && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-4 sm:mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-white/70 backdrop-blur-sm border border-amber-200/60 text-amber-700 rounded-xl hover:bg-amber-50/80 hover:border-amber-300/60 transition-all shadow-sm text-sm font-semibold"
              >
                <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                {t('common:achievements.addFirst')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleCloseModal}
          />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-neutral-100">
              <h3 className="text-lg sm:text-xl font-bold text-neutral-900">
                {editingAchievement
                  ? t('common:achievements.editTitle')
                  : t('common:achievements.addTitle')}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('common:achievements.form.type')} *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {ACHIEVEMENT_TYPES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: value }))}
                      className={`flex flex-col items-center gap-1.5 p-2.5 sm:p-3 rounded-xl border-2 transition-all ${
                        formData.type === value
                          ? 'border-amber-400 bg-amber-50/80'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${formData.type === value ? 'text-amber-600' : 'text-neutral-400'}`} />
                      <span className={`text-[10px] sm:text-xs font-medium ${formData.type === value ? 'text-amber-700' : 'text-neutral-500'}`}>
                        {t(`common:achievements.types.${value}`)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('common:achievements.form.title')} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, title: e.target.value }));
                    if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
                    if (submitError) setSubmitError(null);
                  }}
                  placeholder={t('common:achievements.form.titlePlaceholder')}
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? 'title-error' : undefined}
                  className={`w-full px-4 py-3 bg-neutral-50 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm sm:text-base ${errors.title ? 'border-red-400 bg-red-50/30' : 'border-neutral-200'}`}
                />
                {errors.title && (
                  <p id="title-error" className="mt-1 text-xs text-red-600" role="alert">{errors.title}</p>
                )}
              </div>

              {/* Issuing Organization */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('common:achievements.form.organization')} *
                </label>
                <input
                  type="text"
                  value={formData.issuingOrganization}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, issuingOrganization: e.target.value }));
                    if (errors.issuingOrganization) setErrors(prev => ({ ...prev, issuingOrganization: undefined }));
                    if (submitError) setSubmitError(null);
                  }}
                  placeholder={t('common:achievements.form.organizationPlaceholder')}
                  aria-invalid={!!errors.issuingOrganization}
                  aria-describedby={errors.issuingOrganization ? 'org-error' : undefined}
                  className={`w-full px-4 py-3 bg-neutral-50 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm sm:text-base ${errors.issuingOrganization ? 'border-red-400 bg-red-50/30' : 'border-neutral-200'}`}
                />
                {errors.issuingOrganization && (
                  <p id="org-error" className="mt-1 text-xs text-red-600" role="alert">{errors.issuingOrganization}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('common:achievements.form.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('common:achievements.form.descriptionPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-sm sm:text-base"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('common:achievements.form.dateReceived')} *
                  </label>
                  <input
                    type="text"
                    value={formData.dateReceived}
                    onChange={(e) => applyDateChange(e, (v) => {
                      setFormData(prev => ({ ...prev, dateReceived: v }));
                      if (errors.dateReceived) setErrors(prev => ({ ...prev, dateReceived: undefined }));
                      if (errors.expiryDate) setErrors(prev => ({ ...prev, expiryDate: undefined }));
                    })}
                    placeholder="DD/MM/YYYY"
                    maxLength={10}
                    inputMode="numeric"
                    aria-invalid={!!errors.dateReceived}
                    aria-describedby={errors.dateReceived ? 'date-received-error' : undefined}
                    className={`w-full px-4 py-3 bg-neutral-50 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm sm:text-base ${errors.dateReceived ? 'border-red-400 bg-red-50/30' : 'border-neutral-200'}`}
                  />
                  {errors.dateReceived && (
                    <p id="date-received-error" className="mt-1 text-xs text-red-600" role="alert">{errors.dateReceived}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('common:achievements.form.expiryDate')}
                  </label>
                  <input
                    type="text"
                    value={formData.expiryDate}
                    onChange={(e) => applyDateChange(e, (v) => {
                      setFormData(prev => ({ ...prev, expiryDate: v }));
                      if (errors.expiryDate) setErrors(prev => ({ ...prev, expiryDate: undefined }));
                    })}
                    placeholder="DD/MM/YYYY"
                    maxLength={10}
                    inputMode="numeric"
                    aria-invalid={!!errors.expiryDate}
                    aria-describedby={errors.expiryDate ? 'expiry-error' : undefined}
                    className={`w-full px-4 py-3 bg-neutral-50 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm sm:text-base ${errors.expiryDate ? 'border-red-400 bg-red-50/30' : 'border-neutral-200'}`}
                  />
                  {errors.expiryDate && (
                    <p id="expiry-error" className="mt-1 text-xs text-red-600" role="alert">{errors.expiryDate}</p>
                  )}
                </div>
              </div>

              {/* Document URL */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('common:achievements.form.documentUrl')}
                </label>
                <input
                  type="url"
                  value={formData.documentUrl}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, documentUrl: e.target.value }));
                    if (errors.documentUrl) setErrors(prev => ({ ...prev, documentUrl: undefined }));
                  }}
                  placeholder="https://..."
                  aria-invalid={!!errors.documentUrl}
                  aria-describedby={errors.documentUrl ? 'doc-url-error' : undefined}
                  className={`w-full px-4 py-3 bg-neutral-50 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm sm:text-base ${errors.documentUrl ? 'border-red-400 bg-red-50/30' : 'border-neutral-200'}`}
                />
                {errors.documentUrl ? (
                  <p id="doc-url-error" className="mt-1 text-xs text-red-600" role="alert">{errors.documentUrl}</p>
                ) : (
                  <p className="mt-1 text-[10px] sm:text-xs text-neutral-400">
                    {t('common:achievements.form.documentHint')}
                  </p>
                )}
              </div>

              {/* Submit error */}
              {submitError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700" role="alert">
                  {submitError}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors text-sm font-medium"
                >
                  {t('common:cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-xl hover:from-amber-600 hover:to-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-lg shadow-amber-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('common:saving')}
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      {editingAchievement
                        ? t('common:saveChanges')
                        : t('common:achievements.addButton')}
                    </>
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

export default AchievementsSection;
