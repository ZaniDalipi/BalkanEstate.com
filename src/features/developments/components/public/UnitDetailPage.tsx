import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BedDouble, Bath, Maximize, Compass, Building2, Layers, ArrowUpRight } from 'lucide-react';
import { optimizeImageUrl, imageSrcSet } from '@/config/mediaConfig';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { usePublicUnit } from '../../hooks';
import { LoadingState, ErrorState } from '../shared/States';
import { AvailabilityBadge } from '../shared/Badges';
import { formatPrice, formatArea } from '../../utils/format';
import type { LinkedListing } from '../../types';

const SpecItem: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2">
    <span className="text-primary">{icon}</span>
    <div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  </div>
);

const ListingRow: React.FC<{ listing: LinkedListing }> = ({ listing }) => {
  const { t } = useTranslation('developments');
  const img = listing.imageUrl || listing.images?.[0]?.url;
  return (
    <button
      type="button"
      onClick={() => navigate(paths.property(listing.id))}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-white p-3 text-left transition-colors hover:border-primary/50"
    >
      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
        {img && (
          <img src={optimizeImageUrl(img, { width: 160 })} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-semibold text-foreground">
          {listing.title || t('unit.viewListing')}
        </p>
        <p className="text-xs text-muted-foreground">
          {listing.createdByAgencyName || listing.createdByName}
        </p>
        {listing.price ? (
          <p className="text-sm font-bold text-foreground">{formatPrice(listing.price)}</p>
        ) : null}
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
};

/**
 * Buyer-facing unit detail page: a gallery (from the attached listing), the key
 * specs, price and availability, and the marketing listings connected to this
 * physical unit. "Request info" hands the buyer to the primary listing, where
 * the existing inquiry/contact flow lives.
 */
const UnitDetailPage: React.FC = () => {
  const { t } = useTranslation('developments');
  const { slug, unitId } = useParams();
  const { unit, development, listings, isLoading, error } = usePublicUnit(slug, unitId);

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
        <ErrorState message={t('errors.notFound')} />
      </main>
    );
  }

  const area = unit.netArea ?? unit.totalArea ?? unit.grossArea;
  const primary = listings[0];
  const gallery = primary ? primary.images?.map((i) => i.url).filter(Boolean) ?? (primary.imageUrl ? [primary.imageUrl] : []) : [];
  const hero = gallery[0];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <button
        type="button"
        onClick={() => development && navigate(paths.development(development.slug))}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {development?.name ?? t('public.backToList')}
      </button>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Gallery */}
        <div className="overflow-hidden rounded-3xl bg-muted">
          {hero ? (
            <img
              src={optimizeImageUrl(hero, { width: 1200 })}
              srcSet={imageSrcSet(hero)}
              sizes="(max-width: 1024px) 100vw, 640px"
              alt=""
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center text-muted-foreground">
              <Building2 className="h-12 w-12" aria-hidden="true" />
            </div>
          )}
          {gallery.length > 1 && (
            <div className="flex gap-2 p-2">
              {gallery.slice(0, 5).map((g, i) => (
                <img
                  key={i}
                  src={optimizeImageUrl(g, { width: 160 })}
                  alt=""
                  className="h-16 w-20 rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                {t('unit.number')} {unit.unitNumber}
              </h1>
              <AvailabilityBadge state={unit.availability} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[unit.buildingName, unit.floorLabel, unit.unitType].filter(Boolean).join(' · ')}
            </p>
          </div>

          {unit.price ? (
            <div>
              <p className="text-3xl font-bold text-foreground">{formatPrice(unit.price, unit.currency)}</p>
              {area ? (
                <p className="text-sm text-muted-foreground">
                  {formatPrice(Math.round(unit.price / area), unit.currency)}/m²
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-lg font-medium text-muted-foreground">{t('unit.priceOnRequest')}</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            {typeof unit.beds === 'number' && (
              <SpecItem icon={<BedDouble className="h-4 w-4" />} label={t('unit.beds')} value={unit.beds} />
            )}
            {typeof unit.baths === 'number' && (
              <SpecItem icon={<Bath className="h-4 w-4" />} label={t('unit.baths')} value={unit.baths} />
            )}
            {area ? (
              <SpecItem icon={<Maximize className="h-4 w-4" />} label={t('unit.area')} value={formatArea(area)} />
            ) : null}
            {unit.orientation && (
              <SpecItem icon={<Compass className="h-4 w-4" />} label={t('unit.orientation')} value={unit.orientation} />
            )}
            {unit.floorLabel && (
              <SpecItem icon={<Layers className="h-4 w-4" />} label={t('detail.floors')} value={unit.floorLabel} />
            )}
          </div>

          {primary && (
            <button
              type="button"
              onClick={() => navigate(paths.property(primary.id))}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t('unit.requestInfo')}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {listings.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            {t('unit.connectedListings')} ({listings.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {listings.map((l) => (
              <ListingRow key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default UnitDetailPage;
