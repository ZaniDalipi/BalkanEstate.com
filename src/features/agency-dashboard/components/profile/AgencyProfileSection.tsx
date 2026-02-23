import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAgency, useUpdateAgency } from '@/src/features/agencies/hooks';
import ProfileForm from './ProfileForm';
import AchievementsPanel from './AchievementsPanel';

interface AgencyProfileSectionProps {
  agencyId: string;
}

const AgencyProfileSection: React.FC<AgencyProfileSectionProps> = ({ agencyId }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const { agency, isLoading, error } = useAgency(agencyId);
  const { updateAgency, isLoading: isSaving } = useUpdateAgency();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white rounded-xl p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-medium">
          {t('agencyDashboard:profile.loadError', 'Failed to load agency profile.')}
        </p>
      </div>
    );
  }

  const agencyRecord = agency as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {t('agencyDashboard:profile.title', 'Agency Profile')}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProfileForm
            agency={agencyRecord}
            onSave={(agencyData) => updateAgency({ agencyId, agencyData })}
            isSaving={isSaving}
          />
        </div>
        <div>
          <AchievementsPanel
            achievements={(agencyRecord.achievements as Array<{
              id: string;
              type: string;
              title: string;
              description?: string;
              dateReceived: string;
              issuingOrganization: string;
              isVerified: boolean;
            }>) || []}
            agencyId={agencyId}
          />
        </div>
      </div>
    </div>
  );
};

export default AgencyProfileSection;
