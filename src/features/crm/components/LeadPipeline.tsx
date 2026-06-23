import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLeads, usePipelineSummary } from '../hooks/useLeads';
import { useCreateLead } from '../hooks/useLeadMutations';
import { LeadCard } from './LeadCard';
import { LeadDetailModal } from './LeadDetailModal';
import { LeadForm } from './LeadForm';
import { PIPELINE_STAGES, STAGE_BORDER_COLORS, type LeadStage, type CreateLeadInput } from '../types';

interface LeadPipelineProps {
  /** Show archived leads instead of active */
  showArchived?: boolean;
}

export function LeadPipeline({ showArchived = false }: LeadPipelineProps) {
  const { t } = useTranslation('crm');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const searchTimer = React.useRef<ReturnType<typeof setTimeout>>();
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(value), 350);
  };

  const { leads, isLoading } = useLeads({
    isArchived: showArchived,
    search: debouncedSearch || undefined,
    limit: 200,
  });
  const { summary } = usePipelineSummary();
  const createMutation = useCreateLead();

  const leadsByStage = React.useMemo(() => {
    const map = {} as Record<LeadStage, typeof leads>;
    for (const stage of PIPELINE_STAGES) {
      map[stage] = leads.filter((l) => l.stage === stage);
    }
    return map;
  }, [leads]);

  const handleCreate = (data: CreateLeadInput) => {
    createMutation.mutate(data, {
      onSuccess: () => setShowCreateForm(false),
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 pb-4">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t('pipeline.search')}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <button
          onClick={() => setShowCreateForm(true)}
          className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + {t('lead.new')}
        </button>
      </div>

      {/* Pipeline columns */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.filter((s) => !showArchived || s !== 'new').map((stage) => {
            const columnLeads = leadsByStage[stage] ?? [];
            const count = summary?.[stage] ?? columnLeads.length;
            return (
              <div
                key={stage}
                className={`flex w-60 shrink-0 flex-col rounded-xl border-t-4 bg-gray-50 dark:bg-gray-800/50 ${STAGE_BORDER_COLORS[stage]}`}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    {t(`stage.${stage}`)}
                  </span>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {count}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
                  {columnLeads.length === 0 && (
                    <p className="mt-4 text-center text-xs text-gray-400">{t('pipeline.empty')}</p>
                  )}
                  {columnLeads.map((lead) => (
                    <LeadCard
                      key={lead._id}
                      lead={lead}
                      onClick={() => setSelectedLeadId(lead._id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lead detail modal */}
      {selectedLeadId && (
        <LeadDetailModal
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
        />
      )}

      {/* Create lead modal */}
      {showCreateForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={(e) => e.target === e.currentTarget && setShowCreateForm(false)}
        >
          <div className="relative w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl dark:bg-gray-900 sm:max-h-[90vh] sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('lead.newLead')}</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <LeadForm
              onSubmit={handleCreate}
              isLoading={createMutation.isPending}
              submitLabel={t('lead.create')}
            />
            {createMutation.isError && (
              <p className="mt-3 text-sm text-red-500">{t('errors.createFailed')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
