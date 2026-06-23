import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Lead } from '../types';
import { STAGE_COLORS } from '../types';

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  onStageChange?: (stage: string) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

function formatRelativeDate(dateStr?: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.round((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en', { day: 'numeric', month: 'short' });
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const { t } = useTranslation('crm');

  const isOverdue =
    lead.nextActionDate && new Date(lead.nextActionDate) < new Date();

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
          {lead.name}
        </p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[lead.stage]}`}>
          {t(`stage.${lead.stage}`)}
        </span>
      </div>

      {/* Email */}
      <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{lead.email}</p>

      {/* Property */}
      {lead.propertyTitle && (
        <p className="mt-1.5 truncate text-xs text-blue-600 dark:text-blue-400">
          {lead.propertyTitle}
        </p>
      )}

      {/* Budget + Location */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {lead.budget !== undefined && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {formatCurrency(lead.budget)}
          </span>
        )}
        {lead.preferredLocation && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {lead.preferredLocation}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-2.5 flex items-center justify-between text-xs text-gray-400">
        <span>{formatRelativeDate(lead.createdAt)}</span>
        {lead.nextActionDate && (
          <span className={isOverdue ? 'font-medium text-red-500' : 'text-gray-500'}>
            {isOverdue ? '⚠ ' : ''}
            {t('lead.nextAction')}: {new Date(lead.nextActionDate).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
    </button>
  );
}
