import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CityMarketData } from '@/services/apiService';
import { formatPrice } from '@/utils/currency';
import {
  MapPinIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChartBarIcon,
  CalendarIcon, HomeIcon, FireIcon, StarIcon, BuildingOfficeIcon,
} from '@/constants';
import { getCityFallbackGradient } from '@/config/cloudinaryConfig';
import { cityImageSources } from '../utils/cityImage';
import SaveCityButton from './SaveCityButton';

export interface CityMarketCardProps {
  city: CityMarketData;
  isSaved: boolean;
  /** Whether a follow can be attempted at all (signed in). */
  canSave: boolean;
  isSavePending: boolean;
  onToggleSave: (city: CityMarketData) => void;
  onOpen: (city: CityMarketData) => void;
  onViewListings: (event: React.MouseEvent, city: CityMarketData) => void;
}

type WikiImageState = 'idle' | 'loading' | 'missing';

/**
 * One city's market card.
 *
 * Owns only its own ephemeral display state — which price series is shown and
 * how far the image fallback chain (curated photo → convention Cloudinary id →
 * Wikipedia → gradient) has got. Both belong to the card, not to the page, so
 * two tabs can render the same city without sharing a keyed map of per-card
 * flags.
 */
const CityMarketCard: React.FC<CityMarketCardProps> = ({
  city, isSaved, canSave, isSavePending, onToggleSave, onOpen, onViewListings,
}) => {
  const { t } = useTranslation(['exploreCities']);
  const [showListingPrice, setShowListingPrice] = useState(false);
  /** How far down `imageSources` we have got. Past the end means all failed. */
  const [sourceIndex, setSourceIndex] = useState(0);
  const [wikiImage, setWikiImage] = useState<string | null>(null);
  const wikiState = useRef<WikiImageState>('idle');
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  // Keyed on the three fields the photo depends on, not on `city`: the market
  // data refetches on a schedule, and a new object identity carrying the same
  // photo would restart the fallback chain and flash the image.
  const imageSources = useMemo(
    () => cityImageSources(
      { city: city.city, country: city.country, imageUrl: city.imageUrl },
      { width: 800, height: 400 },
    ),
    [city.city, city.country, city.imageUrl],
  );

  // A different city in the same card slot (filtering, paging) starts its own
  // fallback chain — otherwise it would inherit the previous city's failures
  // and skip straight to a gradient.
  useEffect(() => {
    setSourceIndex(0);
    setWikiImage(null);
    wikiState.current = 'idle';
  }, [imageSources]);

  const cloudinaryFailed = sourceIndex >= imageSources.length;

  /**
   * This source missed — try the next one, and once they are exhausted try
   * Wikipedia once before falling through to a gradient.
   */
  const handleImageError = useCallback(async () => {
    const next = sourceIndex + 1;
    setSourceIndex(next);
    if (next < imageSources.length) return;

    if (wikiState.current !== 'idle') return;
    wikiState.current = 'loading';

    const candidates = [city.city, `${city.city}, ${city.country}`, `${city.city} (city)`];
    for (const term of candidates) {
      try {
        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`,
          { headers: { Accept: 'application/json' } },
        );
        if (!res.ok) continue;
        const data = await res.json();
        const src: string | undefined = data.originalimage?.source || data.thumbnail?.source;
        if (src) {
          // The card may have unmounted while this was in flight.
          if (mounted.current) setWikiImage(src);
          wikiState.current = 'missing';
          return;
        }
      } catch {
        // Try the next candidate title.
      }
    }
    wikiState.current = 'missing';
  }, [city.city, city.country, sourceIndex, imageSources.length]);

  const trend = city.marketTrend;
  const trendIcon = trend === 'rising'
    ? <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
    : trend === 'declining'
      ? <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
      : <ChartBarIcon className="w-4 h-4 text-neutral-500" />;
  const trendColor = trend === 'rising'
    ? 'text-green-600 bg-green-50'
    : trend === 'declining'
      ? 'text-red-600 bg-red-50'
      : 'text-neutral-600 bg-neutral-50';
  const trendLabel = trend === 'rising'
    ? t('trends.rising')
    : trend === 'declining'
      ? t('trends.declining')
      : t('trends.stable');

  const demand = city.demandScore >= 70
    ? { label: t('cityCard.demandHigh', 'High'), color: 'text-green-600', barColor: 'from-green-400 to-green-500' }
    : city.demandScore >= 40
      ? { label: t('cityCard.demandMedium', 'Moderate'), color: 'text-amber-600', barColor: 'from-amber-400 to-amber-500' }
      : { label: t('cityCard.demandLow', 'Low'), color: 'text-red-500', barColor: 'from-red-400 to-red-500' };

  const investment = city.investmentScore >= 70
    ? { label: t('cityCard.investmentExcellent', 'Excellent'), color: 'text-green-600', barColor: 'from-green-400 to-green-500' }
    : city.investmentScore >= 40
      ? { label: t('cityCard.investmentGood', 'Good'), color: 'text-blue-600', barColor: 'from-blue-400 to-blue-500' }
      : { label: t('cityCard.investmentFair', 'Fair'), color: 'text-neutral-500', barColor: 'from-neutral-400 to-neutral-500' };

  const showWiki = cloudinaryFailed && typeof wikiImage === 'string';
  const showGradient = cloudinaryFailed && !showWiki;
  const displayPricePerSqm = showListingPrice && city.listingAvgPricePerSqm
    ? city.listingAvgPricePerSqm
    : city.avgPricePerSqm;

  return (
    <div
      onClick={() => onOpen(city)}
      className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-2xl hover:border-primary hover:scale-[1.02] transition-all duration-300 text-left group shadow-md cursor-pointer"
    >
      {/* City Image Header */}
      <div className="relative h-36 overflow-hidden">
        {!cloudinaryFailed && (
          <img
            src={imageSources[sourceIndex]}
            alt={city.city}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={handleImageError}
            loading="lazy"
            decoding="async"
          />
        )}
        {showWiki && (
          <img
            src={wikiImage!}
            alt={city.city}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />
        )}
        {showGradient && (
          <div className="absolute inset-0" style={{ background: getCityFallbackGradient(city.city) }} />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/60" />

        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <MapPinIcon className="w-4 h-4 text-white/90 flex-shrink-0" />
              <h3 className="text-lg font-bold text-white group-hover:text-primary-light transition-colors truncate">
                {city.city}
              </h3>
            </div>
            <p className="text-xs text-white/80 ml-5.5">{city.country}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg ${trendColor}`}>
              {trendIcon}
              {trendLabel}
            </div>
            <SaveCityButton
              cityName={city.city}
              isSaved={isSaved}
              canSave={canSave}
              isPending={isSavePending}
              onToggle={() => onToggleSave(city)}
            />
          </div>
        </div>

        <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-2">
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
            <HomeIcon className="w-3.5 h-3.5 text-white/80" />
            <span className="text-xs font-medium text-white/90">{city.listingsCount} {t('footer.listings')}</span>
          </div>
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
            <CalendarIcon className="w-3.5 h-3.5 text-white/80" />
            <span className="text-xs font-medium text-white/90">{city.soldLastMonth} {t('footer.soldPerMonth')}</span>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className="flex items-stretch gap-3 mb-4">
          <div className="flex-1 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-3 border border-primary/10">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-medium text-neutral-500">Avg. Price /m²</p>
              {city.listingAvgPricePerSqm && (
                <div className="flex gap-0.5 bg-neutral-100 rounded-full p-0.5">
                  <button
                    onClick={e => { e.stopPropagation(); setShowListingPrice(false); }}
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full transition-colors ${!showListingPrice ? 'bg-white text-primary shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                  >
                    Market
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setShowListingPrice(true); }}
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full transition-colors ${showListingPrice ? 'bg-white text-blue-600 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                  >
                    Listings
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-neutral-900">
                €{displayPricePerSqm.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-neutral-400">/m²</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">
              {showListingPrice ? `${city.listingsCount} active listings` : 'Market research'}
            </p>
          </div>
          <div className="flex-1 bg-neutral-50 rounded-xl p-3 border border-neutral-100">
            <p className="text-[11px] font-medium text-neutral-500 mb-1">{t('cityCard.medianPrice')}</p>
            <p className="text-lg font-bold text-primary">{formatPrice(city.medianPrice, city.countryCode)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className={`text-center p-2.5 rounded-xl ${
            city.priceGrowthYoY > 0 ? 'bg-green-50 border border-green-100' : city.priceGrowthYoY < 0 ? 'bg-red-50 border border-red-100' : 'bg-neutral-50 border border-neutral-100'
          }`}>
            <div className="flex items-center justify-center gap-0.5 mb-0.5">
              {city.priceGrowthYoY > 0 ? (
                <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-green-500" />
              ) : city.priceGrowthYoY < 0 ? (
                <ArrowTrendingDownIcon className="w-3.5 h-3.5 text-red-500" />
              ) : null}
              <span className={`text-base font-bold ${
                city.priceGrowthYoY > 0 ? 'text-green-600' : city.priceGrowthYoY < 0 ? 'text-red-600' : 'text-neutral-600'
              }`}>
                {city.priceGrowthYoY > 0 ? '+' : ''}{city.priceGrowthYoY}%
              </span>
            </div>
            <span className="text-[10px] text-neutral-500 font-medium leading-tight block">{t('cityCard.yoyGrowth')}</span>
          </div>
          <div className="text-center p-2.5 rounded-xl bg-blue-50 border border-blue-100">
            <span className="text-base font-bold text-blue-600 block mb-0.5">{city.rentalYield}%</span>
            <span className="text-[10px] text-neutral-500 font-medium leading-tight block">{t('cityCard.rentalYield')}</span>
          </div>
          <div className="text-center p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="flex items-baseline justify-center gap-0.5 mb-0.5">
              <span className="text-base font-bold text-neutral-700">{city.averageDaysOnMarket}</span>
              <span className="text-[10px] text-neutral-400 font-medium">{t('cityCard.daysUnit')}</span>
            </div>
            <span className="text-[10px] text-neutral-500 font-medium leading-tight block">{t('cityCard.daysOnMarket')}</span>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                <FireIcon className="w-3.5 h-3.5 text-amber-500" />
                {t('cityCard.demand')}
              </span>
              <span className={`text-xs font-bold ${demand.color} px-2 py-0.5 rounded-full bg-white border border-current/15`}>
                {demand.label}
              </span>
            </div>
            <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${demand.barColor} transition-all duration-500`}
                style={{ width: `${city.demandScore}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                <StarIcon className="w-3.5 h-3.5 text-blue-500" />
                {t('cityCard.investment')}
              </span>
              <span className={`text-xs font-bold ${investment.color} px-2 py-0.5 rounded-full bg-white border border-current/15`}>
                {investment.label}
              </span>
            </div>
            <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${investment.barColor} transition-all duration-500`}
                style={{ width: `${city.investmentScore}%` }}
              />
            </div>
          </div>
        </div>

        {city.topNeighborhoods && city.topNeighborhoods.length > 0 && (
          <div className="border-t border-neutral-100 pt-3 mb-3">
            <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <BuildingOfficeIcon className="w-3 h-3" />
              {t('sections.topNeighborhoods')}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {city.topNeighborhoods.slice(0, 3).map((neighborhood, idx) => (
                <span key={idx} className="inline-block bg-primary/5 text-primary text-xs px-2 py-1 rounded-md font-medium">
                  {neighborhood}
                </span>
              ))}
            </div>
          </div>
        )}

        {city.highlights && city.highlights.length > 0 && (
          <div className="border-t border-neutral-100 pt-3">
            <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <ChartBarIcon className="w-3 h-3" />
              {t('sections.marketInsights')}
            </h4>
            <ul className="space-y-1.5">
              {city.highlights.slice(0, 3).map((highlight, idx) => (
                <li key={idx} className="text-xs text-neutral-600 flex items-start gap-2">
                  <span className="text-primary mt-0.5 font-bold text-[10px]">●</span>
                  <span className="flex-1 leading-relaxed">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-neutral-100">
          <button
            onClick={event => onViewListings(event, city)}
            className="w-full py-2.5 px-4 bg-primary text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors shadow-md"
          >
            <MapPinIcon className="w-4 h-4" />
            <span>{t('footer.viewListings', 'View Listings on Map')}</span>
            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CityMarketCard;
