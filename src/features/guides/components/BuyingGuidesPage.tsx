import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { SEO } from '@/src/components/seo';
import Footer from '@/components/shared/Footer';
import { AdBanner } from '@/features/ads';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';

// Country guide data — structured for SEO with rich content
const COUNTRY_GUIDES = [
  {
    slug: 'montenegro',
    country: 'Montenegro',
    flag: '🇲🇪',
    avgPrice: '€1,800-3,500/m²',
    foreignBuy: 'Yes (apartments freely, land via company)',
    residency: 'Yes — property ownership grants 1-year renewable residence permit',
    tax: '0.25-1% annually',
    transferTax: '3%',
    topCities: ['Budva', 'Kotor', 'Tivat', 'Podgorica', 'Herceg Novi', 'Bar'],
    rentalYield: '5-8%',
    highlights: [
      'EU candidate country — property values expected to rise with accession',
      'No restrictions on foreigners buying apartments',
      'Adriatic coastline with world-class beaches and UNESCO sites',
      'Residence permit through property ownership',
      'Low property tax (0.25-1% annually)',
      'Growing tourism sector driving rental yields of 5-8%',
    ],
    legalProcess: [
      'Find property and agree on price with seller',
      'Hire a local lawyer to conduct due diligence (title check, permits)',
      'Sign preliminary contract and pay 10% deposit',
      'Obtain tax number (PIB) from the tax authority',
      'Sign the main purchase contract before a notary',
      'Pay transfer tax (3%) and register at the Real Estate Administration',
      'Apply for residence permit (optional) at local police station',
    ],
    searchLink: '/search?country=Montenegro',
  },
  {
    slug: 'albania',
    country: 'Albania',
    flag: '🇦🇱',
    avgPrice: '€800-1,500/m²',
    foreignBuy: 'Yes (except agricultural land)',
    residency: 'Yes — property ownership supports residence permit application',
    tax: '0.05-0.2% annually',
    transferTax: 'None (included in notary fees)',
    topCities: ['Tirana', 'Saranda', 'Vlora', 'Durres', 'Shkodra'],
    rentalYield: '5-9%',
    highlights: [
      'Lowest property prices in the Mediterranean region',
      'Albanian Riviera — Europe\'s hidden gem with rapid price appreciation',
      'EU candidate country with fast-growing economy',
      'No transfer tax — just notary fees (~1%)',
      'Tirana undergoing massive modernization and urban development',
      'Rental yields up to 9% on the Riviera during summer season',
    ],
    legalProcess: [
      'Find property and agree on price',
      'Hire a local lawyer (essential for foreigners)',
      'Verify ownership at the Immovable Property Registration Office (ZRPP)',
      'Sign preliminary agreement at notary',
      'Obtain Albanian tax identification number (NIPT)',
      'Sign the final deed of sale at a notary office',
      'Register the property at ZRPP (takes 1-3 weeks)',
    ],
    searchLink: '/search?country=Albania',
  },
  {
    slug: 'serbia',
    country: 'Serbia',
    flag: '🇷🇸',
    avgPrice: '€1,200-2,500/m²',
    foreignBuy: 'EU citizens freely; others need reciprocity agreement',
    residency: 'Temporary residence available for property owners',
    tax: '0.4-2% annually',
    transferTax: '2.5%',
    topCities: ['Belgrade', 'Novi Sad', 'Niš', 'Subotica'],
    rentalYield: '4-6%',
    highlights: [
      'Belgrade — vibrant capital with strong rental demand',
      'Novi Sad — European Capital of Culture with growing tourism',
      'EU candidate country with improving infrastructure',
      'Strong expat community driving rental market',
      'Affordable prices compared to EU neighbors',
      'New Belgrade waterfront project increasing property values',
    ],
    legalProcess: [
      'Find property and negotiate terms',
      'Hire a local lawyer for due diligence',
      'Sign preliminary contract with 10% deposit',
      'Obtain Serbian tax number',
      'Sign main contract certified by a public notary',
      'Pay 2.5% transfer tax',
      'Register ownership at the Republic Geodetic Authority',
    ],
    searchLink: '/search?country=Serbia',
  },
  {
    slug: 'north-macedonia',
    country: 'North Macedonia',
    flag: '🇲🇰',
    avgPrice: '€600-1,200/m²',
    foreignBuy: 'Yes (buildings; land through company registration)',
    residency: 'Temporary residence available',
    tax: '0.1-0.2% annually',
    transferTax: '2-4%',
    topCities: ['Skopje', 'Ohrid', 'Bitola', 'Tetovo'],
    rentalYield: '5-7%',
    highlights: [
      'Cheapest property prices in the Balkans',
      'Lake Ohrid — UNESCO World Heritage Site with tourism potential',
      'Skopje undergoing rapid modernization',
      'Very low annual property tax (0.1-0.2%)',
      'NATO member since 2020, EU candidate country',
      'Excellent value for investors seeking emerging markets',
    ],
    legalProcess: [
      'Find property and agree on price',
      'Hire a local lawyer',
      'For land purchases, register a local company',
      'Verify ownership at the Agency for Real Estate Cadastre',
      'Sign purchase contract at a notary',
      'Pay transfer tax (2-4%)',
      'Register at the Cadastre (1-2 weeks)',
    ],
    searchLink: '/search?country=North+Macedonia',
  },
  {
    slug: 'kosovo',
    country: 'Kosovo',
    flag: '🇽🇰',
    avgPrice: '€700-1,200/m²',
    foreignBuy: 'Yes (with conditions based on nationality)',
    residency: 'Available through property ownership',
    tax: 'Low annual property tax',
    transferTax: '1-3%',
    topCities: ['Pristina', 'Prizren', 'Peja', 'Gjakova'],
    rentalYield: '6-9%',
    highlights: [
      'Youngest population in Europe — dynamic market',
      'Pristina — fast-growing capital with increasing demand',
      'No dominant property portal — opportunity for discovery',
      'High rental yields driven by international organizations and diaspora',
      'Prizren — historic UNESCO-nominated city with tourism growth',
      'Very affordable entry point for Balkan real estate investment',
    ],
    legalProcess: [
      'Find property and agree on terms',
      'Engage a local lawyer for title verification',
      'Obtain a personal number from civil registry',
      'Sign preliminary agreement with deposit',
      'Notarize the purchase contract',
      'Pay transfer tax',
      'Register at the Kosovo Cadastral Agency',
    ],
    searchLink: '/search?country=Kosovo',
  },
  {
    slug: 'croatia',
    country: 'Croatia',
    flag: '🇭🇷',
    avgPrice: '€2,000-5,000/m²',
    foreignBuy: 'EU citizens freely; others need Ministry approval',
    residency: 'EU residence rules apply (Croatia is an EU member)',
    tax: 'No annual property tax',
    transferTax: '3%',
    topCities: ['Split', 'Dubrovnik', 'Zagreb', 'Zadar', 'Rijeka'],
    rentalYield: '4-7%',
    highlights: [
      'EU and Eurozone member — stable legal framework',
      'World-famous Adriatic coastline and islands',
      'Dubrovnik, Split — global tourism destinations',
      'No annual property tax (only 3% transfer tax)',
      'Strong short-term rental market (Airbnb)',
      'Schengen area — easy access for EU citizens',
    ],
    legalProcess: [
      'Find property and engage a lawyer',
      'Non-EU citizens apply for Ministry of Justice approval',
      'Sign preliminary contract with 10% deposit',
      'Obtain Croatian OIB (tax identification number)',
      'Sign main contract at a notary',
      'Pay 3% transfer tax',
      'Register ownership at the Land Registry court',
    ],
    searchLink: '/search?country=Croatia',
  },
  {
    slug: 'bosnia',
    country: 'Bosnia and Herzegovina',
    flag: '🇧🇦',
    avgPrice: '€800-1,500/m²',
    foreignBuy: 'Yes (based on reciprocity agreements)',
    residency: 'Available for property owners',
    tax: '0.05-0.5% annually',
    transferTax: '5%',
    topCities: ['Sarajevo', 'Mostar', 'Banja Luka', 'Tuzla'],
    rentalYield: '4-6%',
    highlights: [
      'Sarajevo — historically rich capital with growing tourism',
      'Mostar — iconic Old Bridge area attracts international buyers',
      'Affordable prices with strong appreciation potential',
      'Two entities with different property laws — get local advice',
      'Growing tourism sector increasing rental demand',
      'EU candidate country with ongoing reforms',
    ],
    legalProcess: [
      'Find property and hire a local lawyer (crucial in BiH)',
      'Verify ownership and check for any encumbrances',
      'Confirm reciprocity agreement exists for your nationality',
      'Sign preliminary contract with deposit',
      'Notarize the purchase agreement',
      'Pay 5% transfer tax',
      'Register at the relevant Land Registry',
    ],
    searchLink: '/search?country=Bosnia',
  },
  {
    slug: 'bulgaria',
    country: 'Bulgaria',
    flag: '🇧🇬',
    avgPrice: '€800-1,800/m²',
    foreignBuy: 'EU citizens can buy freely; others can buy buildings (not land)',
    residency: 'EU residence rules apply (Bulgaria is an EU member)',
    tax: '0.01-0.45% annually',
    transferTax: '0.1-3%',
    topCities: ['Sofia', 'Burgas', 'Varna', 'Plovdiv', 'Bansko'],
    rentalYield: '4-6%',
    highlights: [
      'EU member — Schengen area as of 2024',
      'Black Sea coast resorts with established tourism',
      'Bansko — popular ski resort with affordable property',
      'Sofia — growing tech hub with increasing property demand',
      'Very low property tax (as low as 0.01%)',
      'Flat 10% income tax rate — attractive for investors',
    ],
    legalProcess: [
      'Find property and engage a lawyer',
      'Non-EU citizens can buy buildings but not land directly',
      'Obtain Bulgarian tax identification number (EGN)',
      'Sign preliminary contract with 10% deposit',
      'Sign notarial deed at a notary office',
      'Pay local transfer tax (varies by municipality)',
      'Register at the Property Registry within 7 days',
    ],
    searchLink: '/search?country=Bulgaria',
  },
  {
    slug: 'romania',
    country: 'Romania',
    flag: '🇷🇴',
    avgPrice: '€1,000-2,200/m²',
    foreignBuy: 'EU citizens freely; others can buy buildings (not land directly)',
    residency: 'EU residence rules apply (Romania is an EU member)',
    tax: 'Varies by value and location',
    transferTax: '0% (since 2023 reforms)',
    topCities: ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Brașov', 'Constanța'],
    rentalYield: '5-7%',
    highlights: [
      'EU member with rapidly growing economy',
      'Cluj-Napoca — tech hub with strong rental demand',
      'Bucharest — affordable capital with major development',
      'No transfer tax since 2023 reforms',
      'Transylvania — unique cultural heritage attracting international buyers',
      'Black Sea coast with tourism potential',
    ],
    legalProcess: [
      'Find property and hire a local lawyer',
      'Non-EU citizens register a Romanian company for land purchases',
      'Obtain Romanian tax identification number (CIF)',
      'Sign preliminary contract (promisiune de vanzare)',
      'Sign authentic sale contract at a notary',
      'Notary handles tax withholding and payment',
      'Automatic registration at the Land Book (Cartea Funciara)',
    ],
    searchLink: '/search?country=Romania',
  },
  {
    slug: 'greece',
    country: 'Greece',
    flag: '🇬🇷',
    avgPrice: '€1,500-4,000/m²',
    foreignBuy: 'Yes (some border zone restrictions)',
    residency: 'Golden Visa: €250,000+ investment grants 5-year residence',
    tax: 'ENFIA tax: 0.1-1.15% annually',
    transferTax: '3.09%',
    topCities: ['Athens', 'Thessaloniki', 'Crete', 'Mykonos', 'Santorini'],
    rentalYield: '3-6%',
    highlights: [
      'Golden Visa program — EU residence through €250K+ property investment',
      'World-famous islands — Mykonos, Santorini, Crete',
      'Athens — recovering market with strong appreciation potential',
      'EU and Eurozone member — stable legal framework',
      'Short-term rental market booming (tourism)',
      'Rich cultural heritage attracting global buyers',
    ],
    legalProcess: [
      'Find property and hire a Greek lawyer',
      'Obtain Greek tax number (AFM) from the tax office',
      'Lawyer conducts title search at the Land Registry',
      'Sign preliminary agreement with deposit',
      'Sign the final contract before a notary',
      'Pay 3.09% transfer tax',
      'Register at the Land Registry/Cadastre',
      'Apply for Golden Visa at immigration office (if applicable)',
    ],
    searchLink: '/search?country=Greece',
  },
];

