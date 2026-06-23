import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLead } from '../hooks/useLeads';
import { useUpdateLead, useDeleteLead, useMoveLeadStage, useAddActivity, useArchiveLead } from '../hooks/useLeadMutations';
import { LeadForm } from './LeadForm';
import { PIPELINE_STAGES, STAGE_COLORS, type LeadStage, type UpdateLeadInput } from '../types';

interface LeadDetailModalProps {
  leadId: string;
  onClose: () => void;
}

type Tab = 'overview' | 'activity' | 'edit';

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function LeadDetailModal({ leadId, onClose }: LeadDetailModalProps) {
  const { t } = useTranslation('crm');
  const { lead, isLoading } = useLead(leadId);
  const [tab, setTab] = useState<Tab>('overview');
  const [activityInput, setActivityInput] = useState('');
  const [activityNote, setActivityNote] = useState('');
  const [stageNote, setStageNote] = useState('');
  const [activityError, setActivityError] = useState('');

  const updateMutation = useUpdateLead(leadId);
  const deleteMutation = useDeleteLead();
  const stageMutation = useMoveLeadStage(leadId);
  const activityMutation = useAddActivity(leadId);
  const archiveMutation = useArchiveLead();

  const handleStageChange = (stage: LeadStage) => {
    if (!lead || stage === lead.stage) return;
    stageMutation.mutate({ stage, note: stageNote || undefined });
    setStageNote('');
  };

  const handleAddActivity = () => {
    if (!activityInput.trim()) {
      setActivityError(t('activity.actionRequired'));
      return;
    }
    if (activityInput.trim().length > 200) {
      setActivityError(t('activity.actionTooLong'));
      return;
    }
    setActivityError('');
    activityMutation.mutate(
      { action: activityInput.trim(), note: activityNote.trim() || undefined },
      {
        onSuccess: () => {
          setActivityInput('');
          setActivityNote('');
        },
      }
    );
  };

  const handleUpdate = (data: UpdateLeadInput) => {
    updateMutation.mutate(data, { onSuccess: () => setTab('overview') });
  };

  const handleDelete = () => {
    if (!window.confirm(t('lead.confirmDelete'))) return;
    deleteMutation.mutate(leadId, { onSuccess: onClose });
  };

  const handleArchive = () => {
    if (!lead) return;
    archiveMutation.mutate({ leadId, isArchived: !lead.isArchived });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-gray-900 sm:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-gray-900 dark:text-white">{lead.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{lead.email}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STAGE_COLORS[lead.stage]}`}>
              {t(`stage.${lead.stage}`)}
            </span>
            <button
              onClick={onClose}
              className="ml-2 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-gray-200 dark:border-gray-700">
          {(['overview', 'activity', 'edit'] as Tab[]).map((t_) => (
            <button
              key={t_}
              onClick={() => setTab(t_)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                tab === t_
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {t(`tab.${t_}`)}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'overview' && (
            <div className="space-y-4">
              {/* Pipeline stage selector */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('lead.moveStageTo')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {PIPELINE_STAGES.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStageChange(s)}
                      disabled={s === lead.stage || stageMutation.isPending}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        s === lead.stage
                          ? `${STAGE_COLORS[s]} ring-2 ring-current ring-offset-1`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {t(`stage.${s}`)}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={stageNote}
                  onChange={(e) => setStageNote(e.target.value)}
                  placeholder={t('lead.stageNoteOptional')}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Key details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['phone', lead.phone],
                  ['source', lead.source ? t(`source.${lead.source}`) : undefined],
                  ['budget', lead.budget !== undefined ? `€${lead.budget.toLocaleString()}` : undefined],
                  ['location', lead.preferredLocation],
                  ['propertyType', lead.preferredPropertyType],
                  ['property', lead.propertyTitle],
                  ['nextAction', lead.nextAction],
                  ['nextActionDate', lead.nextActionDate ? new Date(lead.nextActionDate).toLocaleDateString() : undefined],
                  ['created', formatDate(lead.createdAt)],
                  ['lastContacted', lead.lastContactedAt ? formatDate(lead.lastContactedAt) : undefined],
                ].map(([key, val]) =>
                  val ? (
                    <div key={key as string}>
                      <p className="text-xs text-gray-400">{t(`field.${key}`)}</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{val}</p>
                    </div>
                  ) : null
                )}
              </div>

              {/* Notes */}
              {lead.notes && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{t('lead.notes')}</p>
                  <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {lead.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleArchive}
                  disabled={archiveMutation.isPending}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {lead.isArchived ? t('lead.restore') : t('lead.archive')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex-1 rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  {t('lead.delete')}
                </button>
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <div className="space-y-4">
              {/* Add activity */}
              <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                <input
                  type="text"
                  value={activityInput}
                  onChange={(e) => { setActivityInput(e.target.value); setActivityError(''); }}
                  placeholder={t('activity.actionPlaceholder')}
                  maxLength={200}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                {activityError && <p className="mt-1 text-xs text-red-500">{activityError}</p>}
                <textarea
                  value={activityNote}
                  onChange={(e) => setActivityNote(e.target.value)}
                  placeholder={t('activity.notePlaceholder')}
                  rows={2}
                  maxLength={2000}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={handleAddActivity}
                  disabled={activityMutation.isPending}
                  className="mt-2 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {activityMutation.isPending ? t('common.saving') : t('activity.log')}
                </button>
              </div>

              {/* Activity timeline */}
              <div className="space-y-3">
                {[...(lead.activities ?? [])].reverse().map((a) => (
                  <div key={a._id} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {a.action.replace(/_/g, ' ')}
                      </p>
                      {a.note && (
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{a.note}</p>
                      )}
                      <p className="mt-0.5 text-xs text-gray-400">
                        {a.performedByName} · {formatDate(a.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {(!lead.activities || lead.activities.length === 0) && (
                  <p className="text-sm text-gray-400">{t('activity.empty')}</p>
                )}
              </div>
            </div>
          )}

          {tab === 'edit' && (
            <LeadForm
              initialValues={lead}
              onSubmit={handleUpdate}
              isLoading={updateMutation.isPending}
              submitLabel={t('lead.saveChanges')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
