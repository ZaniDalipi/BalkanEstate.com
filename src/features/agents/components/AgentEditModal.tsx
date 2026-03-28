import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    XMarkIcon,
    PlusIcon,
    TrophyIcon,
} from '@/constants';
import AchievementsSection from '@/components/shared/AchievementsSection';
import { Achievement } from '@/components/shared/AchievementsSection';
import CredentialsSection from '@/src/features/credentials/components/CredentialsSection';
import { Credential } from '@/src/features/credentials/api/credentialApi';
import { EditFormData } from './useAgentProfile';
import ServiceAreaMapPicker from './ServiceAreaMapPicker';

// Shared input classes (module-level to avoid recreation)
const inputCls =
    'w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all';

/** Helper – tag input row (specializations / languages / service areas) */
const TagInputRow = ({
    field,
    tags,
    placeholder,
    colorScheme,
    onAddArrayItem,
    onRemoveArrayItem,
}: {
    field: 'specializations' | 'languages' | 'serviceAreas';
    tags: string[];
    placeholder: string;
    colorScheme: { bg: string; text: string; hover: string };
    onAddArrayItem: (field: 'specializations' | 'languages' | 'serviceAreas', value: string) => void;
    onRemoveArrayItem: (field: 'specializations' | 'languages' | 'serviceAreas', index: number) => void;
}) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = (e.currentTarget as HTMLInputElement).value.trim();
            if (val) {
                onAddArrayItem(field, val);
                (e.currentTarget as HTMLInputElement).value = '';
            }
        }
    };

    const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
        const input = e.currentTarget
            .previousElementSibling as HTMLInputElement;
        const val = input.value.trim();
        if (val) {
            onAddArrayItem(field, val);
            input.value = '';
        }
    };

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, i) => (
                    <span
                        key={i}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${colorScheme.bg} ${colorScheme.text}`}
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => onRemoveArrayItem(field, i)}
                            className={`hover:${colorScheme.hover} transition-colors`}
                        >
                            <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder={placeholder}
                    className={`flex-1 ${inputCls}`}
                    onKeyDown={handleKeyDown}
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    className="px-3 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex-shrink-0"
                >
                    <PlusIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

interface AgentEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    editForm: EditFormData;
    setEditForm: React.Dispatch<React.SetStateAction<EditFormData>>;
    isSavingProfile: boolean;
    agentAchievements: Achievement[];
    onSaveProfile: (e: React.FormEvent | React.MouseEvent) => void;
    onAddArrayItem: (field: 'specializations' | 'languages' | 'serviceAreas', value: string) => void;
    onRemoveArrayItem: (field: 'specializations' | 'languages' | 'serviceAreas', index: number) => void;
    centerLat?: number | null;
    centerLng?: number | null;
    onAddAchievement: (achievement: Omit<Achievement, 'id' | 'createdAt' | 'isVerified'>) => Promise<void>;
    onEditAchievement: (id: string, achievement: Partial<Achievement>) => Promise<void>;
    onDeleteAchievement: (id: string) => Promise<void>;
    agentCredentials: Credential[];
    onCredentialsChange: (credentials: Credential[]) => void;
    licenseStatus?: 'none' | 'pending' | 'verified' | 'rejected';
    licenseNumber?: string;
    licenseCountry?: string;
    onLicenseSubmitted?: () => void;
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
    licenseStatus,
    licenseNumber,
    licenseCountry,
    onLicenseSubmitted,
    centerLat,
    centerLng,
}) => {
    const { t } = useTranslation(['agents']);

    // Lock body scroll while modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = ''; };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        /*
         * Overlay:
         *  - Mobile  (< sm) : fullscreen, no padding
         *  - Tablet  (sm)   : centered sheet with padding, max-w-xl
         *  - Desktop (md+)  : centered dialog, max-w-2xl
         */
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-stretch sm:items-center justify-center sm:p-4">
            <div
                className="
                    bg-white flex flex-col w-full h-full
                    sm:rounded-2xl sm:h-auto sm:max-w-xl sm:max-h-[90vh]
                    md:max-w-2xl
                    shadow-2xl overflow-hidden
                "
            >
                {/* ── Sticky Header ──────────────────────────────── */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between z-10 flex-shrink-0">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">
                            {t('profilePage.editModal.title')}
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                            {t('profilePage.editModal.subtitle', 'Update your agent profile details')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors ml-3 flex-shrink-0"
                        aria-label="Close"
                    >
                        <XMarkIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* ── Scrollable Body ────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">

                    {/* Bio */}
                    <section>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t('profilePage.editModal.bio')}
                        </label>
                        <textarea
                            value={editForm.bio}
                            onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                            rows={4}
                            className={`${inputCls} resize-none`}
                            placeholder={t('profilePage.editModal.bioPlaceholder')}
                        />
                    </section>

                    {/* Years of Experience */}
                    <section>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t('profilePage.editModal.yearsOfExperience')}
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={editForm.yearsOfExperience}
                            onChange={e =>
                                setEditForm({
                                    ...editForm,
                                    yearsOfExperience: parseInt(e.target.value) || 0,
                                })
                            }
                            className={inputCls}
                        />
                    </section>

                    {/* Specializations */}
                    <section>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t('profilePage.editModal.specializations')}
                        </label>
                        <TagInputRow
                            field="specializations"
                            tags={editForm.specializations}
                            placeholder={t('profilePage.editModal.addSpecialization')}
                            colorScheme={{ bg: 'bg-blue-100', text: 'text-blue-700', hover: 'text-blue-900' }}
                            onAddArrayItem={onAddArrayItem}
                            onRemoveArrayItem={onRemoveArrayItem}
                        />
                    </section>

                    {/* Languages */}
                    <section>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t('profilePage.editModal.languages')}
                        </label>
                        <TagInputRow
                            field="languages"
                            tags={editForm.languages}
                            placeholder={t('profilePage.editModal.addLanguage')}
                            colorScheme={{ bg: 'bg-green-100', text: 'text-green-700', hover: 'text-green-900' }}
                            onAddArrayItem={onAddArrayItem}
                            onRemoveArrayItem={onRemoveArrayItem}
                        />
                    </section>

                    {/* Service Areas */}
                    <section>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t('profilePage.editModal.serviceAreas')}
                        </label>
                        <ServiceAreaMapPicker
                            areas={editForm.serviceAreas}
                            onAdd={(name) => onAddArrayItem('serviceAreas', name)}
                            onRemove={(index) => onRemoveArrayItem('serviceAreas', index)}
                            centerLat={centerLat}
                            centerLng={centerLng}
                        />
                    </section>

                    {/* Contact Information */}
                    <section className="border-t pt-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4">
                            {t('profilePage.editModal.contactInfo')}
                        </h3>
                        {/* Responsive grid: stacks on mobile, 2-col on sm+ */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('profilePage.editModal.officePhone')}
                                </label>
                                <input
                                    type="tel"
                                    value={editForm.officePhone}
                                    onChange={e =>
                                        setEditForm({ ...editForm, officePhone: e.target.value })
                                    }
                                    className={inputCls}
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
                                    onChange={e =>
                                        setEditForm({ ...editForm, officeAddress: e.target.value })
                                    }
                                    className={inputCls}
                                    placeholder={t('profilePage.editModal.officeAddressPlaceholder')}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Social Links */}
                    <section className="border-t pt-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4">
                            {t('profilePage.editModal.socialLinks')}
                        </h3>
                        <div className="space-y-3">
                            {(
                                [
                                    { key: 'websiteUrl' as keyof EditFormData, label: t('profilePage.editModal.website'), placeholder: 'https://www.yourwebsite.com' },
                                    { key: 'facebookUrl' as keyof EditFormData, label: t('profilePage.editModal.facebook', 'Facebook'), placeholder: 'https://facebook.com/yourprofile' },
                                    { key: 'instagramUrl' as keyof EditFormData, label: t('profilePage.editModal.instagram', 'Instagram'), placeholder: 'https://instagram.com/yourprofile' },
                                    { key: 'linkedinUrl' as keyof EditFormData, label: t('profilePage.editModal.linkedin', 'LinkedIn'), placeholder: 'https://linkedin.com/in/yourprofile' },
                                ]
                            ).map(({ key, label, placeholder }) => (
                                <div key={key}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {label}
                                    </label>
                                    <input
                                        type="url"
                                        value={(editForm[key] as string) || ''}
                                        onChange={e =>
                                            setEditForm({ ...editForm, [key]: e.target.value })
                                        }
                                        className={inputCls}
                                        placeholder={placeholder}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Professional Certifications */}
                    <section className="border-t border-gray-200 pt-6">
                        <CredentialsSection
                            credentials={agentCredentials}
                            isOwner={true}
                            onCredentialsChange={onCredentialsChange}
                            className=""
                            licenseStatus={licenseStatus}
                            licenseNumber={licenseNumber}
                            licenseCountry={licenseCountry}
                            onLicenseSubmitted={onLicenseSubmitted}
                        />
                    </section>

                    {/* Awards & Achievements */}
                    <section className="border-t border-gray-200 pt-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
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
                    </section>
                </div>

                {/* ── Sticky Footer – action buttons ─────────────── */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-4 flex gap-3 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
                    >
                        {t('profilePage.editModal.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={onSaveProfile}
                        disabled={isSavingProfile}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm"
                    >
                        {isSavingProfile ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                {t('profilePage.editModal.saving')}
                            </>
                        ) : (
                            t('profilePage.editModal.saveChanges')
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgentEditModal;
