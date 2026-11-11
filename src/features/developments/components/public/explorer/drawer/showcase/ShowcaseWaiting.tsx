import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import type { FloorShotState } from './floorShotState';

interface ShowcaseWaitingProps {
  floor: FloorShotState;
}

/**
 * The stage while the apartment's floor picture is on its way, or when it
 * could not load and there is nothing else to show: a quiet placeholder, or
 * the reason and a way to try again (the details beside it stay usable).
 */
export const ShowcaseWaiting: React.FC<ShowcaseWaitingProps> = ({ floor }) => {
  const { t } = useTranslation('developments');
  if (floor.status === 'failed') {
    return (
      <div role="alert" className="mx-6 flex max-w-sm flex-col items-center gap-3 rounded-3xl bg-white/90 p-6 text-center shadow-md ring-1 ring-black/5">
        <p className="text-sm font-medium text-slate-700">{t('explorer.showcase.floorFailed', 'The floor picture could not be loaded.')}</p>
        <button
          type="button"
          onClick={floor.retry}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <SoftIcon name="refresh" className="h-5 w-5" />
          {t('explorer.showcase.retry', 'Try again')}
        </button>
      </div>
    );
  }
  return (
    <div aria-busy="true" className="flex w-[min(100cqw-3rem,560px)] flex-col items-center gap-3">
      <div className="aspect-[3/2] w-full animate-pulse rounded-3xl motion-reduce:animate-none bg-white/70 shadow-sm ring-1 ring-black/5" />
      <span className="sr-only">{t('explorer.showcase.loading', 'Loading the floor picture…')}</span>
    </div>
  );
};
