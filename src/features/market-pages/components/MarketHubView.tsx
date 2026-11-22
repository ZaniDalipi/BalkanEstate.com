import React, { useMemo } from 'react';
import { SEO } from '@/src/components/seo';
import { AppLink } from '@/src/app/router/AppLink';
import { paths } from '@/src/app/router/paths';
import type { MarketDeal } from '../types';
import { countryLabel, formatCount, marketHeadText, marketIntro } from '../utils/marketPageText';
import { marketBreadcrumbJsonLd } from '../utils/marketJsonLd';
import { useMarketHub } from '../hooks/useMarketData';
import { useMarketText } from '../hooks/useMarketText';
import MarketHeader, { type MarketCrumb } from './MarketHeader';
import { MarketError, MarketLoading, MarketShell } from './MarketPageStates';

/** `/property-for-sale`: every country, busiest first, with its biggest cities. */
const MarketHubView: React.FC<{ deal: MarketDeal }> = ({ deal }) => {
  const { t, lang } = useMarketText();
  const query = useMarketHub(deal);
  const countries = useMemo(() => [...(query.data?.countries ?? [])].sort((a, b) => b.count - a.count), [query.data]);

  if (query.isPending) return <MarketLoading />;
  if (query.isError) return <MarketError deal={deal} onRetry={() => void query.refetch()} />;

  const head = marketHeadText(t, lang, deal, {}, null);
  const crumbs: MarketCrumb[] = [
    { name: t('marketPages:breadcrumbHome', { defaultValue: 'Home' }), path: paths.home() },
    { name: t(`marketPages:switch.${deal}`, { defaultValue: deal === 'sale' ? 'For sale' : 'For rent' }) },
  ];

  return (
    <MarketShell>
      <SEO
        title={head.title}
        description={head.description}
        canonical={paths.market(deal)}
        noindex={!countries.some((c) => c.indexable)}
        jsonLd={marketBreadcrumbJsonLd(lang, crumbs)}
      />
      <MarketHeader
        deal={deal}
        heading={head.heading}
        intro={marketIntro(t, deal, {})}
        crumbs={crumbs}
        dealPaths={{ sale: paths.market('sale'), rent: paths.market('rent') }}
      />
      <section aria-labelledby="market-countries-title" className="mt-8">
        <h2 id="market-countries-title" className="text-xl font-semibold text-neutral-900">
          {t('marketPages:countries.title', { defaultValue: 'Countries' })}
        </h2>
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {countries.map((country) => (
            <li key={country.slug} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold">
                <AppLink to={paths.market(deal, country.slug)} className="text-neutral-900 hover:text-primary-700">
                  {countryLabel(t, country)}
                </AppLink>
              </h3>
              <p className="text-sm text-neutral-600">
                {t('marketPages:countries.count', { count: formatCount(country.count, lang), defaultValue: 'Listings: {{count}}' })}
              </p>
              {country.cities.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {country.cities.map((city) => (
                    <li key={city.slug}>
                      <AppLink
                        to={paths.market(deal, country.slug, city.slug)}
                        className="inline-flex min-h-[44px] items-center rounded-full bg-neutral-100 px-3 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-700"
                      >
                        {city.name}
                      </AppLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>
    </MarketShell>
  );
};

export default MarketHubView;
