import React from 'react';
import type { MarketDeal, MarketStats } from '../types';
import { formatDate, marketFacts, typeLabel } from '../utils/marketPageText';
import { useMarketText } from '../hooks/useMarketText';

interface MarketStatsPanelProps {
  deal: MarketDeal;
  stats: MarketStats;
  generatedAt: string;
}

/** "At a glance": listing count, median and typical range, price per m², and the mix of property types. */
const MarketStatsPanel: React.FC<MarketStatsPanelProps> = ({ deal, stats, generatedAt }) => {
  const { t, lang } = useMarketText();
  const facts = marketFacts(t, lang, deal, stats);
  const types = stats.typeCounts.slice(0, 8);

  return (
    <section aria-labelledby="market-stats-title" className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 id="market-stats-title" className="text-lg font-semibold text-neutral-900">
        {t('marketPages:stats.title', { defaultValue: 'At a glance' })}
      </h2>
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.key} className="rounded-xl bg-neutral-50 p-4">
            <dt className="text-sm text-neutral-600">{fact.label}</dt>
            <dd className="mt-1 text-xl font-bold text-neutral-900">{fact.value}</dd>
          </div>
        ))}
      </dl>
      {stats.priceMedian === null && stats.listingCount > 0 && (
        <p className="mt-3 text-sm text-neutral-600">
          {t('marketPages:stats.none', { defaultValue: 'Not enough priced listings yet' })}
        </p>
      )}
      {types.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-neutral-800">
            {t('marketPages:stats.types', { defaultValue: 'Property types' })}
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {types.map((type) => (
              <li key={type.type} className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700">
                {typeLabel(t, type.type)}: {type.count}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-4 text-xs text-neutral-500">
        {t('marketPages:stats.note', {
          date: formatDate(generatedAt, lang),
          defaultValue: 'Asking prices of live listings on {{date}}, not sale prices or valuations.',
        })}
      </p>
    </section>
  );
};

export default MarketStatsPanel;
