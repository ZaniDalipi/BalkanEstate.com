import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ProfileFormProps {
  agency: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
  isSaving: boolean;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ agency, onSave, isSaving }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const [formData, setFormData] = useState({
    name: (agency.name as string) || '',
    description: (agency.description as string) || '',
    email: (agency.email as string) || '',
    phone: (agency.phone as string) || '',
    address: (agency.address as string) || '',
    city: (agency.city as string) || '',
    country: (agency.country as string) || '',
    website: (agency.website as string) || '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const fields = [
    { key: 'name', label: t('agencyDashboard:profile.name', 'Agency Name'), required: true },
    { key: 'email', label: t('agencyDashboard:profile.email', 'Email'), type: 'email', required: true },
    { key: 'phone', label: t('agencyDashboard:profile.phone', 'Phone'), required: true },
    { key: 'website', label: t('agencyDashboard:profile.website', 'Website'), type: 'url' },
    { key: 'address', label: t('agencyDashboard:profile.address', 'Address') },
    { key: 'city', label: t('agencyDashboard:profile.city', 'City') },
    { key: 'country', label: t('agencyDashboard:profile.country', 'Country') },
  ];

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('agencyDashboard:profile.basicInfo', 'Basic Information')}
      </h3>

      <div className="space-y-4">
        {fields.map(({ key, label, type, required }) => (
          <div key={key}>
            <label htmlFor={`profile-${key}`} className="block text-sm font-medium text-gray-700 mb-1">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
              id={`profile-${key}`}
              type={type || 'text'}
              value={formData[key as keyof typeof formData]}
              onChange={(e) => handleChange(key, e.target.value)}
              required={required}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        ))}

        <div>
          <label htmlFor="profile-description" className="block text-sm font-medium text-gray-700 mb-1">
            {t('agencyDashboard:profile.description', 'Description')}
          </label>
          <textarea
            id="profile-description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
        >
          {isSaving
            ? t('agencyDashboard:profile.saving', 'Saving...')
            : t('agencyDashboard:profile.save', 'Save Changes')}
        </button>
      </div>
    </form>
  );
};

export default ProfileForm;
