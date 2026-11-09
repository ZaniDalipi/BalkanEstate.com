import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Development } from '../../../types';
import { useIsDesktop } from '../../../hooks/useIsDesktop';
import { ResidenceNav } from '../hero/ResidenceNav';
import { useDeveloperNav } from './useDeveloperNav';

/**
 * The top of the company page: from tablet up the residence's own bar (its
 * sections, "The builder" current); on phones, under the app's header, a
 * plain way back to the residence.
 */
export const DeveloperTopBar: React.FC<{ development: Development }> = ({ development }) => {
  const desktop = useIsDesktop();
  const nav = useDeveloperNav(development);
  if (desktop) {
    return <ResidenceNav development={development} sections={nav.sections} onSection={nav.onSection} onBack={nav.onBack} backLabel={nav.backLabel} current={nav.current} tone="paper" />;
  }
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4">
      <button type="button" onClick={nav.onBack} className="inline-flex min-h-[44px] max-w-full items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{nav.backLabel}</span>
      </button>
    </div>
  );
};
