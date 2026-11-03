import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { SoftIcon } from '@/src/shared/illustrations';
import { GLASS_CARD, PRIMARY_ACTION } from './glassStyles';

const Bone: React.FC<{ className: string }> = ({ className }) => <div className={`animate-pulse rounded-xl bg-neutral-200/80 ${className}`} />;

/** Loading: the same shapes the profile will take, so nothing jumps when it arrives. */
export const BusinessDetailSkeleton: React.FC = () => {
  const { t } = useTranslation('businessDirectory');
  return (
    <div className="min-h-screen bg-[#f5f5f7]" aria-busy="true" aria-label={t('detail.loading', 'Loading business…')}>
      <div className="h-14" />
      <div className="mx-auto max-w-6xl sm:px-6">
        <Bone className="h-44 !rounded-none sm:h-60 sm:!rounded-[32px] lg:h-80" />
        <div className={`${GLASS_CARD} mx-3 -mt-16 p-5 sm:mx-6 sm:-mt-24 lg:mx-10`}>
          <div className="flex gap-4">
            <Bone className="-mt-10 h-20 w-20 !rounded-[22px] sm:h-28 sm:w-28" />
            <div className="flex-1 space-y-2.5">
              <Bone className="h-7 w-2/3" />
              <Bone className="h-4 w-1/3" />
              <Bone className="h-4 w-1/4" />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            {[0, 1, 2, 3].map((i) => <Bone key={i} className="h-16 flex-1 !rounded-2xl" />)}
          </div>
        </div>
        <div className="mt-6 grid gap-5 px-3 sm:px-0 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Bone className="h-56 !rounded-[28px]" />
          <Bone className="h-72 !rounded-[28px]" />
        </div>
      </div>
    </div>
  );
};

/** Not found: say so plainly and offer the way back. */
export const BusinessNotFound: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t } = useTranslation('businessDirectory');
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-4">
      <div className={`${GLASS_CARD} max-w-md p-8 text-center`}>
        <SoftIcon name="store" className="mx-auto mb-5 block h-20 w-20" />
        <h1 className="mb-2 text-xl font-bold text-neutral-900">{t('detail.notFound', 'Listing Not Found')}</h1>
        <p className="mb-6 text-neutral-600">{t('detail.notFoundDesc', 'The listing you’re looking for may have been removed or is no longer available.')}</p>
        <button type="button" onClick={onBack} className={`${PRIMARY_ACTION} min-h-[48px] px-6`}>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          {t('detail.backToDirectory', 'Back to Directory')}
        </button>
      </div>
    </div>
  );
};
