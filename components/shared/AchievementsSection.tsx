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

const getTypeColor = (type: Achievement['type']) => {
  switch (type) {
    case 'award':
      return 'from-amber-500 to-yellow-600';
    case 'certification':
      return 'from-blue-500 to-indigo-600';
    case 'milestone':
      return 'from-purple-500 to-pink-600';
    case 'recognition':
      return 'from-green-500 to-emerald-600';
    case 'membership':
      return 'from-cyan-500 to-teal-600';
    default:
      return 'from-gray-500 to-gray-600';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    type: 'award' as Achievement['type'],
    title: '',
    description: '',
    dateReceived: '',
    expiryDate: '',
    issuingOrganization: '',
    documentUrl: ''
  });

  const resetForm = () => {
    setFormData({
      type: 'award',
      title: '',
      description: '',
      dateReceived: '',
      expiryDate: '',
      issuingOrganization: '',
      documentUrl: ''
    });
    setEditingAchievement(null);
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
        ? new Date(achievement.dateReceived).toISOString().split('T')[0]
        : '',
      expiryDate: achievement.expiryDate
        ? new Date(achievement.expiryDate).toISOString().split('T')[0]
        : '',
      issuingOrganization: achievement.issuingOrganization,
      documentUrl: achievement.documentUrl || ''
    });
    setEditingAchievement(achievement);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!formData.title || !formData.issuingOrganization || !formData.dateReceived) return;

    setIsSubmitting(true);
    try {
      const achievementData = {
        type: formData.type,
        title: formData.title,
        description: formData.description || undefined,
        dateReceived: new Date(formData.dateReceived),
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined,
        issuingOrganization: formData.issuingOrganization,
        documentUrl: formData.documentUrl || undefined
      };

      if (editingAchievement && onEdit) {
        await onEdit(editingAchievement.id, achievementData);
      } else if (onAdd) {
        await onAdd(achievementData);
      }

      handleCloseModal();
    } catch (error) {
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

      {/* Achievements Grid */}
      {sortedAchievements.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {sortedAchievements.map((achievement) => {
            const IconComponent = getTypeIcon(achievement.type);
            const gradientColor = getTypeColor(achievement.type);
            const expired = isExpired(achievement.expiryDate);

            return (
              <div
                key={achievement.id}
                className={`relative bg-white/70 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border ${
                  expired
                    ? 'border-red-200/60 opacity-75'
                    : 'border-white/50'
                } shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all group overflow-hidden`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />

                {/* Status Badge */}
                <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex items-center gap-2 z-10">
                  {achievement.isVerified && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50/80 backdrop-blur-sm text-green-700 text-[10px] sm:text-xs font-medium rounded-full border border-green-200/50">
                      <CheckCircleIcon className="w-3 h-3" />
                      {t('common:achievements.verified')}
                    </div>
                  )}
                  {expired && (
                    <div className="px-2 py-0.5 bg-red-50/80 backdrop-blur-sm text-red-700 text-[10px] sm:text-xs font-medium rounded-full border border-red-200/50">
                      {t('common:achievements.expired')}
                    </div>
                  )}
                </div>

                {/* Icon */}
                <div className={`relative w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${gradientColor} rounded-xl flex items-center justify-center shadow-lg mb-3 sm:mb-4`}>
                  <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>

                {/* Content */}
                <div className="relative space-y-1.5 sm:space-y-2">
                  <div className="text-[10px] sm:text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    {t(`common:achievements.types.${achievement.type}`)}
                  </div>
                  <h3 className="font-bold text-neutral-900 text-sm sm:text-lg line-clamp-2 pr-16">
                    {achievement.title}
                  </h3>
                  {achievement.description && (
                    <p className="text-xs sm:text-sm text-neutral-600 line-clamp-2">
                      {achievement.description}
                    </p>
                  )}

                  {/* Organization */}
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500">
                    <BuildingOfficeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{achievement.issuingOrganization}</span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500">
                    <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>{formatDate(achievement.dateReceived)}</span>
                    {achievement.expiryDate && (
                      <span className={expired ? 'text-red-500' : ''}>
                        → {formatDate(achievement.expiryDate)}
                      </span>
                    )}
                  </div>

                  {/* Document Link */}
                  {achievement.documentUrl && (
                    <a
                      href={achievement.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-blue-600 hover:underline"
                    >
                      <DocumentTextIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {t('common:achievements.viewDocument')}
                    </a>
                  )}
                </div>

                {/* Owner Actions */}
                {isOwner && (onEdit || onDelete) && (
                  <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(achievement)}
                        className="p-1.5 sm:p-2 bg-white/80 backdrop-blur-sm text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors border border-neutral-200/50"
                        title={t('common:edit')}
                      >
                        <PencilIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(achievement.id)}
                        disabled={deletingId === achievement.id}
                        className="p-1.5 sm:p-2 bg-red-50/80 backdrop-blur-sm text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 border border-red-200/50"
                        title={t('common:delete')}
                      >
                        {deletingId === achievement.id ? (
                          <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <TrashIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={t('common:achievements.form.titlePlaceholder')}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm sm:text-base"
                  required
                />
              </div>

              {/* Issuing Organization */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('common:achievements.form.organization')} *
                </label>
                <input
                  type="text"
                  value={formData.issuingOrganization}
                  onChange={(e) => setFormData(prev => ({ ...prev, issuingOrganization: e.target.value }))}
                  placeholder={t('common:achievements.form.organizationPlaceholder')}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm sm:text-base"
                  required
                />
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
                    type="date"
                    value={formData.dateReceived}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateReceived: e.target.value }))}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm sm:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('common:achievements.form.expiryDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm sm:text-base"
                  />
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
                  onChange={(e) => setFormData(prev => ({ ...prev, documentUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm sm:text-base"
                />
                <p className="mt-1 text-[10px] sm:text-xs text-neutral-400">
                  {t('common:achievements.form.documentHint')}
                </p>
              </div>

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
                  disabled={isSubmitting || !formData.title || !formData.issuingOrganization || !formData.dateReceived}
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
