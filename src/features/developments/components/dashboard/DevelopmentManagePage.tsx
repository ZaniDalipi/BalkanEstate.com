import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { goBack } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { useMyDevelopment } from '../../hooks/useDevelopment';
import { StatusPill } from '../shared/Badges';
import { LoadingState, ErrorState } from '../shared/States';
import { SceneStudio } from '../scene/SceneStudio';
import { QuickAddInventory } from './inventory/QuickAddInventory';
import { InventoryTable } from './inventory/InventoryTable';
import { roleCan } from './inventory/permissions';
import { LinkedListingsPanel } from './listings/LinkedListingsPanel';
import { ManageTabs, panelId, tabId, useTabParam, type ManageTab } from './ManageTabs';
import { OverviewPanel } from './OverviewPanel';

const TAB_IDS = ['overview', 'inventory', 'explorer', 'listings'] as const;
type TabId = (typeof TAB_IDS)[number];
const PREFIX = 'dev-manage';

/**
 * Dashboard page for one development, split into tabs (synced to `?tab=`):
 * overview (status, publish, unit totals, cover), inventory (builder + table),
 * the interactive explorer studio, and linked listings.
 */
const DevelopmentManagePage: React.FC = () => {
  const { t } = useTranslation('developments');
  const { id } = useParams();
  const { development, role, isLoading, error, refetch } = useMyDevelopment(id);
  const [tab, setTab] = useTabParam<TabId>(TAB_IDS);

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

      <ManageTabs tabs={tabs} active={tab} onSelect={setTab} label={t('manage.tabs.label', 'Manage development')} idPrefix={PREFIX} />

      {panel('overview', <OverviewPanel development={development} canPublish={roleCan(role, 'publish')} />)}
      {panel(
        'inventory',
        <div className="space-y-6">
          <section aria-labelledby="quick-add-heading" className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 id="quick-add-heading" className="mb-3 text-base font-semibold text-slate-900">
              {t('manage.inventory.quickAdd', 'Add buildings, floors and units')}
            </h2>
            <QuickAddInventory developmentId={development.id} />
          </section>
          <section aria-labelledby="units-heading">
            <h2 id="units-heading" className="mb-3 text-base font-semibold text-slate-900">
              {t('detail.units', 'Units')}
            </h2>
            <InventoryTable developmentId={development.id} role={role} slug={development.slug} />
          </section>
        </div>
      )}
      {panel(
        'explorer',
        <section aria-labelledby="explorer-heading">
          <h2 id="explorer-heading" className="mb-1 text-base font-semibold text-slate-900">
            {t('scene.heading', 'Interactive map')}
          </h2>
          <p className="mb-3 text-sm text-slate-600">{t('scene.subtitle', 'Draw clickable regions on your images.')}</p>
          <SceneStudio developmentId={development.id} />
        </section>
      )}
      {panel('listings', <LinkedListingsPanel developmentId={development.id} role={role} />)}
    </main>
  );
};

export default DevelopmentManagePage;
