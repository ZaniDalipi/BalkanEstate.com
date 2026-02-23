import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { agencyDashboardKeys } from '../../api/agencyDashboardKeys';
import { getTeamNotes } from '../../api/agencyDashboardApi';
import { DocumentTextIcon } from '@/constants';
import type { TeamNote } from '../../types';

interface TeamNotesProps {
  agencyId: string;
  onCreateNote: (content: string) => void;
  isCreating: boolean;
}

const TeamNotes: React.FC<TeamNotesProps> = ({ agencyId, onCreateNote, isCreating }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const [newNote, setNewNote] = useState('');

  const { data: notes, isLoading } = useQuery<TeamNote[]>({
    queryKey: agencyDashboardKeys.teamNotes(agencyId),
    queryFn: () => getTeamNotes(agencyId),
    staleTime: 2 * 60 * 1000,
    enabled: !!agencyId,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = newNote.trim();
    if (!content) return;
    onCreateNote(content);
    setNewNote('');
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder={t('agencyDashboard:team.notePlaceholder', 'Write a note for the team...')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={isCreating || !newNote.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCreating
              ? t('agencyDashboard:team.posting', 'Posting...')
              : t('agencyDashboard:team.postNote', 'Post Note')}
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : !notes || notes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {t('agencyDashboard:team.noNotes', 'No team notes yet. Be the first to post!')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.content}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <span className="font-medium">{note.authorName}</span>
                <span>&middot;</span>
                <span>{new Date(note.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamNotes;
