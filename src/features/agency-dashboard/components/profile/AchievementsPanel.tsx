import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';

interface Achievement {
  id: string;
  type: string;
  title: string;
  description?: string;
  dateReceived: string;
  issuingOrganization: string;
  isVerified: boolean;
}

interface AchievementsPanelProps {
  achievements: Achievement[];
  agencyId: string;
}

const typeIcons: Record<string, SoftIconName> = {
  award: 'trophy',
  certification: 'docCheck',
  milestone: 'target',
  recognition: 'medal1',
  membership: 'users',
};

const AchievementsPanel: React.FC<AchievementsPanelProps> = ({ achievements }) => {
  const { t } = useTranslation(['agencyDashboard']);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <SoftIcon name="trophy" className="w-7 h-7 flex-shrink-0" />
        {t('agencyDashboard:profile.achievements', 'Achievements & Certifications')}
      </h3>

      {achievements.length === 0 ? (
        <div className="text-center py-8">
          <SoftIcon name="trophy" className="w-14 h-14 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {t('agencyDashboard:profile.noAchievements', 'No achievements yet.')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <SoftIcon name={typeIcons[achievement.type] || 'trophy'} className="w-9 h-9 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {achievement.title}
                  </p>
                  {achievement.isVerified && (
                    <SoftIcon name="check" className="w-4 h-4 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {achievement.issuingOrganization}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(achievement.dateReceived).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AchievementsPanel;
