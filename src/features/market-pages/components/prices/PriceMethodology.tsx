import React from 'react';
import { formatDate } from '../../utils/marketPageText';
import { PRICES_CSV_URL, priceMethod } from '../../utils/priceTableText';
import { useMarketText } from '../../hooks/useMarketText';

interface PriceMethodologyProps {
  minSample: number;
  generatedAt: string;
}

/** How the figures are made, how to cite them, and the CSV download. */
const PriceMethodology: React.FC<PriceMethodologyProps> = ({ minSample, generatedAt }) => {
  const { t, lang } = useMarketText();
  return (
    <div className="mt-12 grid gap-6 md:grid-cols-2">
      <section aria-labelledby="prices-method" className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 id="prices-method" className="text-lg font-semibold text-neutral-900">
          {t('marketPages:prices.methodTitle', { defaultValue: 'How the figures are calculated' })}
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-700">
          {priceMethod(t, minSample).map((point) => <li key={point}>{point}</li>)}
        </ul>
      </section>
      <section aria-labelledby="prices-cite" className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 id="prices-cite" className="text-lg font-semibold text-neutral-900">
          {t('marketPages:prices.citeTitle', { defaultValue: 'Using these figures' })}
        </h2>
        <p className="mt-3 text-sm text-neutral-700">
          {t('marketPages:prices.cite', {
            date: formatDate(generatedAt, lang),
            defaultValue: 'You are welcome to quote them. Please cite “BalkanEstateAI, Property prices in the Balkans, {{date}}” with a link to this page.',
          })}
        </p>
        <a
          href={PRICES_CSV_URL}
          download
          className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          {t('marketPages:prices.download', { defaultValue: 'Download the table (CSV)' })}
        </a>
      </section>
    </div>
  );
};

export default PriceMethodology;
