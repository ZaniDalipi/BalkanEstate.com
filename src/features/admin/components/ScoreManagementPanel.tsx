import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScoreManagement } from '../hooks/useScoreManagement';

interface ScoreManagementPanelProps {
  className?: string;
}

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  disabled: boolean;
  isRunning: boolean;
}

const Spinner: React.FC = () => (
  <svg
    className="animate-spin h-4 w-4 text-white inline-block mr-2"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, disabled, isRunning }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-busy={isRunning}
    className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
  >
    {isRunning && <Spinner />}
    {label}
  </button>
);

export const ScoreManagementPanel: React.FC<ScoreManagementPanelProps> = ({ className }) => {
  const { t } = useTranslation('admin');
  const { recomputeAgents, recomputeAgencies, recomputeAll, isRunning, lastResult, error } = useScoreManagement();
  const [infoOpen, setInfoOpen] = useState(false);

  const successCount =
    lastResult?.kind === 'all'
      ? lastResult.data.totalUpdated
      : lastResult?.data.updated ?? 0;

  return (
    <section
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 ${className ?? ''}`}
      aria-labelledby="score-mgmt-title"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 id="score-mgmt-title" className="text-base font-bold text-gray-900">
            📊 {t('scoring.title', 'Score Management')}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('scoring.description', 'Recompute composite scores for agents and agencies.')}</p>
        </div>
        <button
          type="button"
          onClick={() => setInfoOpen(v => !v)}
          aria-expanded={infoOpen}
          aria-controls="score-mgmt-info"
          className="text-xs text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
        >
          {t('scoring.howItWorks', 'How scoring works')} {infoOpen ? '▲' : '▼'}
        </button>
      </div>

      {infoOpen && (
        <div id="score-mgmt-info" className="bg-blue-50 rounded-xl p-3 text-xs text-blue-800 space-y-1">
          <p>{t('scoring.agentFormula', 'Agents: rating×20 + sales×5 + listings×2 + reviews×1 (max 180 pts)')}</p>
          <p>{t('scoring.agencyFormula', 'Agencies: listings×3 + team×5 + experience×2 + featured×20 (max 160 pts)')}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <ActionButton
          label={t('scoring.recomputeAgents', 'Recompute Agent Scores')}
          onClick={recomputeAgents}
          disabled={isRunning}
          isRunning={isRunning}
        />
        <ActionButton
          label={t('scoring.recomputeAgencies', 'Recompute Agency Scores')}
          onClick={recomputeAgencies}
          disabled={isRunning}
          isRunning={isRunning}
        />
        <ActionButton
          label={t('scoring.recomputeAll', 'Recompute All Scores')}
          onClick={recomputeAll}
          disabled={isRunning}
          isRunning={isRunning}
        />
      </div>

      <div role="status" aria-live="polite" className="min-h-[1.5rem]">
        {isRunning && (
          <p className="text-sm text-blue-600 font-medium">{t('scoring.running', 'Running...')}</p>
        )}
        {!isRunning && lastResult && !error && (
          <p className="text-sm text-green-600 font-medium">
            ✓ {t('scoring.success', { count: successCount, defaultValue: `Updated ${successCount} records` })}
          </p>
        )}
        {!isRunning && error && (
          <p className="text-sm text-red-600 font-medium" role="alert">
            ✕ {error || t('scoring.error', 'Failed to recompute scores')}
          </p>
        )}
      </div>
    </section>
  );
};

export default ScoreManagementPanel;
