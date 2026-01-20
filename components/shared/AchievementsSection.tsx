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
      console.error('Error saving achievement:', error);
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
      console.error('Error deleting achievement:', error);
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
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
            <TrophyIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('achievements.title', 'Achievements & Awards')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('achievements.subtitle', 'Professional recognitions and certifications')}
            </p>
          </div>
        </div>
        {isOwner && onAdd && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-xl hover:from-amber-600 hover:to-yellow-700 transition-all shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="hidden sm:inline">{t('achievements.add', 'Add Achievement')}</span>
          </button>
        )}
      </div>

      {/* Achievements Grid */}
      {sortedAchievements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAchievements.map((achievement) => {
            const IconComponent = getTypeIcon(achievement.type);
            const gradientColor = getTypeColor(achievement.type);
            const expired = isExpired(achievement.expiryDate);

            return (
              <div
                key={achievement.id}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl p-5 border ${
                  expired
                    ? 'border-red-200 dark:border-red-800/50 opacity-75'
                    : 'border-gray-100 dark:border-gray-700'
                } hover:shadow-lg transition-all group`}
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  {achievement.isVerified && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                      <CheckCircleIcon className="w-3 h-3" />
                      {t('achievements.verified', 'Verified')}
                    </div>
                  )}
                  {expired && (
                    <div className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full">
                      {t('achievements.expired', 'Expired')}
                    </div>
                  )}
                </div>

                {/* Icon */}
                <div className={`w-12 h-12 bg-gradient-to-br ${gradientColor} rounded-xl flex items-center justify-center shadow-lg mb-4`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t(`achievements.types.${achievement.type}`, achievement.type)}
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg line-clamp-2">
                    {achievement.title}
                  </h3>
                  {achievement.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {achievement.description}
                    </p>
                  )}

                  {/* Organization */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <BuildingOfficeIcon className="w-4 h-4" />
                    <span className="truncate">{achievement.issuingOrganization}</span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <CalendarIcon className="w-4 h-4" />
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
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <DocumentTextIcon className="w-4 h-4" />
                      {t('achievements.viewDocument', 'View Document')}
                    </a>
                  )}
                </div>

                {/* Owner Actions */}
                {isOwner && (onEdit || onDelete) && (
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                      <button
                        onClick={() => handleOpenEditModal(achievement)}
                        className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title={t('common:edit', 'Edit')}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => handleDelete(achievement.id)}
                        disabled={deletingId === achievement.id}
                        className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                        title={t('common:delete', 'Delete')}
                      >
                        {deletingId === achievement.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <TrashIcon className="w-4 h-4" />
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
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 text-center border border-dashed border-gray-200 dark:border-gray-700">
          <TrophyIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {isOwner
              ? t('achievements.emptyOwner', 'Showcase your achievements and certifications to build trust with clients.')
              : t('achievements.empty', 'No achievements to display yet.')}
          </p>
          {isOwner && onAdd && (
            <button
              onClick={handleOpenAddModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-xl hover:from-amber-600 hover:to-yellow-700 transition-all"
            >
              <PlusIcon className="w-5 h-5" />
              {t('achievements.addFirst', 'Add Your First Achievement')}
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseModal}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingAchievement
                  ? t('achievements.editTitle', 'Edit Achievement')
                  : t('achievements.addTitle', 'Add Achievement')}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('achievements.form.type', 'Type')} *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {ACHIEVEMENT_TYPES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: value }))}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        formData.type === value
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${formData.type === value ? 'text-amber-600' : 'text-gray-500'}`} />
                      <span className={`text-xs font-medium ${formData.type === value ? 'text-amber-700 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {t(`achievements.types.${value}`, label)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('achievements.form.title', 'Title')} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={t('achievements.form.titlePlaceholder', 'e.g., Top Producer Award 2024')}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Issuing Organization */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('achievements.form.organization', 'Issuing Organization')} *
                </label>
                <input
                  type="text"
                  value={formData.issuingOrganization}
                  onChange={(e) => setFormData(prev => ({ ...prev, issuingOrganization: e.target.value }))}
                  placeholder={t('achievements.form.organizationPlaceholder', 'e.g., National Association of Realtors')}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('achievements.form.description', 'Description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('achievements.form.descriptionPlaceholder', 'Brief description of this achievement...')}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('achievements.form.dateReceived', 'Date Received')} *
                  </label>
                  <input
                    type="date"
                    value={formData.dateReceived}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateReceived: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('achievements.form.expiryDate', 'Expiry Date')}
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Document URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('achievements.form.documentUrl', 'Document/Certificate URL')}
                </label>
                <input
                  type="url"
                  value={formData.documentUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('achievements.form.documentHint', 'Link to your certificate or supporting documentation')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  {t('common:cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.title || !formData.issuingOrganization || !formData.dateReceived}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-xl hover:from-amber-600 hover:to-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('common:saving', 'Saving...')}
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      {editingAchievement
                        ? t('common:saveChanges', 'Save Changes')
                        : t('achievements.addButton', 'Add Achievement')}
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
