import React from 'react';
import { useTranslation } from 'react-i18next';
import PropertyCardSkeleton from '@/src/features/property-details/components/PropertyCardSkeleton';

/**
 * What the list panel shows while it slides in and the map is being let go:
 * the shape of the cards that are coming, so nothing jumps when they arrive.
 * Cheap on purpose: no photos, no layers, nothing to cost the slide a frame.
 */
const ListPendingSkeleton: React.FC = () => {
  const { t } = useTranslation(['search']);
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 flex-col gap-6 overflow-hidden px-4"
      // The same clearance PropertyList leaves for the floating search bar.
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 70px + 3rem)' }}
    >
      <span className="sr-only">{t('search:ui.searchPage.loadingProperties', 'Loading properties')}</span>
      {Array.from({ length: 3 }).map((_, index) => (
        <PropertyCardSkeleton key={index} index={index} />
      ))}
    </div>
  );
};

export default ListPendingSkeleton;
