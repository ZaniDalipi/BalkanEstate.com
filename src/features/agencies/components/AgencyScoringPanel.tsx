import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AGENCY_SCORING_METRIC_DEFS, AGENCY_MAX_SCORE } from '../utils/agencyScoring';
import { ChevronDownIcon } from '@/constants';
import { cn } from '@/lib/utils';

interface AgencyScoringPanelProps {
  defaultCollapsed?: boolean;
  className?: string;
}

interface MetricCardProps {
  icon: string;
  label: string;
  formula: string;
  desc: string;
  cap: string;
  maxPts: number;
  color: string;
  bg: string;
  border: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon, label, formula, desc, cap, maxPts, color, bg, border,
}) => (
  <div
    role="listitem"
    style={{ background: bg, border: `1px solid ${border}` }}
    className="rounded-2xl p-4 flex flex-col items-center text-center gap-2"
  >
    <span className="text-2xl leading-none" role="img" aria-hidden="true">{icon}</span>

    <span className="text-xs font-bold text-gray-900 leading-tight">{label}</span>

    <span
      className="text-sm font-extrabold rounded-lg px-2 py-0.5"
      style={{ color, background: `${color}14` }}
    >
      {formula}
    </span>

    <p className="text-[11px] text-gray-500 leading-relaxed flex-1">{desc}</p>

    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400 font-medium">0 pts</span>
        <span className="text-[10px] font-bold" style={{ color }}>{maxPts} pts</span>
      </div>
      <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${(maxPts / AGENCY_MAX_SCORE) * 100}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
          }}
        />
      </div>
    </div>

    <span
      className="text-[10px] font-bold rounded-full px-2.5 py-0.5"
      style={{ color, background: `${color}12`, border: `1px solid ${color}28` }}
    >
      {cap}
    </span>
  </div>
);

const AgencyScoringPanel: React.FC<AgencyScoringPanelProps> = ({
  defaultCollapsed = false,
  className,
}) => {
  const { t } = useTranslation(['agencies', 'common']);
  const [open, setOpen] = useState(!defaultCollapsed);

  let metricsContent: React.ReactNode;
  try {
    metricsContent = AGENCY_SCORING_METRIC_DEFS.map((m) => (
      <MetricCard
        key={m.key}
        icon={m.icon}
        label={t(m.labelKey, m.labelKey.split('.').pop() ?? m.key)}
        formula={t(m.formulaKey, m.formulaKey.split('.').pop() ?? '')}
        desc={t(m.descKey, '')}
        cap={t(m.capKey, `Max ${m.maxPts} pts`)}
        maxPts={m.maxPts}
        color={m.color}
        bg={m.bg}
        border={m.border}
      />
    ));
  } catch {
    metricsContent = (
      <p className="col-span-full text-sm text-gray-400 text-center py-4">
        {t('common:errors.genericError', 'Unable to load scoring information.')}
      </p>
    );
  }

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden',
        className
      )}
      role="region"
      aria-label={t('agencies:scoring.panelTitle', 'How the agency score works')}
    >
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="agency-scoring-body"
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4 hover:bg-gray-50 transition-colors duration-150 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-base" aria-hidden="true">🏢</span>
          <span className="text-sm font-bold text-gray-900 truncate">
            {t('agencies:scoring.panelTitle', 'How the agency score works')}
          </span>
          <span className="hidden sm:inline-flex items-center text-xs text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5 whitespace-nowrap flex-shrink-0">
            {t('agencies:scoring.maxPossible', { max: AGENCY_MAX_SCORE, defaultValue: `Max ${AGENCY_MAX_SCORE} pts` })}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400 hidden xs:inline">
            {open
              ? t('agencies:scoring.toggleHide', 'Hide details')
              : t('agencies:scoring.toggleShow', 'Show details')}
          </span>
          <ChevronDownIcon
            className={cn(
              'w-4 h-4 text-gray-400 transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Collapsible body */}
      <div
        id="agency-scoring-body"
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden',
          open ? 'max-h-[2400px] opacity-100' : 'max-h-0 opacity-0'
        )}
        aria-hidden={!open}
      >
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1">
          <p className="sm:hidden text-[11px] text-gray-400 mb-3">
            {t('agencies:scoring.maxPossible', { max: AGENCY_MAX_SCORE, defaultValue: `Max possible: ${AGENCY_MAX_SCORE} pts` })}
          </p>

          <div
            role="list"
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {metricsContent}
          </div>

          <p className="mt-3 text-[11px] text-gray-400 text-center">
            {t(
              'agencies:scoring.footerNote',
              'Scores update weekly. Add more listings, grow your team, and get featured to climb the rankings.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgencyScoringPanel;
