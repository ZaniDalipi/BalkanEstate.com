import React, { useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { goBack } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { useMyDevelopment } from '../../hooks/useDevelopment';
import { StatusPill } from '../shared/Badges';
import { LoadingState, ErrorState } from '../shared/States';
import { SceneStudio } from '../scene/SceneStudio';
import { LinkTypesGuide } from '../scene/editor/LinkTypesGuide';
import { useConfirmDiscard } from '../scene/editor/useUnsavedGuard';
import { ActivityPanel } from './activity/ActivityPanel';
import { InventoryPanel } from './InventoryPanel';
import { roleCan } from './inventory/permissions';
import { LinkedListingsPanel } from './listings/LinkedListingsPanel';
import { ManageTabs, panelId, tabId, useTabParam, type ManageTab } from './ManageTabs';
import { OverviewPanel } from './OverviewPanel';
import { SettingsPanel } from './SettingsPanel';

const TAB_IDS = ['overview', 'inventory', 'explorer', 'listings', 'activity', 'settings'] as const;
type TabId = (typeof TAB_IDS)[number];
const PREFIX = 'dev-manage';

/**
 * Dashboard page for one development, split into tabs (synced to `?tab=`):
 * overview (status, publish, unit totals, cover), inventory (builder + table),
 * the interactive explorer studio, linked listings, activity (audit trail, only
 * for roles with `team.manage`) and settings.
 */
const DevelopmentManagePage: React.FC = () => {
  const { t } = useTranslation('developments');
  const { id } = useParams();
  const { development, role, isLoading, error, refetch } = useMyDevelopment(id);
  const [requestedTab, setTab] = useTabParam<TabId>(TAB_IDS);
  const showActivity = !!role && roleCan(role, 'team.manage');
  // A shared `?tab=activity` link opened by a role without access falls back to the overview.
  const tab: TabId = requestedTab === 'activity' && !showActivity ? 'overview' : requestedTab;
  // Leaving the explorer tab unmounts the editor, so ask before dropping unsaved region edits.
  const explorerDirty = useRef(false);
  const confirmDiscard = useConfirmDiscard();
  const onExplorerDirty = useCallback((d: boolean) => {
    explorerDirty.current = d;
  }, []);
  const selectTab = async (next: TabId) => {
    if (next === tab) return;
    if (tab === 'explorer' && explorerDirty.current && !(await confirmDiscard())) return;
    explorerDirty.current = false;
    setTab(next);
  };

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <LoadingState rows={4} />
      </main>
    );
  }

  if (error || !development) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <ErrorState message={t('errors.notFound', 'Development not found.')} onRetry={() => refetch()} retryLabel={t('inventory.retry', 'Retry')} />
      </main>
    );
  }

  const tabs: ManageTab<TabId>[] = [
    { id: 'overview', label: t('manage.tabs.overview', 'Overview') },
    { id: 'inventory', label: t('manage.tabs.inventory', 'Inventory') },
    { id: 'explorer', label: t('manage.tabs.explorer', 'Interactive explorer') },
    { id: 'listings', label: t('manage.tabs.listings', 'Linked listings') },
    ...(showActivity ? [{ id: 'activity' as const, label: t('manage.tabs.activity', 'Activity') }] : []),
    { id: 'settings', label: t('manage.tabs.settings', 'Settings') },
  ];

  const panel = (which: TabId, content: React.ReactNode) => (
    <div
      key={which}
      role="tabpanel"
      id={panelId(PREFIX, which)}
      aria-labelledby={tabId(PREFIX, which)}
      hidden={tab !== which}
      tabIndex={0}
      className="pt-6 focus:outline-none"
    >
      {/* Only the active panel mounts its content (the explorer studio is heavy). */}
      {tab === which && content}
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <button
        type="button"
        onClick={() => goBack(paths.developmentsDashboard())}
        className="mb-4 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('nav.dashboard', 'Dashboard')}
      </button>

      <header className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">{development.name}</h1>
          <StatusPill status={development.status} />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {development.city}, {development.country} · {t(`category.${development.category}`)}
        </p>
      </header>

      <ManageTabs tabs={tabs} active={tab} onSelect={selectTab} label={t('manage.tabs.label', 'Manage development')} idPrefix={PREFIX} />

      {panel('overview', <OverviewPanel development={development} canPublish={roleCan(role, 'publish')} />)}
      {panel('inventory', <InventoryPanel developmentId={development.id} role={role} slug={development.slug} />)}
      {panel(
        'explorer',
        <section aria-labelledby="explorer-heading">
          <h2 id="explorer-heading" className="mb-1 text-base font-semibold text-slate-900">
            {t('scene.heading', 'Interactive map')}
          </h2>
          <p className="mb-3 text-sm text-slate-600">{t('scene.subtitle', 'Draw clickable regions on your images.')}</p>
          <LinkTypesGuide />
          <SceneStudio developmentId={development.id} onDirtyChange={onExplorerDirty} />
        </section>
      )}
      {panel('listings', <LinkedListingsPanel developmentId={development.id} role={role} />)}
      {showActivity && panel('activity', <ActivityPanel developmentId={development.id} />)}
      {panel('settings', <SettingsPanel development={development} canEdit={roleCan(role, 'project.edit')} />)}
    </main>
  );
};

export default DevelopmentManagePage;
