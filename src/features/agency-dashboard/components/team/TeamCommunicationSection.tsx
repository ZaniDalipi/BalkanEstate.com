import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgencyTeamFeed } from '../../hooks/useAgencyTeamFeed';
import { useCreateTeamNote } from '../../hooks/useAgencyDashboardMutations';
import ActivityFeed from './ActivityFeed';
import TeamNotes from './TeamNotes';

interface TeamCommunicationSectionProps {
  agencyId: string;
}

const TeamCommunicationSection: React.FC<TeamCommunicationSectionProps> = ({ agencyId }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const { feed, isLoading: isFeedLoading, error: feedError } = useAgencyTeamFeed(agencyId);
  const { createTeamNote, isLoading: isCreatingNote } = useCreateTeamNote(agencyId);
  const [activeTab, setActiveTab] = useState<'feed' | 'notes'>('feed');

  const handleCreateNote = async (content: string) => {
    try {
      await createTeamNote({ content, type: 'general' });
    } catch {
      // Error handled by mutation hook
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {t('agencyDashboard:team.title', 'Team Communication')}
      </h2>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('feed')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'feed'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('agencyDashboard:team.activityFeed', 'Activity Feed')}
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'notes'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('agencyDashboard:team.notes', 'Team Notes')}
        </button>
      </div>

      {activeTab === 'feed' ? (
        <ActivityFeed
          feed={feed ?? []}
          isLoading={isFeedLoading}
          error={feedError}
        />
      ) : (
        <TeamNotes
          agencyId={agencyId}
          onCreateNote={handleCreateNote}
          isCreating={isCreatingNote}
        />
      )}
    </div>
  );
};

export default TeamCommunicationSection;
