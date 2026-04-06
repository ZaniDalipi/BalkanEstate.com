import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckBadgeIcon, TrophyIcon } from '@/constants';

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

const typeIcons: Record<string, string> = {
  award: 'bg-amber-100 text-amber-700',
  certification: 'bg-green-100 text-green-700',
  milestone: 'bg-blue-100 text-blue-700',
  recognition: 'bg-purple-100 text-purple-700',
  membership: 'bg-indigo-100 text-indigo-700',
};

const AchievementsPanel: React.FC<AchievementsPanelProps> = ({ achievements }) => {
  const { t } = useTranslation(['agencyDashboard']);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('agencyDashboard:profile.achievements', 'Achievements & Certifications')}
      </h3>

      {achievements.length === 0 ? (
        <div className="text-center py-8">
          <TrophyIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
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
              <div className={`p-2 rounded-lg ${typeIcons[achievement.type] || 'bg-gray-100 text-gray-700'}`}>
                <TrophyIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {achievement.title}
                  </p>
                  {achievement.isVerified && (
                    <CheckBadgeIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {achievement.issuingOrganization}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(achievement.dateReceived).toLocaleDateString('en-GB')}
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
