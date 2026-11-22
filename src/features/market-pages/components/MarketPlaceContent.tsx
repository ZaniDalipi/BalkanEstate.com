import React from 'react';
import { SEO } from '@/src/components/seo';
import { AppLink } from '@/src/app/router/AppLink';
import { paths } from '@/src/app/router/paths';
import { AdSlot } from '@/src/features/promo';
import { COUNTRY_GUIDES } from '@/src/features/guides/data/countryGuides';
import type { MarketPageData } from '../types';
import { countryLabel, marketHeadText, marketIntro, placeLabel } from '../utils/marketPageText';
import { marketBreadcrumbJsonLd, marketCollectionJsonLd } from '../utils/marketJsonLd';
import { useMarketText } from '../hooks/useMarketText';
import MarketHeader, { type MarketCrumb } from './MarketHeader';
import MarketStatsPanel from './MarketStatsPanel';
import MarketListings from './MarketListings';
import MarketPlaceLinks from './MarketPlaceLinks';
import { MarketShell } from './MarketPageStates';

/** A country or city page with its data loaded. */
const MarketPlaceContent: React.FC<{ page: MarketPageData }> = ({ page }) => {
  const { t, lang } = useMarketText();
  const { deal, country, city } = page;
  const place = { country, city };
  const path = paths.market(deal, country.slug, city?.slug);
  const head = marketHeadText(t, lang, deal, place, page.stats);
  const countryText = countryLabel(t, country);
  const guide = COUNTRY_GUIDES.find((g) => g.country === country.name);
  const filters = { country: country.name, city: city?.name };

  const crumbs: MarketCrumb[] = [
    { name: t('marketPages:breadcrumbHome', { defaultValue: 'Home' }), path: paths.home() },
    { name: t(`marketPages:switch.${deal}`, { defaultValue: deal === 'sale' ? 'For sale' : 'For rent' }), path: paths.market(deal) },
    ...(city ? [{ name: countryText, path: paths.market(deal, country.slug) }] : []),
    { name: city ? city.name : countryText },
  ];

  return (
    <MarketShell>
      <SEO
        title={head.title}
        description={head.description}
        canonical={path}
        noindex={!page.indexable}
        jsonLd={[
          marketCollectionJsonLd({ lang, path, name: head.heading, description: head.description, listings: page.listings, total: page.stats.listingCount }),
          marketBreadcrumbJsonLd(lang, crumbs),
        ]}
      />
      <MarketHeader
        deal={deal}
        heading={head.heading}
        intro={marketIntro(t, deal, place)}
        crumbs={crumbs}
        dealPaths={{ sale: paths.market('sale', country.slug, city?.slug), rent: paths.market('rent', country.slug, city?.slug) }}
      />
      <MarketStatsPanel deal={deal} stats={page.stats} generatedAt={page.generatedAt} />
      <MarketListings
        deal={deal}
        listings={page.listings}
        placeText={placeLabel(t, place)}
        searchPath={deal === 'rent' ? paths.rentals(filters) : paths.search(filters)}
      />
      <AdSlot page="search" placement="in-content" className="my-8" />
      <MarketPlaceLinks
        deal={deal}
        countrySlug={country.slug}
        places={page.cities}
        title={city
          ? t('marketPages:cities.other', { country: countryText, defaultValue: 'Other cities in {{country}}' })
          : t('marketPages:cities.country', { country: countryText, defaultValue: 'Cities in {{country}}' })}
      />
      {guide && (
        <p className="mt-10">
          <AppLink to={paths.guide(guide.slug)} className="font-semibold text-primary-700 underline-offset-2 hover:underline">
            {t('marketPages:guide.link', { country: countryText, defaultValue: "How to buy property in {{country}} – buyer's guide (English)" })}
          </AppLink>
        </p>
      )}
    </MarketShell>
  );
};

export default MarketPlaceContent;
