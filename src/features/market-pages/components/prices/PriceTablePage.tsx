import React from 'react';
import { SEO } from '@/src/components/seo';
import { AppLink } from '@/src/app/router/AppLink';
import { paths } from '@/src/app/router/paths';
import { marketBreadcrumbJsonLd } from '../../utils/marketJsonLd';
import { marketHeading } from '../../utils/marketPageText';
import { priceDatasetJsonLd, priceHeadText } from '../../utils/priceTableText';
import { usePriceTable } from '../../hooks/useMarketData';
import { useMarketText } from '../../hooks/useMarketText';
import MarketHeader, { type MarketCrumb } from '../MarketHeader';
import { MarketError, MarketLoading, MarketShell } from '../MarketPageStates';
import PriceCountryTable from './PriceCountryTable';
import PriceMethodology from './PriceMethodology';

/**
 * `/:lang/property-prices`: median asking prices and rents of the live
 * listings, by country and city, with the method, a citation and a CSV — the
 * page meant to be quoted (and read by answer engines) as a price source.
 */
const PriceTablePage: React.FC = () => {
  const { t, lang } = useMarketText();
  const query = usePriceTable();

  if (query.isPending) return <MarketLoading />;
  if (query.isError) return <MarketError deal="sale" onRetry={() => void query.refetch()} />;

  const table = query.data;
  const head = priceHeadText(t, lang, table.generatedAt);
  const hasFigures = table.countries.some((c) => c.sale.priceMedian !== null || c.rent.priceMedian !== null);
  const crumbs: MarketCrumb[] = [
    { name: t('marketPages:breadcrumbHome', { defaultValue: 'Home' }), path: paths.home() },
    { name: t('marketPages:prices.crumb', { defaultValue: 'Property prices' }) },
  ];

  return (
    <MarketShell>
      <SEO
        title={head.title}
        description={head.description}
        canonical={paths.prices()}
        // An empty table (no listings yet) is not worth indexing.
        noindex={!hasFigures}
        jsonLd={[priceDatasetJsonLd(lang, table, head), marketBreadcrumbJsonLd(lang, crumbs)]}
      />
      <MarketHeader heading={head.heading} intro={head.intro} crumbs={crumbs} />
      <p className="mt-4 text-sm text-neutral-500">
        {t('marketPages:prices.notEnough', { min: table.minSample, defaultValue: '“–” means fewer than {{min}} listings with a price' })}
      </p>
      {table.countries.map((country) => <PriceCountryTable key={country.slug} country={country} />)}
      <PriceMethodology minSample={table.minSample} generatedAt={table.generatedAt} />
      <nav aria-label={t('marketPages:countries.title', { defaultValue: 'Countries' })} className="mt-10 flex flex-wrap gap-3">
        {(['sale', 'rent'] as const).map((deal) => (
          <AppLink
            key={deal}
            to={paths.market(deal)}
            className="inline-flex min-h-[44px] items-center rounded-full border border-neutral-300 px-5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            {marketHeading(t, deal, {})}
          </AppLink>
        ))}
      </nav>
    </MarketShell>
  );
};

export default PriceTablePage;
