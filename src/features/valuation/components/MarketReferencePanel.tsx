import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useCityMarketData } from '@/src/features/cities/hooks/useCityQueries';
import {
  MARKET_REFERENCE_COUNTRIES,
  getMarketReference,
  findReferenceByCountryName,
  formatEurPerSqm,
  MARKET_DATA_YEAR,
} from '../data/officialMarketData';

type MarketSource = 'official' | 'listings';

interface MarketReferencePanelProps {
  /** Pre-select a country by ISO code (e.g. from a valuation). */
  initialCountryCode?: string;
  /** Free-text country name to resolve when a code isn't available. */
  countryName?: string;
  /** Optional city to look up in our marketplace data (defaults to the capital). */
  city?: string;
  /** A property's implied EUR/m², shown as a comparison against the benchmark. */
  comparePricePerSqm?: number;
  /** Compact styling when embedded inside the result view. */
  embedded?: boolean;
}

/**
 * Lets a user compare the market €/m² for a country from two switchable sources:
 * official national statistics (curated + backend official figure) vs. live
 * BalkanEstate marketplace listings. Optionally benchmarks a property's own
 * €/m² against the selected source.
 */
const MarketReferencePanel: React.FC<MarketReferencePanelProps> = ({
  initialCountryCode,
  countryName,
  city,
  comparePricePerSqm,
  embedded = false,
}) => {
  const { t } = useTranslation(['valuation', 'common']);

  const resolvedInitial = useMemo(() => {
    if (initialCountryCode) return getMarketReference(initialCountryCode).code;
    if (countryName) return findReferenceByCountryName(countryName)?.code ?? 'MK';
    return 'MK';
  }, [initialCountryCode, countryName]);

  const [source, setSource] = useState<MarketSource>('official');
  const [countryCode, setCountryCode] = useState(resolvedInitial);

  useEffect(() => setCountryCode(resolvedInitial), [resolvedInitial]);

  const reference = getMarketReference(countryCode);
  const lookupCity = city && countryCode === resolvedInitial ? city : reference.capital.city;

  // Our marketplace / official backend figures for the representative city.
  const { data: marketData, isLoading } = useCityMarketData(lookupCity, reference.name);

  // Resolve the benchmark for the active source, falling back to curated data.
  const official = {
    value: marketData?.avgPricePerSqm && marketData.avgPricePerSqm > 0
      ? marketData.avgPricePerSqm
      : reference.capital.centerPerSqm,
    sourceName: marketData?.officialSourceName ?? reference.source.name,
    sourceUrl: marketData?.officialSourceUrl ?? reference.source.url,
    period: reference.period,
    isFallback: !(marketData?.avgPricePerSqm && marketData.avgPricePerSqm > 0),
  };
  const listingsValue = marketData?.listingAvgPricePerSqm ?? 0;
  const hasListings = listingsValue > 0;

  const activeValue = source === 'official' ? official.value : listingsValue;
  const showComparison = typeof comparePricePerSqm === 'number' && comparePricePerSqm > 0 && activeValue > 0;
  const diffPct = showComparison ? ((comparePricePerSqm! - activeValue) / activeValue) * 100 : 0;
  const isAbove = diffPct > 0;

  const SourceToggle = (
    <div className="inline-flex items-center gap-0.5 bg-neutral-100 p-1 rounded-full text-xs font-semibold">
      <button
        type="button"
        onClick={() => setSource('official')}
        aria-pressed={source === 'official'}
        className={`px-3 py-1.5 rounded-full transition-all ${source === 'official' ? 'bg-white shadow-sm text-primary' : 'text-neutral-500 hover:text-neutral-700'}`}
      >
        {t('valuation:marketReference.official', 'Official statistics')}
      </button>
      <button
        type="button"
        onClick={() => setSource('listings')}
        aria-pressed={source === 'listings'}
        className={`px-3 py-1.5 rounded-full transition-all ${source === 'listings' ? 'bg-white shadow-sm text-primary' : 'text-neutral-500 hover:text-neutral-700'}`}
      >
        {t('valuation:marketReference.listings', 'BalkanEstate listings')}
      </button>
    </div>
  );

  return (
    <div className={`bg-white rounded-2xl border border-neutral-200 overflow-hidden ${embedded ? '' : 'shadow-lg'}`}>
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-primary/[0.07] to-transparent border-b border-neutral-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </span>
            <div>
              <h3 className="text-sm font-bold text-neutral-800 leading-tight">{t('valuation:marketReference.title', 'Market price reference')}</h3>
              <p className="text-[11px] text-neutral-500">{t('valuation:marketReference.subtitle', 'Compare €/m² by data source')}</p>
            </div>
          </div>
          {SourceToggle}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Country selector */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1.5">
            {t('valuation:marketReference.country', 'Country')}
          </label>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-800 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          >
            {MARKET_REFERENCE_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Benchmark figure */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/[0.06] to-violet-500/[0.04] border border-primary/10 p-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            {source === 'official'
              ? t('valuation:marketReference.avgOfficial', 'Average price · official')
              : t('valuation:marketReference.avgListings', 'Average price · our listings')}
            {' · '}{lookupCity}
          </p>

          {source === 'listings' && !hasListings && !isLoading ? (
            <div className="mt-3">
              <p className="text-sm font-semibold text-neutral-500">{t('valuation:marketReference.noListings', 'No marketplace data yet for this area')}</p>
              <p className="text-[11px] text-neutral-400 mt-1">{t('valuation:marketReference.noListingsHint', 'Switch to official statistics for a reference figure.')}</p>
            </div>
          ) : isLoading && source === 'listings' ? (
            <div className="mt-3 h-9 flex items-center justify-center">
              <span className="text-sm text-neutral-400">{t('common:loading', 'Loading…')}</span>
            </div>
          ) : (
            <>
              <p className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text text-transparent mt-1 tabular-nums">
                {formatEurPerSqm(activeValue)}
                <span className="text-base font-bold text-neutral-400">/m²</span>
              </p>

              {/* Comparison bars against a property */}
              {showComparison && (
                <div className="mt-4 text-left space-y-2.5">
                  <ComparisonRow
                    label={t('valuation:marketReference.thisProperty', 'This property')}
                    value={comparePricePerSqm!}
                    max={Math.max(comparePricePerSqm!, activeValue)}
                    color="#0252CD"
                    format={formatEurPerSqm}
                  />
                  <ComparisonRow
                    label={source === 'official' ? t('valuation:marketReference.marketOfficial', 'Market (official)') : t('valuation:marketReference.marketListings', 'Market (listings)')}
                    value={activeValue}
                    max={Math.max(comparePricePerSqm!, activeValue)}
                    color="#F59E0B"
                    format={formatEurPerSqm}
                  />
                  <p className={`text-xs font-semibold text-center pt-1 ${isAbove ? 'text-amber-600' : 'text-green-600'}`}>
                    {isAbove
                      ? t('valuation:marketReference.aboveMarket', '{{pct}}% above the market benchmark', { pct: Math.abs(diffPct).toFixed(0) })
                      : t('valuation:marketReference.belowMarket', '{{pct}}% below the market benchmark', { pct: Math.abs(diffPct).toFixed(0) })}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Source attribution */}
        <div className="flex items-center justify-between gap-3 text-[11px] text-neutral-500">
          <span>
            {source === 'official' ? (
              <>
                {t('valuation:marketReference.sourceLabel', 'Source')}:{' '}
                <a href={official.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                  {official.sourceName} ↗
                </a>
              </>
            ) : (
              <>{t('valuation:marketReference.sourceListings', 'Aggregated from active BalkanEstate listings')}</>
            )}
          </span>
          <span className="whitespace-nowrap">{source === 'official' ? official.period : t('valuation:marketReference.live', 'Live')}</span>
        </div>

        <p className="text-[10px] text-neutral-400 leading-relaxed">
          {t('valuation:marketReference.disclaimer', 'Benchmarks are indicative EUR/m² reference points for {{year}}, not an appraisal. Local prices vary by neighbourhood, condition and floor.', { year: MARKET_DATA_YEAR })}
        </p>
      </div>
    </div>
  );
};

const ComparisonRow: React.FC<{
  label: string; value: number; max: number; color: string; format: (v: number) => string;
}> = ({ label, value, max, color, format }) => {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-neutral-600 font-medium">{label}</span>
        <span className="text-neutral-800 font-bold tabular-nums">{format(value)}/m²</span>
      </div>
      <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export default MarketReferencePanel;
