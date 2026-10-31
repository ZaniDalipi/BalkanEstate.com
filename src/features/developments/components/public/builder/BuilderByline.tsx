import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import type { DevelopmentBuilder } from '../../../types';
import { BuilderLogo } from './BuilderLogo';

/** "Built by [logo] Company ›" under the residence name; jumps to the builder section. */
export const BuilderByline: React.FC<{ builder?: DevelopmentBuilder; onOpen: () => void }> = ({ builder, onOpen }) => {
  const { t } = useTranslation('developments');
  if (!builder?.name) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm shadow-sm hover:border-primary/40 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <BuilderLogo name={builder.name} url={builder.logo?.url} size={34} className="rounded-full" />
      <span className="text-slate-500">{t('builderPublic.builtBy', 'Built by')}</span>
      <span className="font-semibold text-slate-900">{builder.name}</span>
      <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
    </button>
  );
};
