import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowUpRight, Building2 } from 'lucide-react';
import { optimizeImageUrl, imageSrcSet } from '@/config/mediaConfig';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { usePublicUnit } from '../../hooks';
import { LoadingState, ErrorState } from '../shared/States';
import { AvailabilityBadge } from '../shared/Badges';
import { formatPrice } from '../../utils/format';
import { unitArea } from '../../utils/unitFilters';
import type { LinkedListing } from '../../types';
import { unitGallery } from './explorer/drawer/unitGallery';
import { UnitSpecs } from './explorer/drawer/UnitSpecs';
import { UnitActions } from './explorer/drawer/UnitActions';
import { useUnitText } from './explorer/useUnitText';

const ListingRow: React.FC<{ listing: LinkedListing; primary: boolean }> = ({ listing, primary }) => {
  const { t } = useTranslation('developments');
  const img = listing.imageUrl || listing.images?.[0]?.url;
  return (
    <button
      type="button"
      onClick={() => navigate(paths.property(listing.id))}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-primary/50"
    >
      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {img && <img src={optimizeImageUrl(img, { width: 160 })} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-semibold text-slate-900">{listing.title || t('unit.viewListing', 'View listing')}</p>
        <p className="text-xs text-slate-500">
          {primary ? `${t('explorer.primaryListing', 'Primary listing')} · ` : ''}
          {listing.createdByAgencyName || listing.createdByName}
        </p>
        {listing.price ? <p className="text-sm font-bold text-slate-900">{formatPrice(listing.price)}</p> : null}
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
    </button>
  );
};

/**
 * Buyer-facing unit page (the crawlable twin of the explorer drawer): gallery
 * (the unit's own photos, else its PRIMARY listing's), specs, price and
 * availability, the platform actions for its primary listing (or a unit
 * inquiry), and every connected listing.
 */
const UnitDetailPage: React.FC = () => {
  const { t } = useTranslation('developments');
  const { slug, unitId } = useParams();
  const { unit, development, listings, isLoading, error } = usePublicUnit(slug, unitId);
  const txt = useUnitText();

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <LoadingState rows={4} />
      </main>
    );
  }
  if (error || !unit) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <ErrorState message={t('errors.notFound', 'Not found')} />
      </main>
    );
  }

  const primary = listings.find((l) => l.id === unit.primaryListingId);
  const gallery = unitGallery(unit, primary);
  const hero = gallery[0];
  const area = unitArea(unit);
  const price = !unit.priceOnRequest && unit.price ? unit.price : undefined;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <button
        type="button"
        onClick={() => development && navigate(paths.development(development.slug))}
        className="mb-4 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {development?.name ?? t('public.backToList', 'Back to developments')}
      </button>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-3xl bg-slate-100">
          {hero ? (
            <img src={optimizeImageUrl(hero, { width: 1200 })} srcSet={imageSrcSet(hero)} sizes="(max-width: 1024px) 100vw, 640px" alt="" className="aspect-[4/3] w-full object-cover" />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center text-slate-400">
              <Building2 className="h-12 w-12" aria-hidden="true" />
            </div>
          )}
          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-2">
              {gallery.slice(1, 6).map((g) => (
                <img key={g} src={optimizeImageUrl(g, { width: 160 })} alt="" className="h-16 w-20 rounded-lg object-cover" loading="lazy" />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{txt.title(unit)}</h1>
              <AvailabilityBadge state={unit.availability} />
            </div>
            <p className="mt-1 text-sm text-slate-500">{[unit.buildingName, unit.floorLabel, unit.unitType].filter(Boolean).join(' · ')}</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900">{txt.price(unit)}</p>
            {price && area ? (
              <p className="text-sm text-slate-500">{formatPrice(unit.pricePerSqm ?? Math.round(price / area), unit.currency)}/m²</p>
            ) : null}
          </div>
          <UnitSpecs unit={unit} />
          {slug && <UnitActions slug={slug} unit={unit} development={development} onModalChange={() => undefined} />}
        </div>
      </div>

      {unit.description && <p className="mt-8 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{unit.description}</p>}

      {listings.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            {t('unit.connectedListings', 'Connected listings')} ({listings.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {listings.map((l) => (
              <ListingRow key={l.id} listing={l} primary={l.id === unit.primaryListingId} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default UnitDetailPage;
