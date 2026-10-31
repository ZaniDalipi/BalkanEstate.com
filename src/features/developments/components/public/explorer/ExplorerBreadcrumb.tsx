import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Crumb {
  key: string;
  label: string;
}

interface ExplorerBreadcrumbProps {
  crumbs: Crumb[];
  onSelect: (index: number) => void;
}

/** Residence › Building › Floor trail; a back chip on small screens. */
export const ExplorerBreadcrumb: React.FC<ExplorerBreadcrumbProps> = ({ crumbs, onSelect }) => {
  const { t } = useTranslation('developments');
  const last = crumbs.length - 1;
  return (
    <nav aria-label={t('explorer.breadcrumb', 'Explorer navigation')} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      {last > 0 && (
        <button
          type="button"
          onClick={() => onSelect(last - 1)}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-white/95 px-3 text-sm font-semibold text-slate-800 shadow-md sm:hidden"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {crumbs[last - 1].label}
        </button>
      )}
      <ol className={`${last > 0 ? 'hidden sm:flex' : 'flex'} items-center gap-1 rounded-full bg-black/55 px-3 py-1.5 text-sm text-white backdrop-blur`}>
        {crumbs.map((c, i) => (
          <li key={c.key} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-white/60" aria-hidden="true" />}
            {i === last ? (
              <span className="font-semibold" aria-current="page">{c.label}</span>
            ) : (
              <button type="button" onClick={() => onSelect(i)} className="text-white/85 underline-offset-2 hover:text-white hover:underline">
                {c.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
