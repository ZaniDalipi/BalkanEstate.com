import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/src/app/router/navigation';
import { SoftIcon } from '@/src/shared/illustrations';
import { ResidenceManager } from './ResidenceManager';
import { ResidenceCodesPanel } from './codes/ResidenceCodesPanel';

type Tab = 'residences' | 'codes';

/**
 * Admin › Residences: the residences themselves, and the unlock codes owners
 * use to buy a Residence Pass while online payment is off. The tab lives in
 * the URL (`?tab=codes`), so a link or Back opens the right one.
 */
export const ResidencesAdmin: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const tab: Tab = params.get('tab') === 'codes' ? 'codes' : 'residences';
  const tabs: { id: Tab; label: string; icon: 'building' | 'ticket' }[] = [
    { id: 'residences', label: t('admin:residences.title', 'Residences'), icon: 'building' },
    { id: 'codes', label: t('admin:residenceCodes.title', 'Unlock codes'), icon: 'ticket' },
  ];
  const open = (next: Tab) => navigate(next === 'codes' ? `${pathname}?tab=codes` : pathname, { inPage: true });

  return (
    <div>
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6">
        <div role="tablist" aria-label={t('admin:residences.title', 'Residences')} className="flex gap-2 border-b border-gray-200">
          {tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={tab === x.id}
              aria-controls={`residences-tab-${x.id}`}
              id={`residences-tabbtn-${x.id}`}
              onClick={() => open(x.id)}
              className={`-mb-px inline-flex min-h-[44px] items-center gap-2 border-b-2 px-3 text-sm font-semibold ${tab === x.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >
              <SoftIcon name={x.icon} className="h-6 w-6" />
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" id={`residences-tab-${tab}`} aria-labelledby={`residences-tabbtn-${tab}`}>
        {tab === 'codes' ? (
          <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6">
            <ResidenceCodesPanel />
          </div>
        ) : (
          <ResidenceManager />
        )}
      </div>
    </div>
  );
};