const BuyingGuidesPage: React.FC = () => {
  const { t } = useTranslation(['common']);
  const { navigateTo } = useLocalizedNavigation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <SEO
        title={t('common:guides.seoTitle', 'Property Buying Guides - How to Buy Real Estate in the Balkans')}
        description={t('common:guides.seoDescription', 'Complete guides to buying property in 10 Balkan countries. Legal process, foreign ownership rules, taxes, and investment insights for Montenegro, Albania, Serbia, Greece, and more.')}
        canonical={`${typeof window !== 'undefined' ? window.location.origin : ''}/guides`}
        type="website"
      />

      {/* Article Schema for the guides index page */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Property Buying Guides - Balkans',
            description: 'Complete guides to buying property in 10 Balkan countries.',
            url: `${typeof window !== 'undefined' ? window.location.origin : 'https://balkanestateai.com'}/guides`,
            publisher: {
              '@type': 'Organization',
              name: 'BalkanEstateAI',
            },
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: COUNTRY_GUIDES.length,
              itemListElement: COUNTRY_GUIDES.map((guide, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${typeof window !== 'undefined' ? window.location.origin : 'https://balkanestateai.com'}/guides#${guide.slug}`,
                name: `How to Buy Property in ${guide.country}`,
              })),
            },
          })}
        </script>
      </Helmet>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {t('common:guides.title', 'Property Buying Guides')}
          </h1>
          <p className="text-lg sm:text-xl text-primary-100 max-w-3xl">
            {t('common:guides.subtitle', 'Everything you need to know about buying real estate in the Balkans. Legal requirements, taxes, foreign ownership rules, and investment insights for all 10 countries.')}
          </p>
        </div>
      </div>

      {/* Quick Jump Navigation */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-neutral-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {COUNTRY_GUIDES.map(guide => (
              <a
                key={guide.slug}
                href={`#${guide.slug}`}
                className="px-3 py-1.5 rounded-full text-sm font-medium bg-neutral-100 hover:bg-primary-50 hover:text-primary-700 transition-colors whitespace-nowrap"
              >
                {guide.flag} {guide.country}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Country Guides */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {COUNTRY_GUIDES.map((guide, index) => (
          <article
            key={guide.slug}
            id={guide.slug}
            className={`scroll-mt-20 ${index > 0 ? 'mt-16 pt-16 border-t border-neutral-200' : ''}`}
          >
            {/* Country Header */}
            <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">
                  {t('common:guides.howToBuy', 'How to Buy Property in {{country}}', { country: guide.country })}
                </h2>
                <p className="text-neutral-500 mt-1">{t('common:guides.completeGuide', 'Complete guide for foreign buyers')}</p>
              </div>
              <button
                onClick={() => navigateTo(guide.searchLink)}
                className="px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors text-sm"
              >
                {t('common:guides.browseProperties', 'Browse {{country}} Properties', { country: guide.country })}
              </button>
            </div>

            {/* Key Facts Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-neutral-50 rounded-xl p-4">
                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">{t('common:guides.avgPrice', 'Avg. Price')}</div>
                <div className="text-sm font-semibold text-neutral-900">{guide.avgPrice}</div>
              </div>
              <div className="bg-neutral-50 rounded-xl p-4">
                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">{t('common:guides.foreignOwnership', 'Foreign Ownership')}</div>
                <div className="text-sm font-semibold text-neutral-900">{guide.foreignBuy}</div>
              </div>
              <div className="bg-neutral-50 rounded-xl p-4">
                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">{t('common:guides.rentalYield', 'Rental Yield')}</div>
                <div className="text-sm font-semibold text-green-700">{guide.rentalYield}</div>
              </div>
              <div className="bg-neutral-50 rounded-xl p-4">
                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">{t('common:guides.annualTax', 'Annual Tax')}</div>
                <div className="text-sm font-semibold text-neutral-900">{guide.tax}</div>
              </div>
              <div className="bg-neutral-50 rounded-xl p-4">
                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">{t('common:guides.transferTax', 'Transfer Tax')}</div>
                <div className="text-sm font-semibold text-neutral-900">{guide.transferTax}</div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Why Buy Here */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                  {t('common:guides.whyBuy', 'Why Buy in {{country}}?', { country: guide.country })}
                </h3>
                <ul className="space-y-3">
                  {guide.highlights.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-5 h-5 mt-0.5 flex-shrink-0 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">&#10003;</span>
                      <span className="text-neutral-700 text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal Process */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                  {t('common:guides.buyingProcess', 'Buying Process (Step by Step)')}
                </h3>
                <ol className="space-y-3">
                  {guide.legalProcess.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 mt-0.5 flex-shrink-0 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <span className="text-neutral-700 text-sm leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Residency Info */}
            {guide.residency && (
              <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-blue-600 text-lg">&#9432;</span>
                  <div>
                    <div className="font-medium text-blue-900 text-sm">{t('common:guides.residencyInfo', 'Residency Through Property')}</div>
                    <div className="text-blue-800 text-sm mt-0.5">{guide.residency}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Cities */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-neutral-500 mb-2">{t('common:guides.topCities', 'Top Cities for Property')}</h3>
              <div className="flex flex-wrap gap-2">
                {guide.topCities.map(city => (
                  <button
                    key={city}
                    onClick={() => navigateTo(`${guide.searchLink}&city=${encodeURIComponent(city)}`)}
                    className="px-3 py-1.5 bg-neutral-100 hover:bg-primary-50 hover:text-primary-700 rounded-full text-sm transition-colors"
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Banner between the guides and the call to action, in its own row so it
          separates the two sections rather than sitting across either. */}
      <AdBanner placement="guides" spacing="compact" />

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            {t('common:guides.ctaTitle', 'Ready to Find Your Property?')}
          </h2>
          <p className="text-primary-100 mb-8 text-lg">
            {t('common:guides.ctaDescription', 'Search across all 11 Balkan countries with AI-powered matching. 10 languages, verified agents, instant valuations.')}
          </p>
          <button
            onClick={() => navigateTo('/search')}
            className="px-8 py-3 bg-white text-primary-700 rounded-xl font-semibold hover:bg-primary-50 transition-colors text-lg"
          >
            {t('common:guides.ctaButton', 'Start Searching')}
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BuyingGuidesPage;
