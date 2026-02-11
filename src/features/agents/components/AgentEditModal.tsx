import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    XMarkIcon,
    PlusIcon,
    TrophyIcon,
    AcademicCapIcon,
} from '@/constants';
import AchievementsSection from '@/components/shared/AchievementsSection';
import { Achievement } from '@/components/shared/AchievementsSection';
import CredentialsSection from '@/src/features/credentials/components/CredentialsSection';
import { Credential } from '@/src/features/credentials/api/credentialApi';
import { EditFormData } from './useAgentProfile';

interface AgentEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    editForm: EditFormData;
    setEditForm: React.Dispatch<React.SetStateAction<EditFormData>>;
    isSavingProfile: boolean;
    agentAchievements: Achievement[];
    onSaveProfile: (e: React.FormEvent) => void;
    onAddArrayItem: (field: 'specializations' | 'languages' | 'serviceAreas', value: string) => void;
    onRemoveArrayItem: (field: 'specializations' | 'languages' | 'serviceAreas', index: number) => void;
    onAddAchievement: (achievement: Omit<Achievement, 'id' | 'createdAt' | 'isVerified'>) => Promise<void>;
    onEditAchievement: (id: string, achievement: Partial<Achievement>) => Promise<void>;
    onDeleteAchievement: (id: string) => Promise<void>;
    agentCredentials: Credential[];
    onCredentialsChange: (credentials: Credential[]) => void;
}

const AgentEditModal: React.FC<AgentEditModalProps> = ({
    isOpen,
    onClose,
    editForm,
    setEditForm,
    isSavingProfile,
    agentAchievements,
    onSaveProfile,
    onAddArrayItem,
    onRemoveArrayItem,
    onAddAchievement,
    onEditAchievement,
    onDeleteAchievement,
    agentCredentials,
    onCredentialsChange,
}) => {
    const { t } = useTranslation(['agents']);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="presentation">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" role="dialog" aria-modal="true" aria-label="Edit agent profile">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">{t('profilePage.editModal.title')}</h2>
                    <button
                        onClick={onClose}
                        aria-label="Close edit modal"
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={onSaveProfile} className="p-6 space-y-6">
                    {/* Bio */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t('profilePage.editModal.bio')}
                        </label>
                        <textarea
                            value={editForm.bio}
                            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder={t('profilePage.editModal.bioPlaceholder')}
                        />
                    </div>

                    {/* Years of Experience */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t('profilePage.editModal.yearsOfExperience')}
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={editForm.yearsOfExperience}
                            onChange={(e) => setEditForm({ ...editForm, yearsOfExperience: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Specializations */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t('profilePage.editModal.specializations')}
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {editForm.specializations.map((spec, index) => (
                                <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                    {spec}
                                    <button
                                        type="button"
                                        onClick={() => onRemoveArrayItem('specializations', index)}
                                        className="hover:text-blue-900"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder={t('profilePage.editModal.addSpecialization')}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        onAddArrayItem('specializations', (e.target as HTMLInputElement).value);
                                        (e.target as HTMLInputElement).value = '';
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={(e) => {
                                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                    onAddArrayItem('specializations', input.value);
                                    input.value = '';
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                            >
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Languages */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t('profilePage.editModal.languages')}
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {editForm.languages.map((lang, index) => (
                                <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                    {lang}
                                    <button
                                        type="button"
                                        onClick={() => onRemoveArrayItem('languages', index)}
                                        className="hover:text-green-900"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder={t('profilePage.editModal.addLanguage')}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        onAddArrayItem('languages', (e.target as HTMLInputElement).value);
                                        (e.target as HTMLInputElement).value = '';
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={(e) => {
                                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                    onAddArrayItem('languages', input.value);
                                    input.value = '';
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                            >
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Service Areas */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t('profilePage.editModal.serviceAreas')}
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {editForm.serviceAreas.map((area, index) => (
                                <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                                    {area}
                                    <button
                                        type="button"
                                        onClick={() => onRemoveArrayItem('serviceAreas', index)}
                                        className="hover:text-purple-900"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder={t('profilePage.editModal.addServiceArea')}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        onAddArrayItem('serviceAreas', (e.target as HTMLInputElement).value);
                                        (e.target as HTMLInputElement).value = '';
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={(e) => {
                                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                    onAddArrayItem('serviceAreas', input.value);
                                    input.value = '';
                                }}
                                className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                            >
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profilePage.editModal.contactInfo')}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('profilePage.editModal.officePhone')}
                                </label>
                                <input
                                    type="tel"
                                    value={editForm.officePhone}
                                    onChange={(e) => setEditForm({ ...editForm, officePhone: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="+381 11 123 4567"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('profilePage.editModal.officeAddress')}
                                </label>
                                <input
                                    type="text"
                                    value={editForm.officeAddress}
                                    onChange={(e) => setEditForm({ ...editForm, officeAddress: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={t('profilePage.editModal.officeAddressPlaceholder')}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Social Links */}
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profilePage.editModal.socialLinks')}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('profilePage.editModal.website')}
                                </label>
                                <input
                                    type="url"
                                    value={editForm.websiteUrl}
                                    onChange={(e) => setEditForm({ ...editForm, websiteUrl: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="https://www.yourwebsite.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                                <input
                                    type="url"
                                    value={editForm.facebookUrl}
                                    onChange={(e) => setEditForm({ ...editForm, facebookUrl: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="https://facebook.com/yourprofile"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                                <input
                                    type="url"
                                    value={editForm.instagramUrl}
                                    onChange={(e) => setEditForm({ ...editForm, instagramUrl: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="https://instagram.com/yourprofile"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                                <input
                                    type="url"
                                    value={editForm.linkedinUrl}
                                    onChange={(e) => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="https://linkedin.com/in/yourprofile"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Professional Certifications Section */}
                    <div className="border-t border-gray-200 pt-6">
                        <CredentialsSection
                            credentials={agentCredentials}
                            isOwner={true}
                            onCredentialsChange={onCredentialsChange}
                            className=""
                        />
                    </div>

                    {/* Awards & Achievements Section */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <TrophyIcon className="w-5 h-5 text-amber-500" />
                            {t('profilePage.editModal.achievements', 'Awards & Achievements')}
                        </h3>
                        <AchievementsSection
                            achievements={agentAchievements}
                            isOwner={true}
                            onAdd={onAddAchievement}
                            onEdit={onEditAchievement}
                            onDelete={onDeleteAchievement}
                            entityType="agent"
                            className="bg-gray-50 rounded-xl p-4"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            {t('profilePage.editModal.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSavingProfile}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSavingProfile ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    {t('profilePage.editModal.saving')}
                                </>
                            ) : (
                                t('profilePage.editModal.saveChanges')
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AgentEditModal;
